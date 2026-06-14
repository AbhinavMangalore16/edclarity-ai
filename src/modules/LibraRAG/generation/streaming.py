import sys
from typing import Generator
from langchain_core.language_models.chat_models import BaseChatModel

def stream_answer(query: str, context: str, history: str, llm: BaseChatModel) -> Generator[str, None, None]:
    """
    Generates an answer using streaming from the provided LLM.
    Yields chunks of text as they are generated.
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
    
    # Ensure the LLM is configured for streaming if possible
    # We yield the chunks as they come
    for chunk in llm.stream(prompt):
        yield chunk.content

def print_stream(stream_gen: Generator[str, None, None]) -> str:
    """
    Utility to print a stream to stdout and return the full collected string.
    """
    full_answer = []
    for chunk_text in stream_gen:
        print(chunk_text, end="", flush=True)
        full_answer.append(chunk_text)
    print()
    return "".join(full_answer)
