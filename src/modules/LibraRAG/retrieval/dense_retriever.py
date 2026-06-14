import os
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

def get_embeddings(model_name: str = "all-MiniLM-L6-v2") -> HuggingFaceEmbeddings:
    """
    Load the SentenceTransformers embedding model.
    """
    return HuggingFaceEmbeddings(model_name=model_name)

def get_vectorstore(
    collection_name: str,
    persist_directory: str,
    embeddings: HuggingFaceEmbeddings
) -> Chroma:
    """
    Initialize and return a LangChain Chroma vector store.
    """
    os.makedirs(persist_directory, exist_ok=True)
    
    return Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=persist_directory
    )
