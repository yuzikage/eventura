"""
retriever.py — Builds the in-memory vector store from knowledge_base.DOCUMENTS
and exposes a single function: retrieve(query, n_results) → list[str]

The vector store is built once when this module is first imported (i.e. on
server startup). ChromaDB's default embedding function uses a small local
sentence-transformers model (~90 MB, downloaded on first run).

Usage in chat.py:
    from app.rag.retriever import retrieve
    chunks = retrieve("what is your cancellation policy", n_results=3)
"""

import chromadb
from chromadb.utils import embedding_functions

from app.rag.knowledge_base import DOCUMENTS

# Build vector store on import

# In-memory client — no files written to disk, rebuilt on every server start
_client = chromadb.Client()

# Default sentence-transformers embedding function (all-MiniLM-L6-v2)
# Small, fast, and good enough for FAQ-style semantic search
_ef = embedding_functions.DefaultEmbeddingFunction()

# Create collection — "eventura_kb" is just a name, arbitrary
_collection = _client.create_collection(
    name="eventura_kb",
    embedding_function=_ef,
    metadata={"hnsw:space": "cosine"},   # cosine similarity for semantic search
)

# Add all documents to the collection
_collection.add(
    ids=[doc["id"] for doc in DOCUMENTS],
    documents=[doc["text"] for doc in DOCUMENTS],
)


# Public API 

def retrieve(query: str, n_results: int = 3) -> list[str]:
    """
    Searches the vector store for the most semantically relevant document
    chunks matching the query string.

    Args:
        query:     The user's message or a summary of what they are asking about.
        n_results: Number of chunks to return. 3 is a good default — enough
                   context without bloating the system prompt.

    Returns:
        List of text strings, most relevant first.
        Returns empty list if query is blank or collection is empty.
    """
    if not query or not query.strip():
        return []

    results = _collection.query(
        query_texts=[query],
        n_results=min(n_results, len(DOCUMENTS)),
    )

    # results["documents"] is a list-of-lists (one per query_text)
    # We only ever send one query so take index 0
    return results["documents"][0] if results["documents"] else []
