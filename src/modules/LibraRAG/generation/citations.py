from typing import List, Tuple
from langchain_core.documents import Document
import os

def build_context_with_citations(documents: List[Document]) -> Tuple[str, List[str]]:
    """
    Builds the context string by injecting source tags for grounded citations.
    Returns the formatted context string and a list of citation references.
    """
    context_parts = []
    references = []
    
    for idx, doc in enumerate(documents, 1):
        content = doc.page_content
        doc_type = doc.metadata.get("type", "local")
        
        if doc_type == "web_search":
            url = doc.metadata.get("source", "unknown URL")
            context_parts.append(
                f"[Source {idx}] Web: {url}\n{content}"
            )
            references.append(f"[[Source {idx}] Web Link]({url})")
        else:
            source = doc.metadata.get("source_file", doc.metadata.get("source", "unknown"))
            page = doc.metadata.get("page", doc.metadata.get("page_number", "unknown"))
            filename = os.path.basename(source)
            
            normalized_source = source.replace("\\", "/")
            if "/data/" in normalized_source:
                rel_path = normalized_source.split("/data/")[-1]
            else:
                user_id = doc.metadata.get("user_id", "")
                rel_path = f"{user_id}/{filename}" if user_id else filename
                
            link = f"http://localhost:8000/files/{rel_path}"
                
            context_parts.append(
                f"[Source {idx}] Page: {page} File: {filename}\n{content}"
            )
            references.append(f"[[Source {idx}] {filename} (Page {page})]({link})")
        
    context = "\n\n".join(context_parts)
    return context, references
