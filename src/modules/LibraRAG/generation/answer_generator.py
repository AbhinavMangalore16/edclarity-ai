from langchain_core.language_models.chat_models import BaseChatModel

def generate_answer(query: str, context: str, history: str, llm: BaseChatModel) -> str:
    """
    Generates an answer using the provided LLM, given the query, context, and conversation history.
    """
    prompt = f"""
You are a helpful assistant. Use the provided context and conversation history to answer the user's question.
Cite sources in this format: [Source 1 Page 18].
If the answer is not present in the context, say: "I cannot find that information in the provided documents."

History:
{history}

Context:
{context}

Question:
{query}

Answer:
"""
    response = llm.invoke(prompt)
    return response.content
