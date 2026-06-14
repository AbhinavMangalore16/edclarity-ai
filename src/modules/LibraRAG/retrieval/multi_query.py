from typing import List
from langchain_core.language_models.chat_models import BaseChatModel

def generate_multi_queries(query: str, llm: BaseChatModel, num_queries: int = 5) -> List[str]:
    """
    Generates multiple alternate search queries based on the original query using the provided LLM.
    """
    prompt = f"""
You are an AI language model assistant. Your task is to generate {num_queries} 
different versions of the given user question to retrieve relevant documents from a vector database. 
By generating multiple perspectives on the user question, your goal is to help
the user overcome some of the limitations of the distance-based similarity search. 
Provide these alternative questions separated by newlines.

Original question: {query}
"""
    response = llm.invoke(prompt)
    content = response.content
    
    # Simple splitting and cleaning of generated queries
    queries = [q.strip() for q in content.split('\n') if q.strip()]
    
    # Remove numbering if present (e.g. "1. query" -> "query")
    cleaned_queries = []
    for q in queries:
        if q and q[0].isdigit() and q[1] == '.':
            q = q[2:].strip()
        cleaned_queries.append(q)
        
    # Return the generated queries, ensuring we don't return an empty list 
    # (fallback to original query if parsing fails)
    if not cleaned_queries:
        return [query]
        
    return cleaned_queries
