import os
import logging
from typing import List
from langchain_core.documents import Document

try:
    from langchain_community.tools.tavily_search import TavilySearchResults
except ImportError:
    TavilySearchResults = None

logger = logging.getLogger(__name__)

def tavily_search(query: str, max_results: int = 3) -> List[Document]:
    """
    Performs a web search using Tavily API and returns LangChain Documents.
    Returns an empty list if the API key is not set or if an error occurs.
    """
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        logger.warning("TAVILY_API_KEY is not set. Web search will be skipped.")
        return []
        
    if not TavilySearchResults:
        logger.warning("TavilySearchResults could not be imported. Please install langchain-community and tavily-python.")
        return []
        
    try:
        search = TavilySearchResults(max_results=max_results)
        results = search.invoke({"query": query})
        
        # Results is a list of dicts: [{'url': '...', 'content': '...'}, ...]
        # Note: Depending on langchain version, invoke may just take the string `query` or a dict.
        # It's usually safe to pass string if we use `.invoke(query)`. Wait, no, TavilySearchResults takes `{"query": query}` sometimes, but `invoke(query)` is standard.
        if isinstance(results, str):
            # Sometimes it returns a string if there's an error
            logger.warning(f"Tavily returned string: {results}")
            return []
            
        docs = []
        for res in results:
            content = res.get("content", "")
            url = res.get("url", "")
            if content:
                # Add 'source' to metadata so the Citation Builder can use the URL!
                docs.append(Document(page_content=content, metadata={"source": url, "type": "web_search"}))
                
        return docs
    except Exception as e:
        logger.error(f"Error during Tavily web search: {e}")
        return []
