from langchain_classic.memory import ConversationBufferMemory
from langchain_core.language_models.chat_models import BaseChatModel

class ConversationalMemory:
    def __init__(self, memory_key: str = "chat_history"):
        """
        Initializes a ConversationBufferMemory to store chat history.
        """
        self.memory = ConversationBufferMemory(
            memory_key=memory_key,
            return_messages=True
        )

    def load_from_db(self, db_messages):
        """
        Loads messages from database models into the memory buffer.
        """
        self.memory.chat_memory.clear()
        for msg in db_messages:
            if msg.role == "human":
                self.memory.chat_memory.add_user_message(msg.content)
            elif msg.role == "assistant":
                self.memory.chat_memory.add_ai_message(msg.content)
        
    def get_history_str(self) -> str:
        """
        Retrieves the formatted string of the conversation history.
        """
        variables = self.memory.load_memory_variables({})
        messages = variables.get(self.memory.memory_key, [])
        
        # Format messages into a string
        history_str = ""
        for msg in messages:
            prefix = "User: " if msg.type == "human" else "Assistant: "
            history_str += f"{prefix}{msg.content}\n"
            
        return history_str
        
    def save_context(self, query: str, answer: str):
        """
        Saves the input/output context to memory.
        """
        self.memory.save_context({"input": query}, {"output": answer})

def rewrite_query(question: str, memory: ConversationalMemory, llm: BaseChatModel) -> str:
    """
    Rewrites the user query into a standalone query using the conversation history.
    """
    history_str = memory.get_history_str()
    
    if not history_str.strip():
        # No history, return original question
        return question
        
    prompt = f"""
Given the following conversation history and the latest user query, rewrite the user query 
into a standalone query that can be understood without the conversation history.
If the query is already standalone, return it as is. Do not answer the query.

Conversation:
{history_str}

Query:
{question}

Standalone Query:
"""
    response = llm.invoke(prompt)
    return response.content.strip()
