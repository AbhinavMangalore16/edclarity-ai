import re
from langchain_core.language_models.chat_models import BaseChatModel

def detect_hallucination(query: str, context: str, answer: str, llm: BaseChatModel) -> float:
    """
    Determines if the answer contains claims unsupported by the context.
    Returns a score from 0.0 to 100.0, where higher means more hallucination.
    """
    prompt = f"""
You are an expert evaluator. Your task is to determine if the provided answer contains 
hallucinated claims. A claim is a hallucination if it is NOT supported by the context.

Question:
{query}

Context:
{context}

Answer:
{answer}

Determine the extent of hallucination. Rate the hallucination level from 0 to 100, 
where 0 means no hallucination and 100 means completely hallucinated.
Provide ONLY the integer score in your response.
"""
    response = llm.invoke(prompt)
    content = response.content.strip()
    
    match = re.search(r'\d+', content)
    if match:
        score = float(match.group())
        return min(max(score, 0.0), 100.0)
        
    return 0.0
