import os
from dotenv import load_dotenv
load_dotenv()
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from pyngrok import ngrok
import shutil
from langchain_community.document_loaders import PyMuPDFLoader, TextLoader
from langchain_core.documents import Document

from db import engine, get_db
import models
from pipeline import LibraPipeline

# Initializations
from langchain_ollama import ChatOllama
from retrieval.dense_retriever import get_embeddings, get_vectorstore
from retrieval.parent_child import get_parent_document_retriever
from retrieval.bm25_retriever import get_bm25_retriever
from ingestion.chunker import get_parent_splitter, get_child_splitter
from ingestion.pdf_loader import load_pdfs

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

rag_pipeline: Optional[LibraPipeline] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_pipeline
    logger.info("Initializing FastAPI backend...")

    logger.info("Loading LLM and Embeddings...")
    llm = ChatOllama(model="qwen2.5:7b", temperature=0.1)
    embeddings = get_embeddings("all-MiniLM-L6-v2")

    vectorstore = get_vectorstore("advanced_rag", "./chroma_advanced_db", embeddings)
    parent_splitter = get_parent_splitter()
    child_splitter = get_child_splitter()

    dense_retriever = get_parent_document_retriever(vectorstore, parent_splitter, child_splitter)

    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    if os.path.exists(data_dir):
        logger.info(f"Loading initial documents from {data_dir}...")
        docs = load_pdfs(data_dir)
        if docs:
            logger.info("Initializing BM25Retriever...")
            bm25_chunks = parent_splitter.split_documents(docs)
            bm25_retriever = get_bm25_retriever(bm25_chunks)
            retrievers = {"dense": dense_retriever, "bm25": bm25_retriever}
            rag_pipeline = LibraPipeline(llm=llm, retrievers=retrievers, embeddings=embeddings)
            logger.info("LibraPipeline initialized with documents.")
        else:
            logger.warning("No documents found for initialization.")
            bm25_retriever = get_bm25_retriever([Document(page_content="empty")])
            rag_pipeline = LibraPipeline(llm=llm, retrievers={"dense": dense_retriever, "bm25": bm25_retriever}, embeddings=embeddings)
    else:
        bm25_retriever = get_bm25_retriever([Document(page_content="empty")])
        rag_pipeline = LibraPipeline(llm=llm, retrievers={"dense": dense_retriever, "bm25": bm25_retriever}, embeddings=embeddings)

    port = int(os.environ.get("PORT", 8000))
    try:
        public_url = ngrok.connect(port).public_url
        logger.info(f"ngrok tunnel created: {public_url}")
    except Exception as e:
        logger.warning(f"Failed to start ngrok tunnel (you can still use localhost): {e}")
        public_url = None

    yield

    if public_url:
        logger.info("Shutting down and disconnecting ngrok...")
        ngrok.disconnect(public_url)


app = FastAPI(title="LibraRAG API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_dir_path = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(data_dir_path, exist_ok=True)
app.mount("/files", StaticFiles(directory=data_dir_path), name="files")


class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    stream: bool = False
    clarity_mode: bool = False


class QueryResponse(BaseModel):
    query: str
    rewritten_query: str
    answer: str
    metrics: Dict[str, Any]
    performance_metrics: Dict[str, Any]
    retrieved_documents: int


class IndexUpsertRequest(BaseModel):
    doc_id: str
    aggregate_type: Optional[str] = "document"
    aggregate_id: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    content: Optional[str] = None
    user_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class IndexDeleteRequest(BaseModel):
    doc_id: str
    aggregate_id: Optional[str] = None


class FeedbackEventRequest(BaseModel):
    trace_id: Optional[str] = None
    user_id: Optional[str] = None
    query: str
    doc_id: str
    rank: int = 0
    event: str = "click"
    value: float = 1.0
    features: Optional[Dict[str, Any]] = None


class LTRTrainRequest(BaseModel):
    promote_if_improved: bool = True


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "pipeline_ready": rag_pipeline is not None,
        "ltr_version": rag_pipeline.ltr_ranker.version if rag_pipeline else None,
        "ltr_ndcg_at_5": rag_pipeline.ltr_ranker.ndcg_at_5 if rag_pipeline else None,
    }


@app.post("/api/chat", response_model=QueryResponse)
def chat_endpoint(
    request: QueryRequest,
    db: Session = Depends(get_db),
    personalized: Optional[str] = Header(None),
    user_id: Optional[str] = Header(None),
    x_trace_id: Optional[str] = Header(None),
):
    if not rag_pipeline:
        raise HTTPException(status_code=503, detail="Pipeline is not initialized yet.")

    try:
        active_user_id = user_id if (personalized and personalized.lower() == "true") else None

        result = rag_pipeline.run(
            user_query=request.query,
            session_id=request.session_id,
            user_id=active_user_id,
            db_session=db,
            stream=request.stream,
            evaluate=True,
            clarity_mode=request.clarity_mode,
            trace_id=x_trace_id,
        )
        return QueryResponse(**result)
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/index/upsert")
def index_upsert(req: IndexUpsertRequest):
    """CDC endpoint: upserts a document/lesson/chapter into the vector store and invalidates stale semantic cache."""
    if not rag_pipeline:
        raise HTTPException(status_code=503, detail="Pipeline not initialized.")

    text_body = req.content or f"{req.title or ''}\nSource URL: {req.url or ''}".strip()
    if not text_body:
        return {"ok": True, "skipped": True, "reason": "empty_content"}

    doc = Document(
        page_content=text_body,
        metadata={
            **(req.metadata or {}),
            "doc_id": req.doc_id,
            "aggregate_type": req.aggregate_type,
            "aggregate_id": req.aggregate_id,
            "title": req.title,
            "source_file": req.url or req.doc_id,
            "user_id": req.user_id,
        },
    )
    rag_pipeline.dense_retriever.add_documents([doc])
    invalidated = rag_pipeline.semantic_cache.invalidate_by_doc(req.doc_id)
    return {"ok": True, "doc_id": req.doc_id, "invalidated_cache_entries": invalidated}


@app.post("/api/index/delete")
def index_delete(req: IndexDeleteRequest):
    """CDC endpoint: removes deleted document vectors and purges dependent semantic cache entries."""
    if not rag_pipeline:
        raise HTTPException(status_code=503, detail="Pipeline not initialized.")

    try:
        vs = rag_pipeline.dense_retriever.vectorstore
        if hasattr(vs, "_collection"):
            vs._collection.delete(where={"doc_id": req.doc_id})
    except Exception as e:
        logger.warning(f"Vectorstore delete warning for {req.doc_id}: {e}")

    invalidated = rag_pipeline.semantic_cache.invalidate_by_doc(req.doc_id)
    if req.aggregate_id:
        invalidated += rag_pipeline.semantic_cache.invalidate_by_doc(req.aggregate_id)
    return {"ok": True, "doc_id": req.doc_id, "invalidated_cache_entries": invalidated}


@app.post("/api/cache/clear")
def clear_semantic_cache():
    if not rag_pipeline:
        return {"ok": True, "cleared": 0}
    cleared = rag_pipeline.semantic_cache.clear_all()
    return {"ok": True, "cleared": cleared}


@app.post("/api/feedback")
def record_ltr_feedback(req: FeedbackEventRequest):
    if not rag_pipeline:
        raise HTTPException(status_code=503, detail="Pipeline not initialized.")
    rag_pipeline.ltr_ranker.record_feedback(req.model_dump())
    return {"ok": True}


@app.post("/api/ltr/train")
def train_ltr_model(req: LTRTrainRequest):
    if not rag_pipeline:
        raise HTTPException(status_code=503, detail="Pipeline not initialized.")
    return rag_pipeline.ltr_ranker.train(promote_if_improved=req.promote_if_improved)


def background_ingest_task(data_dir: str):
    logger.info("Background ingestion task started.")
    global rag_pipeline
    docs = load_pdfs(data_dir)
    if docs and rag_pipeline:
        logger.info("Adding documents to VectorStore...")
        rag_pipeline.dense_retriever.add_documents(docs)
        logger.info("Ingestion complete.")


@app.post("/api/ingest")
def ingest_documents(background_tasks: BackgroundTasks):
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    if not os.path.exists(data_dir):
        raise HTTPException(status_code=400, detail="Data directory not found.")

    background_tasks.add_task(background_ingest_task, data_dir)
    return {"message": "Ingestion started in the background."}


def background_ingest_single_file(file_path: str, user_id: str):
    logger.info(f"Background ingestion task started for file: {file_path} (User: {user_id})")
    global rag_pipeline

    docs = []
    try:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            loader = PyMuPDFLoader(file_path)
            docs = loader.load()
        elif ext in [".txt", ".md", ".csv"]:
            loader = TextLoader(file_path, encoding="utf-8")
            docs = loader.load()
        else:
            logger.warning(f"Unsupported file type for ingestion: {ext}")
            return

        for doc in docs:
            doc.metadata["source_file"] = file_path
            doc.metadata["doc_id"] = os.path.basename(file_path)
            doc.metadata["user_id"] = user_id

    except Exception as e:
        logger.error(f"Error loading file {file_path}: {e}")
        return

    if docs and rag_pipeline:
        logger.info(f"Adding {len(docs)} documents to VectorStore...")
        rag_pipeline.dense_retriever.add_documents(docs)
        rag_pipeline.semantic_cache.invalidate_by_doc(os.path.basename(file_path))
        logger.info("File ingestion complete.")


@app.post("/api/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Form(...),
):
    base_data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    user_data_dir = os.path.join(base_data_dir, user_id)
    os.makedirs(user_data_dir, exist_ok=True)

    file_path = os.path.join(user_data_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    background_tasks.add_task(background_ingest_single_file, file_path, user_id)
    return {
        "message": f"File {file.filename} uploaded successfully for user {user_id}. Ingestion started in the background.",
        "filename": file.filename,
        "user_id": user_id,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
