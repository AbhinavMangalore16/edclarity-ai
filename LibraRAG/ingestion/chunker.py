from langchain_text_splitters import RecursiveCharacterTextSplitter

def get_parent_splitter(chunk_size: int = 2000, chunk_overlap: int = 200) -> RecursiveCharacterTextSplitter:
    """
    Returns a text splitter for parent documents.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )

def get_child_splitter(chunk_size: int = 400, chunk_overlap: int = 50) -> RecursiveCharacterTextSplitter:
    """
    Returns a text splitter for child documents.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
