from typing import List
from langchain_core.documents import Document
from langchain_community.retrievers import BM25Retriever

def get_bm25_retriever(documents: List[Document], k: int = 5) -> BM25Retriever:
    """
    Initialize and return a LangChain BM25Retriever from a list of documents.
    """
    if not documents:
        raise ValueError("Documents list cannot be empty for BM25Retriever initialization.")
        
    retriever = BM25Retriever.from_documents(documents)
    retriever.k = k
    return retriever
