from typing import List, Tuple
from sentence_transformers import CrossEncoder
from langchain_core.documents import Document

class BGEReranker:
    def __init__(self, model_name: str = "BAAI/bge-reranker-v2-m3"):
        """
        Initializes the CrossEncoder reranker.
        """
        self.reranker = CrossEncoder(model_name)
        
    def rerank(self, query: str, documents: List[Document], top_k: int = 5) -> List[Tuple[Document, float]]:
        """
        Reranks a list of documents based on the query using the CrossEncoder.
        Returns a list of (Document, score) tuples sorted by score descending.
        """
        if not documents:
            return []
            
        pairs = [[query, doc.page_content] for doc in documents]
        scores = self.reranker.predict(pairs)
        
        # Combine documents with their scores and sort
        ranked = sorted(
            zip(documents, scores),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Return top_k
        return ranked[:top_k]
