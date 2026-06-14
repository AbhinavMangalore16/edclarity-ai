import os
from dotenv import load_dotenv
load_dotenv()
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from pyngrok import ngrok
import shutil
from langchain_community.document_loaders import PyMuPDFLoader, TextLoader

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

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Create DB tables
models.Base.metadata.create_all(bind=engine)

# Global pipeline state
rag_pipeline: Optional[LibraPipeline] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_pipeline
    logger.info("Initializing FastAPI backend...")
    
    # 1. Setup LLM and Embeddings
    logger.info("Loading LLM and Embeddings...")
    llm = ChatOllama(model="qwen2.5:7b", temperature=0.1)
    embeddings = get_embeddings("all-MiniLM-L6-v2")
    
    # 2. Setup VectorStore and Splitters (Empty Initially or loading existing)
    vectorstore = get_vectorstore("advanced_rag", "./chroma_advanced_db", embeddings)
    parent_splitter = get_parent_splitter()
    child_splitter = get_child_splitter()
    
    dense_retriever = get_parent_document_retriever(vectorstore, parent_splitter, child_splitter)
    
    # Try to load existing docs if any? For this setup we will require /api/ingest
    # Or load automatically from data dir on startup. Let's load automatically to keep it simple.
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    if os.path.exists(data_dir):
        logger.info(f"Loading initial documents from {data_dir}...")
        docs = load_pdfs(data_dir)
        if docs:
            logger.info("Adding documents to VectorStore...")
            # Un-comment the line below if you want automatic ingestion on startup!
            # dense_retriever.add_documents(docs)
            
            # Since BM25 needs to be initialized with chunks:
            logger.info("Initializing BM25Retriever...")
            bm25_chunks = parent_splitter.split_documents(docs)
            bm25_retriever = get_bm25_retriever(bm25_chunks)
            
            retrievers = {"dense": dense_retriever, "bm25": bm25_retriever}
            rag_pipeline = LibraPipeline(llm=llm, retrievers=retrievers, embeddings=embeddings)
            logger.info("LibraPipeline initialized with documents.")
        else:
            logger.warning("No documents found for initialization.")
            # Mock BM25 retriever for empty state
            from langchain_core.documents import Document
            bm25_retriever = get_bm25_retriever([Document(page_content="empty")])
            rag_pipeline = LibraPipeline(llm=llm, retrievers={"dense": dense_retriever, "bm25": bm25_retriever}, embeddings=embeddings)
    
    # Setup ngrok
    port = int(os.environ.get("PORT", 8000))
    public_url = ngrok.connect(port).public_url
    logger.info(f"ngrok tunnel created: {public_url}")
    
    yield
    
    # Clean up on shutdown
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

class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    stream: bool = False
    
class QueryResponse(BaseModel):
    query: str
    rewritten_query: str
    answer: str
    metrics: Dict[str, Any]
    performance_metrics: Dict[str, Any]
    retrieved_documents: int

@app.get("/health")
def health_check():
    return {"status": "ok", "pipeline_ready": rag_pipeline is not None}

@app.post("/api/chat", response_model=QueryResponse)
def chat_endpoint(request: QueryRequest, db: Session = Depends(get_db)):
    if not rag_pipeline:
        raise HTTPException(status_code=503, detail="Pipeline is not initialized yet.")
        
    try:
        result = rag_pipeline.run(
            user_query=request.query,
            session_id=request.session_id,
            db_session=db,
            stream=request.stream,
            evaluate=True
        )
        return QueryResponse(**result)
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

def background_ingest_single_file(file_path: str):
    logger.info(f"Background ingestion task started for file: {file_path}")
    global rag_pipeline
    
    docs = []
    try:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.pdf':
            loader = PyMuPDFLoader(file_path)
            docs = loader.load()
        elif ext in ['.txt', '.md', '.csv']:
            loader = TextLoader(file_path, encoding='utf-8')
            docs = loader.load()
        else:
            logger.warning(f"Unsupported file type for ingestion: {ext}")
            return
            
        for doc in docs:
            doc.metadata["source_file"] = file_path
            
    except Exception as e:
        logger.error(f"Error loading file {file_path}: {e}")
        return

    if docs and rag_pipeline:
        logger.info(f"Adding {len(docs)} documents to VectorStore...")
        rag_pipeline.dense_retriever.add_documents(docs)
        logger.info("File ingestion complete.")

@app.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(data_dir, exist_ok=True)
    
    file_path = os.path.join(data_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    background_tasks.add_task(background_ingest_single_file, file_path)
    return {
        "message": f"File {file.filename} uploaded successfully. Ingestion started in the background.",
        "filename": file.filename
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
