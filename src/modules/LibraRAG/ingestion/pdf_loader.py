import os
from pathlib import Path
from typing import List
from langchain_core.documents import Document
from langchain_community.document_loaders import PyMuPDFLoader

def load_pdfs(pdf_dir: str) -> List[Document]:
    """
    Load all PDF files from a given directory using PyMuPDFLoader.
    """
    all_docs = []
    pdf_dir_path = Path(pdf_dir)
    pdf_files = list(pdf_dir_path.glob("**/*.pdf"))
    
    print(f"Found {len(pdf_files)} PDF files in {pdf_dir_path}")
    
    for pdf_file in pdf_files:
        print(f"Processing {pdf_file}...")
        try:
            loader = PyMuPDFLoader(str(pdf_file))
            docs = loader.load()
            
            # Enrich metadata
            for doc in docs:
                doc.metadata["source_file"] = str(pdf_file)
                doc.metadata["total_pages"] = len(docs)
                
            all_docs.extend(docs)
            print(f"Loaded {len(docs)} pages from {pdf_file}")
            
        except Exception as e:
            print(f"Error processing {pdf_file}: {e}")
            
    return all_docs
