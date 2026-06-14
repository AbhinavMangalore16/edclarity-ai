import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
print(os.getcwd())
from ingestion.pdf_loader import load_pdfs
from ingestion.chunker import get_parent_splitter, get_child_splitter
from retrieval.dense_retriever import get_embeddings, get_vectorstore
from retrieval.bm25_retriever import get_bm25_retriever
from retrieval.parent_child import get_parent_document_retriever
from pipeline import LibraPipeline

from langchain_ollama import ChatOllama

def main():
    print("Initializing Libra Framework...")
    
    # 1. Setup LLM and Embeddings
    print("Loading LLM and Embeddings...")
    llm = ChatOllama(model="qwen2.5:7b", temperature=0.1)
    embeddings = get_embeddings("all-MiniLM-L6-v2")
    
    # 2. Ingestion
    print("Loading documents...")
    # NOTE: Adjust path to where your PDFs are stored
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    docs = load_pdfs(data_dir)
    
    if not docs:
        print(f"No documents found in {data_dir}. Exiting.")
        return
        
    print(f"Loaded {len(docs)} document pages.")
    
    # 3. Setup Retrievers
    print("Setting up VectorStore and Splitters...")
    vectorstore = get_vectorstore("advanced_rag", "./chroma_advanced_db", embeddings)
    parent_splitter = get_parent_splitter()
    child_splitter = get_child_splitter()
    
    print("Initializing ParentDocumentRetriever (Dense)...")
    dense_retriever = get_parent_document_retriever(vectorstore, parent_splitter, child_splitter)
    
    # In a real scenario, you'd add documents only once
    # dense_retriever.add_documents(docs)
    # Since we are setting up, let's add them:
    print("Adding documents to VectorStore (this may take a while)...")
    dense_retriever.add_documents(docs)
    
    print("Initializing BM25Retriever...")
    # ParentDocumentRetriever chunked the docs into the vectorstore. 
    # For BM25, we usually want to index the chunks. We can use the parent splitter 
    # to get consistent chunks for BM25.
    bm25_chunks = parent_splitter.split_documents(docs)
    bm25_retriever = get_bm25_retriever(bm25_chunks)
    
    retrievers = {
        "dense": dense_retriever,
        "bm25": bm25_retriever
    }
    
    # 4. Pipeline Setup
    print("Creating the Pipeline...")
    pipeline = LibraPipeline(llm=llm, retrievers=retrievers, embeddings=embeddings)
    
    # 5. Interactive Query Loop
    print("\n" + "="*50)
    print("Libra Online!")
    print("Type 'exit' or 'quit' to stop.")
    print("="*50 + "\n")
    
    while True:
        query = input("\nEnter your query: ").strip()
        if query.lower() in ['exit', 'quit']:
            print("Exiting...")
            break
            
        if not query:
            continue
            
        print(f"\nProcessing Query: '{query}'\n")
        
        try:
            result = pipeline.run(
                user_query=query, 
                top_k=3, 
                multi_query_count=3, 
                stream=True, 
                evaluate=True
            )
            
            print("\n--- Evaluation Metrics ---")
            print(result.get("metrics", {}))
            
        except Exception as e:
            print(f"\nAn error occurred while processing the query: {e}")
            
if __name__ == "__main__":
    main()
