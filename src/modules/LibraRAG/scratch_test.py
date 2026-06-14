from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma
from langchain_core.embeddings import FakeEmbeddings
from langchain_text_splitters import CharacterTextSplitter
from langchain_classic.retrievers import ParentDocumentRetriever
from langchain_core.stores import InMemoryStore

vectorstore = Chroma(embedding_function=FakeEmbeddings(size=2))
vectorstore.add_documents([Document(page_content="test user1", metadata={"user_id": "1", "doc_id": "1"})])
vectorstore.add_documents([Document(page_content="test user2", metadata={"user_id": "2", "doc_id": "2"})])

store = InMemoryStore()
store.mset([("1", Document(page_content="parent 1")), ("2", Document(page_content="parent 2"))])

retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=store,
    child_splitter=CharacterTextSplitter(),
    parent_splitter=CharacterTextSplitter(),
)

docs = retriever.invoke("test", filter={"user_id": "1"})
print("Docs retrieved:", len(docs), [d.page_content for d in docs])
