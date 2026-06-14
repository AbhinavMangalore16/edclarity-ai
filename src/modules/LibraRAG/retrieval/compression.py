from typing import List

# pyrefly: ignore [missing-import]
from langchain_classic.retrievers.document_compressors import LLMChainExtractor
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.documents import Document

class ContextCompressor:
    def __init__(self, llm: BaseChatModel):
        """
        Initializes the LLMChainExtractor for compressing documents.
        """
        self.compressor = LLMChainExtractor.from_llm(llm)
        
    def compress(self, query: str, documents: List[Document]) -> List[Document]:
        """
        Compresses the provided documents by extracting only the relevant information 
        for the given query.
        """
        if not documents:
            return []
            
        return self.compressor.compress_documents(documents, query)
