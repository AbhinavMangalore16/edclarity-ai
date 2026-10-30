"""
Two-level Semantic Cache for LibraRAG:
- L1: Exact SHA-256 match on normalized query + user scope
- L2: Cosine similarity (>= threshold) over dense embeddings in the same user/mode namespace
- Supports doc_id reverse index so CDC updates/deletes invalidate stale RAG answers immediately
"""
import hashlib
import re
import time
from typing import Dict, Any, List, Optional
import numpy as np


def _normalize(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\w\s]", "", text)
    return text


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]


class SemanticCache:
    def __init__(self, embeddings: Any = None, threshold: float = 0.93, ttl_sec: int = 3600, max_entries: int = 1000):
        self.embeddings = embeddings
        self.threshold = threshold
        self.ttl_sec = ttl_sec
        self.max_entries = max_entries
        # ns -> list of {"id", "norm", "vec", "payload", "doc_ids", "expires_at"}
        self._store: Dict[str, List[Dict[str, Any]]] = {}

    def _ns(self, user_id: Optional[str], clarity_mode: bool) -> str:
        scope = user_id or "shared"
        return f"rag:{scope}:{'clarity' if clarity_mode else 'fast'}"

    def _embed(self, text: str) -> Optional[np.ndarray]:
        if not self.embeddings:
            return None
        try:
            vec = np.asarray(self.embeddings.embed_query(text), dtype=np.float32)
            norm = np.linalg.norm(vec)
            return vec / norm if norm > 0 else vec
        except Exception:
            return None

    def lookup(self, query: str, user_id: Optional[str] = None, clarity_mode: bool = False) -> Optional[Dict[str, Any]]:
        ns = self._ns(user_id, clarity_mode)
        now = time.time()
        bucket = [e for e in self._store.get(ns, []) if e["expires_at"] > now]
        self._store[ns] = bucket
        if not bucket:
            return None

        norm_q = _normalize(query)
        qid = _sha(norm_q)

        # L1 exact match
        for e in bucket:
            if e["id"] == qid:
                return {"kind": "exact", "similarity": 1.0, **e["payload"]}

        # L2 semantic vector match
        qvec = self._embed(query)
        if qvec is None:
            return None

        best_entry = None
        best_sim = -1.0
        for e in bucket:
            if e.get("vec") is not None:
                sim = float(np.dot(qvec, e["vec"]))
                if sim > best_sim:
                    best_sim = sim
                    best_entry = e

        if best_entry and best_sim >= self.threshold:
            return {"kind": "semantic", "similarity": round(best_sim, 4), **best_entry["payload"]}

        return None

    def store(
        self,
        query: str,
        payload: Dict[str, Any],
        user_id: Optional[str] = None,
        clarity_mode: bool = False,
        doc_ids: Optional[List[str]] = None,
    ) -> None:
        ns = self._ns(user_id, clarity_mode)
        norm_q = _normalize(query)
        qid = _sha(norm_q)
        qvec = self._embed(query)

        bucket = [e for e in self._store.get(ns, []) if e["id"] != qid]
        bucket.insert(
            0,
            {
                "id": qid,
                "norm": norm_q,
                "vec": qvec,
                "payload": payload,
                "doc_ids": set(doc_ids or []),
                "expires_at": time.time() + self.ttl_sec,
            },
        )
        self._store[ns] = bucket[: self.max_entries]

    def invalidate_by_doc(self, doc_id: str) -> int:
        removed = 0
        for ns, bucket in list(self._store.items()):
            kept = []
            for e in bucket:
                if doc_id in e.get("doc_ids", set()):
                    removed += 1
                else:
                    kept.append(e)
            self._store[ns] = kept
        return removed

    def clear_all(self) -> int:
        total = sum(len(v) for v in self._store.values())
        self._store.clear()
        return total
