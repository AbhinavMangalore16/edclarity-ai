import re
from langchain_core.language_models.chat_models import BaseChatModel

def evaluate_faithfulness(query: str, context: str, answer: str, llm: BaseChatModel) -> float:
    """
    Rates the faithfulness of the answer based on the context.
    Returns a score from 0.0 to 100.0.
    """
    prompt = f"""
You are an expert evaluator. Your task is to rate the faithfulness of the provided answer 
against the provided context. An answer is faithful if all its claims can be directly 
inferred from the context.

Context:
{context}

Answer:
{answer}

Rate the faithfulness from 0 to 100. Provide ONLY the integer score in your response.
"""
    response = llm.invoke(prompt)
    content = response.content.strip()
    
    # Extract the first number found in the response
    match = re.search(r'\d+', content)
    if match:
        score = float(match.group())
        return min(max(score, 0.0), 100.0)
    
    return 0.0
