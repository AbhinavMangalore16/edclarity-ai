import logging
import time
from typing import List, Dict, Any, Optional, TypedDict
import operator

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

from sqlalchemy.orm import Session
from models import ChatSession, ChatMessage, QueryLog

from langgraph.graph import StateGraph, START, END

logger = logging.getLogger(__name__)

class GraphState(TypedDict):
    user_query: str
    session_id: Optional[str]
    user_id: Optional[str]
    db_session: Optional[Session]
    stream: bool
    evaluate: bool
    top_k: int
    multi_query_count: int
    start_time: float
    
    current_memory: ConversationalMemory
    rewritten_query: str
    route: str  
    
    all_retrieved_docs: List[Document]
    compressed_docs: List[Document]
    context_str: str
    references: List[str]
    
    answer: str
    perf_metrics: Dict[str, float]
    eval_metrics: Dict[str, float]

class LibraPipeline:
    def __init__(
        self,
        llm: BaseChatModel,
        retrievers: Dict[str, Any], # dict with "dense" and "bm25"
        embeddings: Optional[Embeddings] = None
    ):
        self.llm = llm
        
        # Retrievers
        self.dense_retriever = retrievers.get("dense")
        self.bm25_retriever = retrievers.get("bm25")
        
        if not self.dense_retriever or not self.bm25_retriever:
            raise ValueError("Both 'dense' and 'bm25' retrievers must be provided in the retrievers dict.")
            
        # Initialize Reranker
        self.reranker = BGEReranker("BAAI/bge-reranker-v2-m3")
        
        # Initialize Context Compressor
        self.compressor = ContextCompressor(self.llm)
        
        self.graph = self._build_graph()

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
                "simple": "generate_simple_answer"
            }
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
                search_kwargs={"filter": {"user_id": user_id}}
            )
            dense_docs = retriever.invoke(query)
            
            original_k = getattr(self.bm25_retriever, 'k', 5)
            self.bm25_retriever.k = 100
            bm25_docs_raw = self.bm25_retriever.invoke(query)
            self.bm25_retriever.k = original_k
            
            bm25_docs = [doc for doc in bm25_docs_raw if doc.metadata.get("user_id") == user_id][:top_k]
        else:
            dense_docs = self.dense_retriever.invoke(query)
            bm25_docs = self.bm25_retriever.invoke(query)
            
        merged_tuples = reciprocal_rank_fusion([dense_docs, bm25_docs])
        return [doc for doc, score in merged_tuples][:top_k]

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
            "references": [],
            "context_str": "",
            "eval_metrics": {}
        }
        
    def node_route_query(self, state: GraphState):
        t0 = time.time()
        prompt = f"""You are an intelligent router for an AI assistant.
Classify the user query: "{state['rewritten_query']}" into ONE of the following categories:
- 'simple': Greeting, general conversation, casual chat. No external context needed.
- 'rag': Any question requesting information, facts, technical data, weather, or context from documents or the internet.

Return ONLY the category name (simple, rag).
"""
        response = self.llm.invoke(prompt)
        route = response.content.strip().lower()
        if "simple" in route: route = "simple"
        else: route = "rag"
            
        perf = state["perf_metrics"]
        perf["routing"] = time.time() - t0
        logger.info(f"Query routed to: {route}")
        return {"route": route, "perf_metrics": perf}

    def node_fetch_context(self, state: GraphState):
        t0 = time.time()
        perf = state["perf_metrics"]
        
        # Local Retrieval
        expanded_queries = generate_multi_queries(state["rewritten_query"], self.llm, num_queries=state["multi_query_count"])
        all_retrieved_docs = []
        for q in expanded_queries:
            docs = self._retrieve_for_query(q, top_k=state["top_k"], user_id=state.get("user_id"))
            all_retrieved_docs.extend(docs)
        perf["hybrid_retrieval"] = time.time() - t0
            
        # Web Search
        t_web = time.time()
        web_docs = tavily_search(state["rewritten_query"], max_results=3)
        all_retrieved_docs.extend(web_docs)
        perf["web_search"] = time.time() - t_web
        
        return {"all_retrieved_docs": all_retrieved_docs, "perf_metrics": perf}
        
    def node_process_documents(self, state: GraphState):
        t0 = time.time()
        unique_docs = {doc.page_content: doc for doc in state["all_retrieved_docs"]}.values()
        
        reranked_tuples = self.reranker.rerank(state["rewritten_query"], list(unique_docs), top_k=state["top_k"])
        top_docs = [doc for doc, score in reranked_tuples]
        
        t1 = time.time()
        compressed_docs = self.compressor.compress(state["rewritten_query"], top_docs)
        if not compressed_docs:
            compressed_docs = top_docs
            
        t2 = time.time()
        context_str, references = build_context_with_citations(compressed_docs)
        
        perf = state["perf_metrics"]
        perf["reranking"] = t1 - t0
        perf["context_compression"] = t2 - t1
        perf["citation_building"] = time.time() - t2
        
        return {
            "compressed_docs": compressed_docs,
            "context_str": context_str,
            "references": references,
            "perf_metrics": perf
        }
        
    def node_generate_rag_answer(self, state: GraphState):
        t0 = time.time()
        history_str = state["current_memory"].get_history_str()
        
        if state["stream"]:
            logger.info("Streaming RAG response...")
            print("\nStreaming Output:")
            stream_gen = stream_answer(state["rewritten_query"], state["context_str"], history_str, self.llm)
            answer = print_stream(stream_gen)
        else:
            answer = generate_answer(state["rewritten_query"], state["context_str"], history_str, self.llm)
            
        final_answer = answer + "\n\nReferences:\n" + "\n".join(state["references"])
        
        perf = state["perf_metrics"]
        perf["llm_generation"] = time.time() - t0
        return {"answer": final_answer, "perf_metrics": perf}

    def node_generate_simple_answer(self, state: GraphState):
        t0 = time.time()
        history_str = state["current_memory"].get_history_str()
        
        prompt = f"""You are a helpful AI assistant. Answer the user's query conversationally based on the chat history.
Chat History:
{history_str}

User Query: {state['rewritten_query']}
Answer:"""

        if state["stream"]:
            logger.info("Streaming simple response...")
            print("\nStreaming Output:")
            stream_gen = self.llm.stream(prompt)
            answer = ""
            for chunk in stream_gen:
                if chunk.content:
                    print(chunk.content, end="", flush=True)
                    answer += chunk.content
            print()
        else:
            response = self.llm.invoke(prompt)
            answer = response.content
            
        perf = state["perf_metrics"]
        perf["llm_generation"] = time.time() - t0
        return {"answer": answer, "perf_metrics": perf}

    def node_evaluate_and_save(self, state: GraphState):
        t0 = time.time()
        eval_metrics = {}
        
        # Only evaluate if we used RAG context
        if state["evaluate"] and state.get("context_str") and state.get("route") != "simple":
            faithfulness_score = evaluate_faithfulness(state["rewritten_query"], state["context_str"], state["answer"], self.llm)
            hallucination_score = max(0.0, 100.0 - faithfulness_score)
            eval_metrics = {
                "faithfulness": faithfulness_score,
                "hallucination": hallucination_score
            }
            
        perf = state["perf_metrics"]
        perf["evaluation"] = time.time() - t0
        perf["total_time"] = time.time() - state["start_time"]
        
        # Save to memory and DB
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
                metrics={"eval": eval_metrics, "perf": perf}
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
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        db_session: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Executes the LangGraph pipeline for the given user query.
        """
        logger.info(f"Starting pipeline for query: '{user_query}' (Session: {session_id})")
        
        initial_state = {
            "user_query": user_query,
            "session_id": session_id,
            "user_id": user_id,
            "db_session": db_session,
            "stream": stream,
            "evaluate": evaluate,
            "top_k": top_k,
            "multi_query_count": multi_query_count,
            "start_time": time.time(),
            "perf_metrics": {}
        }
        
        final_state = self.graph.invoke(initial_state)
        
        return {
            "query": final_state["user_query"],
            "rewritten_query": final_state.get("rewritten_query", final_state["user_query"]),
            "answer": final_state["answer"],
            "metrics": final_state["eval_metrics"],
            "performance_metrics": final_state["perf_metrics"],
            "retrieved_documents": len(final_state.get("compressed_docs", []))
        }
