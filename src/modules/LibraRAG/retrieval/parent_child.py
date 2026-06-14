from langchain_classic.retrievers import ParentDocumentRetriever
from langchain_core.stores import InMemoryStore
from langchain_core.vectorstores import VectorStore
from langchain_text_splitters import TextSplitter

def get_parent_document_retriever(
    vectorstore: VectorStore,
    parent_splitter: TextSplitter,
    child_splitter: TextSplitter
) -> ParentDocumentRetriever:
    """
    Initializes and returns a ParentDocumentRetriever using an InMemoryStore.
    """
    store = InMemoryStore()
    
    retriever = ParentDocumentRetriever(
        vectorstore=vectorstore,
        docstore=store,
        child_splitter=child_splitter,
        parent_splitter=parent_splitter
    )
    
    return retriever
