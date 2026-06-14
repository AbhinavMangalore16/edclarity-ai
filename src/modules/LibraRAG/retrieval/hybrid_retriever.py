from typing import List, Dict, Any, Tuple
from langchain_core.documents import Document

def reciprocal_rank_fusion(
    rank_lists: List[List[Document]], 
    k: int = 60
) -> List[Tuple[Document, float]]:
    """
    Applies Reciprocal Rank Fusion (RRF) to merge multiple ranked lists of documents.
    Returns a sorted list of (Document, score) tuples.
    """
    scores: Dict[str, float] = {}
    doc_map: Dict[str, Document] = {}
    
    for docs in rank_lists:
        for rank, doc in enumerate(docs):
            # Try to get a unique ID, fallback to page_content hash
            doc_id = doc.metadata.get("id", hash(doc.page_content))
            
            if doc_id not in scores:
                scores[doc_id] = 0.0
                doc_map[doc_id] = doc
                
            scores[doc_id] += 1.0 / (rank + 1 + k)  # rank is 0-indexed, so add 1
            
    # Sort the combined documents by RRF score in descending order
    ranked_docs = sorted(
        [(doc_map[doc_id], score) for doc_id, score in scores.items()],
        key=lambda x: x[1],
        reverse=True
    )
    
    return ranked_docs
