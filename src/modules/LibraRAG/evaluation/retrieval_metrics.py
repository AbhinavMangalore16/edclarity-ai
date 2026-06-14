from typing import List, Dict

def compute_retrieval_metrics(retrieved_ids: List[str], relevant_ids: List[str]) -> Dict[str, float]:
    """
    Computes Recall@K and Hit Rate for retrieved documents against relevant IDs.
    
    Args:
        retrieved_ids: List of document IDs retrieved by the system.
        relevant_ids: List of document IDs known to be relevant.
        
    Returns:
        Dict containing 'recall' and 'hit_rate'.
    """
    if not relevant_ids:
        return {"recall": 0.0, "hit_rate": 0.0}
        
    hits = len(set(retrieved_ids) & set(relevant_ids))
    recall = hits / len(relevant_ids)
    hit_rate = 1.0 if hits > 0 else 0.0
    
    return {
        "recall": recall,
        "hit_rate": hit_rate
    }
