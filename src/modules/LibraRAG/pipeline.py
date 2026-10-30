import logging
import time
import re
from typing import List, Dict, Any, Optional, TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document

from memory.conversation_memory import ConversationalMemory, rewrite_query
from retrieval.multi_query import generate_multi_queries
from retrieval.hybrid_retriever import reciprocal_rank_fusion
from retrieval.reranker import BGEReranker
from retrieval.compression import ContextCompressor
from retrieval.web_search import tavily_search
from generation.citations import build_context_with_citations
from generation.answer_generator import generate_answer
from generation.streaming import stream_answer, print_stream
from evaluation.faithfulness import evaluate_faithfulness

from guardrails import check_input_guardrail, check_output_guardrail
from cache import SemanticCache
from ranking.ltr import LTRRanker

from sqlalchemy.orm import Session
from models import ChatSession, ChatMessage, QueryLog

from langgraph.graph import StateGraph, START, END

logger = logging.getLogger(__name__)


class GraphState(TypedDict):
    user_query: str
    trace_id: Optional[str]
    session_id: Optional[str]
    user_id: Optional[str]
    db_session: Optional[Session]
    stream: bool
    evaluate: bool
    top_k: int
    multi_query_count: int
    start_time: float
    clarity_mode: bool

    current_memory: ConversationalMemory
    rewritten_query: str
    route: str
    model_tier: str

    all_retrieved_docs: List[Document]
    compressed_docs: List[Document]
    ltr_diagnostics: List[Dict[str, Any]]
    context_str: str
    references: List[str]

    answer: str
    perf_metrics: Dict[str, float]
    eval_metrics: Dict[str, Any]


REASONING_PATTERN = re.compile(
    r"\b(prove|derive|step[- ]by[- ]step|why does|compare|analy[sz]e|optimi[sz]e|debug|complexity|algorithm|theorem|design|trade-?offs?)\b",
    re.I,
)


class LibraPipeline:
    def __init__(
        self,
        llm: BaseChatModel,
        retrievers: Dict[str, Any],  # dict with "dense" and "bm25"
        embeddings: Optional[Embeddings] = None,
    ):
        self.llm = llm
        self.embeddings = embeddings

        # Retrievers
        self.dense_retriever = retrievers.get("dense")
        self.bm25_retriever = retrievers.get("bm25")

        if not self.dense_retriever or not self.bm25_retriever:
            raise ValueError("Both 'dense' and 'bm25' retrievers must be provided in the retrievers dict.")

        # Initialize Reranker (Stage 2: Cross-Encoder) + LTR (Stage 3: LambdaMART / Learned Ranker)
        self.reranker = BGEReranker("BAAI/bge-reranker-v2-m3")
        self.ltr_ranker = LTRRanker()

        # Semantic Cache (L1 exact + L2 dense cosine)
        self.semantic_cache = SemanticCache(embeddings=embeddings)

        # Initialize Context Compressor
        self.compressor = ContextCompressor(self.llm)

        self.graph = self._build_graph()

    def _invoke_llm_with_retry(self, prompt: str, max_attempts: int = 3) -> str:
        """Resilient LLM invocation with exponential backoff."""
        delay = 0.4
        last_err = None
        for attempt in range(max_attempts):
            try:
                res = self.llm.invoke(prompt)
                return res.content if hasattr(res, "content") else str(res)
            except Exception as e:
                last_err = e
                logger.warning(f"LLM invoke attempt {attempt + 1}/{max_attempts} failed: {e}")
                time.sleep(delay)
                delay *= 2
        raise RuntimeError(f"LLM failed after {max_attempts} attempts: {last_err}")

    def _build_graph(self):
        workflow = StateGraph(GraphState)

        workflow.add_node("setup_and_rewrite", self.node_setup_and_rewrite)
        workflow.add_node("route_query", self.node_route_query)
        workflow.add_node("fetch_context", self.node_fetch_context)
        workflow.add_node("process_documents", self.node_process_documents)
        workflow.add_node("generate_rag_answer", self.node_generate_rag_answer)
        workflow.add_node("generate_simple_answer", self.node_generate_simple_answer)
        workflow.add_node("evaluate_and_save", self.node_evaluate_and_save)

        workflow.add_edge(START, "setup_and_rewrite")
        workflow.add_edge("setup_and_rewrite", "route_query")

        workflow.add_conditional_edges(
            "route_query",
            lambda s: s["route"],
            {
                "rag": "fetch_context",
                "simple": "generate_simple_answer",
            },
        )

        workflow.add_edge("fetch_context", "process_documents")
        workflow.add_edge("process_documents", "generate_rag_answer")
        workflow.add_edge("generate_rag_answer", "evaluate_and_save")
        workflow.add_edge("generate_simple_answer", "evaluate_and_save")
        workflow.add_edge("evaluate_and_save", END)

        return workflow.compile()

    def _retrieve_for_query(self, query: str, top_k: int, user_id: Optional[str] = None) -> List[Document]:
        if user_id:
            from langchain_classic.retrievers import ParentDocumentRetriever

            retriever = ParentDocumentRetriever(
                vectorstore=self.dense_retriever.vectorstore,
                docstore=self.dense_retriever.docstore,
                child_splitter=self.dense_retriever.child_splitter,
                parent_splitter=self.dense_retriever.parent_splitter,
                search_kwargs={"filter": {"user_id": user_id}},
            )
            dense_docs = retriever.invoke(query)

            original_k = getattr(self.bm25_retriever, "k", 5)
            self.bm25_retriever.k = 100
            bm25_docs_raw = self.bm25_retriever.invoke(query)
            self.bm25_retriever.k = original_k

            bm25_docs = [doc for doc in bm25_docs_raw if doc.metadata.get("user_id") == user_id][:top_k]
        else:
            dense_docs = self.dense_retriever.invoke(query)
            bm25_docs = self.bm25_retriever.invoke(query)

        # Annotate per-retriever rank on metadata so LTR can use dense_rank & bm25_rank features
        for r_idx, d in enumerate(dense_docs):
            d.metadata["dense_rank"] = r_idx + 1
        for r_idx, d in enumerate(bm25_docs):
            d.metadata["bm25_rank"] = r_idx + 1

        merged_tuples = reciprocal_rank_fusion([dense_docs, bm25_docs])
        results: List[Document] = []
        for doc, rrf_score in merged_tuples[: top_k * 2]:
            doc.metadata["rrf_score"] = float(rrf_score)
            results.append(doc)
        return results

    def node_setup_and_rewrite(self, state: GraphState):
        t0 = time.time()
        user_query = state["user_query"]
        session_id = state["session_id"]
        db_session = state["db_session"]

        current_memory = ConversationalMemory()
        if session_id and db_session:
            db_chat_session = db_session.query(ChatSession).filter(ChatSession.id == session_id).first()
            if db_chat_session:
                current_memory.load_from_db(db_chat_session.messages)
            else:
                db_chat_session = ChatSession(id=session_id)
                db_session.add(db_chat_session)
                db_session.commit()

        t1 = time.time()
        rewritten_query = rewrite_query(user_query, current_memory, self.llm)
        logger.debug(f"Rewritten Query: {rewritten_query}")

        perf = state.get("perf_metrics", {})
        perf["setup"] = t1 - t0
        perf["query_rewriting"] = time.time() - t1

        return {
            "current_memory": current_memory,
            "rewritten_query": rewritten_query,
            "perf_metrics": perf,
            "all_retrieved_docs": [],
            "compressed_docs": [],
            "ltr_diagnostics": [],
            "references": [],
            "context_str": "",
            "eval_metrics": {},
        }

    def node_route_query(self, state: GraphState):
        t0 = time.time()
        q = state["rewritten_query"]

        # Complexity tier routing (fast | balanced | reasoning)
        if state.get("clarity_mode") or REASONING_PATTERN.search(q) or len(q) > 400:
            model_tier = "reasoning"
        elif len(q) > 80:
            model_tier = "balanced"
        else:
            model_tier = "fast"

        prompt = f"""You are an intelligent router for an AI assistant.
Classify the user query: "{q}" into ONE of the following categories:
- 'simple': Greeting, general conversation, casual chat. No external context needed.
- 'rag': Any question requesting information, facts, technical data, weather, or context from documents or the internet.

Return ONLY the category name (simple, rag).
"""
        route_raw = self._invoke_llm_with_retry(prompt).strip().lower()
        route = "simple" if "simple" in route_raw else "rag"

        perf = state["perf_metrics"]
        perf["routing"] = time.time() - t0
        logger.info(f"Query routed to: {route} (tier={model_tier})")
        return {"route": route, "model_tier": model_tier, "perf_metrics": perf}

    def node_fetch_context(self, state: GraphState):
        t0 = time.time()
        perf = state["perf_metrics"]

        if state.get("clarity_mode", False):
            expanded_queries = generate_multi_queries(
                state["rewritten_query"], self.llm, num_queries=state["multi_query_count"]
            )
        else:
            expanded_queries = [state["rewritten_query"]]

        all_retrieved_docs = []
        for q in expanded_queries:
            docs = self._retrieve_for_query(q, top_k=state["top_k"], user_id=state.get("user_id"))
            all_retrieved_docs.extend(docs)
        perf["hybrid_retrieval"] = time.time() - t0

        t_web = time.time()
        web_docs = tavily_search(state["rewritten_query"], max_results=3)
        all_retrieved_docs.extend(web_docs)
        perf["web_search"] = time.time() - t_web

        return {"all_retrieved_docs": all_retrieved_docs, "perf_metrics": perf}

    def node_process_documents(self, state: GraphState):
        t0 = time.time()
        unique_docs = list({doc.page_content: doc for doc in state["all_retrieved_docs"]}.values())

        # Stage 2: BGE CrossEncoder reranking over candidate pool (up to 2 * top_k)
        bge_pool_k = max(state["top_k"] * 2, 8)
        reranked_tuples = self.reranker.rerank(state["rewritten_query"], unique_docs, top_k=bge_pool_k)
        t_bge = time.time()

        # Stage 3: Learning-to-Rank (LambdaMART / 10-feature ranker)
        rrf_map = {hash(d.page_content): float(d.metadata.get("rrf_score", 0.01)) for d, _ in reranked_tuples}
        bm25_map = {hash(d.page_content): int(d.metadata.get("bm25_rank", 25)) for d, _ in reranked_tuples}
        dense_map = {hash(d.page_content): int(d.metadata.get("dense_rank", 25)) for d, _ in reranked_tuples}

        top_docs, ltr_diagnostics = self.ltr_ranker.rerank(
            query=state["rewritten_query"],
            bge_ranked=reranked_tuples,
            rrf_scores=rrf_map,
            bm25_ranks=bm25_map,
            dense_ranks=dense_map,
            top_k=state["top_k"],
        )
        t1 = time.time()

        if state.get("clarity_mode", False):
            compressed_docs = self.compressor.compress(state["rewritten_query"], top_docs)
            if not compressed_docs:
                compressed_docs = top_docs
        else:
            compressed_docs = top_docs

        t2 = time.time()
        context_str, references = build_context_with_citations(compressed_docs)

        perf = state["perf_metrics"]
        perf["reranking"] = t_bge - t0
        perf["ltr_ranking"] = t1 - t_bge
        perf["context_compression"] = t2 - t1
        perf["citation_building"] = time.time() - t2

        return {
            "compressed_docs": compressed_docs,
            "ltr_diagnostics": ltr_diagnostics,
            "context_str": context_str,
            "references": references,
            "perf_metrics": perf,
        }

    def node_generate_rag_answer(self, state: GraphState):
        t0 = time.time()
        history_str = state["current_memory"].get_history_str()

        if state["stream"]:
            logger.info("Streaming RAG response...")
            stream_gen = stream_answer(state["rewritten_query"], state["context_str"], history_str, self.llm)
            answer = print_stream(stream_gen)
        else:
            answer = generate_answer(state["rewritten_query"], state["context_str"], history_str, self.llm)

        # Output guardrail check (PII redaction + groundedness against retrieved context)
        out_check = check_output_guardrail(answer, state["context_str"])
        clean_answer = out_check["sanitized_output"]
        final_answer = clean_answer + "\n\nReferences:\n" + "\n".join(state["references"])

        perf = state["perf_metrics"]
        perf["llm_generation"] = time.time() - t0
        eval_metrics = dict(state.get("eval_metrics") or {})
        eval_metrics["groundedness"] = out_check["groundedness"]
        eval_metrics["guardrail_issues"] = out_check["issues"]
        return {"answer": final_answer, "perf_metrics": perf, "eval_metrics": eval_metrics}

    def node_generate_simple_answer(self, state: GraphState):
        t0 = time.time()
        history_str = state["current_memory"].get_history_str()

        prompt = f"""You are a helpful AI assistant. Answer the user's query conversationally based on the chat history.
Chat History:
{history_str}

User Query: {state['rewritten_query']}
Answer:"""

        if state["stream"]:
            stream_gen = self.llm.stream(prompt)
            answer = ""
            for chunk in stream_gen:
                if chunk.content:
                    answer += chunk.content
        else:
            answer = self._invoke_llm_with_retry(prompt)

        out_check = check_output_guardrail(answer)
        perf = state["perf_metrics"]
        perf["llm_generation"] = time.time() - t0
        return {"answer": out_check["sanitized_output"], "perf_metrics": perf}

    def node_evaluate_and_save(self, state: GraphState):
        t0 = time.time()
        eval_metrics = dict(state.get("eval_metrics") or {})
        eval_metrics["model_tier"] = state.get("model_tier", "fast")
        eval_metrics["ltr_version"] = self.ltr_ranker.version
        eval_metrics["ltr_candidates"] = state.get("ltr_diagnostics", [])

        if state["evaluate"] and state.get("clarity_mode", False) and state.get("context_str") and state.get("route") != "simple":
            faithfulness_score = evaluate_faithfulness(
                state["rewritten_query"], state["context_str"], state["answer"], self.llm
            )
            hallucination_score = max(0.0, 100.0 - faithfulness_score)
            eval_metrics["faithfulness"] = faithfulness_score
            eval_metrics["hallucination"] = hallucination_score

        perf = state["perf_metrics"]
        perf["evaluation"] = time.time() - t0
        perf["total_time"] = time.time() - state["start_time"]

        state["current_memory"].save_context(state["user_query"], state["answer"])

        session_id = state["session_id"]
        db_session = state["db_session"]
        if session_id and db_session:
            db_user_msg = ChatMessage(session_id=session_id, role="human", content=state["user_query"])
            db_ai_msg = ChatMessage(session_id=session_id, role="assistant", content=state["answer"])
            db_session.add(db_user_msg)
            db_session.add(db_ai_msg)

            q_log = QueryLog(
                session_id=session_id,
                query=state["user_query"],
                metrics={"eval": eval_metrics, "perf": perf, "trace_id": state.get("trace_id")},
            )
            db_session.add(q_log)
            db_session.commit()

        logger.info(f"Pipeline completed in {perf['total_time']:.2f}s")
        return {"eval_metrics": eval_metrics, "perf_metrics": perf}

    def run(
        self,
        user_query: str,
        top_k: int = 5,
        multi_query_count: int = 3,
        stream: bool = False,
        evaluate: bool = True,
        clarity_mode: bool = False,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        db_session: Optional[Session] = None,
        trace_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Executes the guarded, cached, LTR-enhanced LangGraph pipeline."""
        t0 = time.time()
        logger.info(f"Starting pipeline for query: '{user_query}' (Session: {session_id}, Trace: {trace_id})")

        # 1. Input Guardrail
        in_check = check_input_guardrail(user_query)
        if not in_check["is_safe"]:
            return {
                "query": user_query,
                "rewritten_query": user_query,
                "answer": f"[Guardrail Alert]: Request blocked ({in_check['reason']}). Please keep questions focused on your coursework.",
                "metrics": {"guardrail_blocked": True, "reason": in_check["reason"]},
                "performance_metrics": {"total_time": time.time() - t0},
                "retrieved_documents": 0,
            }

        sanitized_query = in_check["sanitized_query"]

        # 2. Semantic Cache lookup (L1 exact + L2 dense vector similarity)
        cached = self.semantic_cache.lookup(sanitized_query, user_id=user_id, clarity_mode=clarity_mode)
        if cached and not stream:
            return {
                "query": user_query,
                "rewritten_query": cached.get("rewritten_query", sanitized_query),
                "answer": cached["answer"],
                "metrics": {**cached.get("metrics", {}), "cache_hit": cached["kind"], "cache_similarity": cached["similarity"]},
                "performance_metrics": {"total_time": time.time() - t0, "cache_lookup": time.time() - t0},
                "retrieved_documents": cached.get("retrieved_documents", 0),
            }

        initial_state: GraphState = {
            "user_query": sanitized_query,
            "trace_id": trace_id,
            "session_id": session_id,
            "user_id": user_id,
            "db_session": db_session,
            "stream": stream,
            "evaluate": evaluate,
            "top_k": top_k,
            "multi_query_count": multi_query_count,
            "start_time": t0,
            "clarity_mode": clarity_mode,
            "perf_metrics": {},
            "current_memory": ConversationalMemory(),
            "rewritten_query": sanitized_query,
            "route": "rag",
            "model_tier": "fast",
            "all_retrieved_docs": [],
            "compressed_docs": [],
            "ltr_diagnostics": [],
            "context_str": "",
            "references": [],
            "answer": "",
            "eval_metrics": {},
        }

        final_state = self.graph.invoke(initial_state)

        result = {
            "query": user_query,
            "rewritten_query": final_state.get("rewritten_query", sanitized_query),
            "answer": final_state["answer"],
            "metrics": final_state["eval_metrics"],
            "performance_metrics": final_state["perf_metrics"],
            "retrieved_documents": len(final_state.get("compressed_docs", [])),
        }

        # Store in semantic cache along with cited doc_ids for CDC invalidation
        doc_ids = [
            str(d.metadata.get("doc_id") or d.metadata.get("source_file") or "")
            for d in final_state.get("compressed_docs", [])
            if d.metadata.get("doc_id") or d.metadata.get("source_file")
        ]
        self.semantic_cache.store(
            sanitized_query,
            result,
            user_id=user_id,
            clarity_mode=clarity_mode,
            doc_ids=doc_ids,
        )

        return result
