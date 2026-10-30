"""
Learning to Rank (LTR) for LibraRAG:
- 10-feature extraction per (query, document) candidate pair
- LightGBM LambdaMART (`LGBMRanker`) with automatic linear-ensemble fallback when LightGBM is not installed or cold-started
- Online feedback logging (clicks, citations, thumbs_up/down, dwell time)
- Offline retraining with NDCG@5 evaluation gate (only promotes new model if NDCG@5 improves)
"""
import os
import json
import math
import time
import logging
import re
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

FEATURE_NAMES = [
    "bm25_rank_inv",
    "dense_rank_inv",
    "rrf_score",
    "bge_score",
    "token_overlap",
    "exact_phrase_match",
    "doc_length_norm",
    "is_user_doc",
    "is_web_doc",
    "historical_ctr",
]

# Default linear weights (tuned prior) used before a trained LambdaMART artifact exists
DEFAULT_WEIGHTS = np.array([
    0.14,  # bm25_rank_inv
    0.16,  # dense_rank_inv
    0.20,  # rrf_score
    0.38,  # bge_score
    0.12,  # token_overlap
    0.08,  # exact_phrase_match
    0.03,  # doc_length_norm
    0.06,  # is_user_doc
    -0.02, # is_web_doc
    0.15,  # historical_ctr
], dtype=np.float64)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models_ltr")
os.makedirs(MODEL_DIR, exist_ok=True)
FEEDBACK_LOG_PATH = os.path.join(MODEL_DIR, "feedback_events.jsonl")
MODEL_META_PATH = os.path.join(MODEL_DIR, "ltr_meta.json")
LGBM_MODEL_PATH = os.path.join(MODEL_DIR, "lambdamart.txt")


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def extract_features(
    query: str,
    doc: Document,
    bge_score: float = 0.0,
    rrf_score: float = 0.0,
    bm25_rank: int = 50,
    dense_rank: int = 50,
    doc_stats: Optional[Dict[str, Dict[str, float]]] = None,
) -> List[float]:
    q_tokens = set(_tokenize(query))
    d_tokens = _tokenize(doc.page_content)
    d_set = set(d_tokens)

    overlap = len(q_tokens & d_set) / max(len(q_tokens), 1)
    exact_match = 1.0 if query.lower().strip() in doc.page_content.lower() else 0.0
    # Ideal chunk length around 400-1200 chars
    length = len(doc.page_content)
    doc_len_norm = math.exp(-abs(length - 800) / 1200.0)

    meta = doc.metadata or {}
    is_user_doc = 1.0 if meta.get("user_id") or meta.get("source_file") else 0.0
    is_web_doc = 1.0 if meta.get("source") == "tavily" or str(meta.get("source", "")).startswith("http") else 0.0

    doc_id = str(meta.get("doc_id") or meta.get("source_file") or meta.get("source") or hash(doc.page_content))
    stats = (doc_stats or {}).get(doc_id, {})
    impressions = stats.get("impressions", 0.0)
    positive = stats.get("positive", 0.0)
    # Smoothed Bayesian CTR prior
    historical_ctr = (positive + 1.0) / (impressions + 5.0)

    return [
        round(1.0 / (bm25_rank + 1.0), 5),
        round(1.0 / (dense_rank + 1.0), 5),
        round(float(rrf_score), 5),
        round(float(bge_score), 5),
        round(float(overlap), 5),
        exact_match,
        round(float(doc_len_norm), 5),
        is_user_doc,
        is_web_doc,
        round(float(historical_ctr), 5),
    ]


def compute_ndcg_at_k(relevances: List[float], scores: List[float], k: int = 5) -> float:
    if not relevances:
        return 1.0
    order = np.argsort(scores)[::-1][:k]
    dcg = sum((2 ** relevances[i] - 1) / math.log2(idx + 2) for idx, i in enumerate(order))
    ideal_order = sorted(relevances, reverse=True)[:k]
    idcg = sum((2 ** rel - 1) / math.log2(idx + 2) for idx, rel in enumerate(ideal_order))
    return float(dcg / idcg) if idcg > 0 else 1.0


class LTRRanker:
    """
    Production Learning-to-Rank stage sitting after BGE CrossEncoder.
    Uses LightGBM LambdaMART if trained, otherwise learned ridge/linear ranker + prior weights.
    """

    def __init__(self):
        self.weights = DEFAULT_WEIGHTS.copy()
        self.lgbm_booster = None
        self.version = "prior-v1"
        self.ndcg_at_5 = 0.0
        self.doc_stats: Dict[str, Dict[str, float]] = {}
        self._load_state()

    def _load_state(self):
        if os.path.exists(MODEL_META_PATH):
            try:
                with open(MODEL_META_PATH, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                if "weights" in meta and len(meta["weights"]) == len(FEATURE_NAMES):
                    self.weights = np.asarray(meta["weights"], dtype=np.float64)
                self.version = meta.get("version", self.version)
                self.ndcg_at_5 = float(meta.get("ndcg_at_5", 0.0))
                self.doc_stats = meta.get("doc_stats", {})
            except Exception as e:
                logger.warning(f"Failed to load LTR metadata: {e}")

        if os.path.exists(LGBM_MODEL_PATH):
            try:
                import lightgbm as lgb
                self.lgbm_booster = lgb.Booster(model_file=LGBM_MODEL_PATH)
                logger.info(f"Loaded LightGBM LambdaMART model ({self.version})")
            except Exception:
                self.lgbm_booster = None

    def score_features(self, feature_matrix: np.ndarray) -> np.ndarray:
        if self.lgbm_booster is not None:
            try:
                return np.asarray(self.lgbm_booster.predict(feature_matrix), dtype=np.float64)
            except Exception:
                pass
        return feature_matrix @ self.weights

    def rerank(
        self,
        query: str,
        bge_ranked: List[Tuple[Document, float]],
        rrf_scores: Optional[Dict[int, float]] = None,
        bm25_ranks: Optional[Dict[int, int]] = None,
        dense_ranks: Optional[Dict[int, int]] = None,
        top_k: int = 5,
    ) -> Tuple[List[Document], List[Dict[str, Any]]]:
        if not bge_ranked:
            return [], []

        feats: List[List[float]] = []
        docs: List[Document] = []
        for idx, (doc, bge_score) in enumerate(bge_ranked):
            key = hash(doc.page_content)
            f = extract_features(
                query=query,
                doc=doc,
                bge_score=float(bge_score),
                rrf_score=(rrf_scores or {}).get(key, 1.0 / (idx + 61)),
                bm25_rank=(bm25_ranks or {}).get(key, idx + 1),
                dense_rank=(dense_ranks or {}).get(key, idx + 1),
                doc_stats=self.doc_stats,
            )
            feats.append(f)
            docs.append(doc)

        X = np.asarray(feats, dtype=np.float64)
        ltr_scores = self.score_features(X)

        order = np.argsort(ltr_scores)[::-1][:top_k]
        ranked_docs: List[Document] = []
        diagnostics: List[Dict[str, Any]] = []

        for rank_pos, i in enumerate(order):
            d = docs[i]
            doc_id = str(
                d.metadata.get("doc_id")
                or d.metadata.get("source_file")
                or d.metadata.get("source")
                or f"doc_{abs(hash(d.page_content)) % 100000}"
            )
            d.metadata["ltr_score"] = round(float(ltr_scores[i]), 4)
            d.metadata["ltr_rank"] = rank_pos + 1
            ranked_docs.append(d)
            diagnostics.append({
                "doc_id": doc_id,
                "rank": rank_pos + 1,
                "ltr_score": round(float(ltr_scores[i]), 4),
                "features": dict(zip(FEATURE_NAMES, feats[i])),
            })
            # Record impression
            stat = self.doc_stats.setdefault(doc_id, {"impressions": 0.0, "positive": 0.0})
            stat["impressions"] += 1.0

        return ranked_docs, diagnostics

    def record_feedback(self, event: Dict[str, Any]) -> None:
        doc_id = str(event.get("doc_id", "unknown"))
        ev_type = event.get("event", "click")
        val = float(event.get("value", 1.0))

        stat = self.doc_stats.setdefault(doc_id, {"impressions": 1.0, "positive": 0.0})
        if ev_type in ("click", "cited", "thumbs_up", "dwell") and val > 0:
            stat["positive"] += min(val, 2.0)
        elif ev_type == "thumbs_down" or val < 0:
            stat["positive"] = max(0.0, stat["positive"] - 1.0)

        record = {
            "timestamp": time.time(),
            "query": event.get("query", ""),
            "doc_id": doc_id,
            "rank": int(event.get("rank", 0)),
            "event": ev_type,
            "value": val,
            "features": event.get("features") or {},
        }
        try:
            with open(FEEDBACK_LOG_PATH, "a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")
        except Exception as e:
            logger.warning(f"Failed to append LTR feedback: {e}")

    def train(self, promote_if_improved: bool = True) -> Dict[str, Any]:
        """
        Trains a LambdaMART / pairwise ranker from logged feedback + synthetic cold-start pairs,
        evaluates NDCG@5 vs current model, and promotes only if NDCG@5 >= baseline.
        """
        rows: List[Dict[str, Any]] = []
        if os.path.exists(FEEDBACK_LOG_PATH):
            with open(FEEDBACK_LOG_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            rows.append(json.loads(line))
                        except Exception:
                            pass

        # Group by query to build query groups for LambdaMART
        groups: Dict[str, List[Tuple[List[float], float]]] = {}
        label_map = {"thumbs_down": 0.0, "impression": 0.0, "click": 1.0, "dwell": 1.5, "cited": 2.0, "thumbs_up": 3.0}
        for r in rows:
            fdict = r.get("features") or {}
            if not all(k in fdict for k in FEATURE_NAMES):
                continue
            vec = [float(fdict[k]) for k in FEATURE_NAMES]
            rel = label_map.get(r.get("event", "click"), 1.0)
            if float(r.get("value", 1.0)) < 0:
                rel = 0.0
            groups.setdefault(r.get("query", "q"), []).append((vec, rel))

        # Cold-start bootstrap with realistic synthetic ranking groups if fewer than 5 queries logged
        rng = np.random.default_rng(42)
        while len(groups) < 8:
            qid = f"bootstrap_q_{len(groups)}"
            g_items = []
            for _ in range(6):
                vec = rng.uniform(0, 1, size=len(FEATURE_NAMES))
                vec[8] = rng.choice([0.0, 1.0])  # is_web_doc
                true_utility = float(vec @ DEFAULT_WEIGHTS + rng.normal(0, 0.03))
                rel = float(min(3, max(0, int(true_utility * 4))))
                g_items.append((vec.tolist(), rel))
            groups[qid] = g_items

        X_list, y_list, group_sizes = [], [], []
        for _, items in groups.items():
            if len(items) < 2:
                continue
            group_sizes.append(len(items))
            for vec, rel in items:
                X_list.append(vec)
                y_list.append(rel)

        X = np.asarray(X_list, dtype=np.float64)
        y = np.asarray(y_list, dtype=np.float64)

        # Evaluate current baseline NDCG@5 across query groups
        baseline_ndcgs = []
        idx = 0
        for g in group_sizes:
            Xg, yg = X[idx : idx + g], y[idx : idx + g]
            baseline_ndcgs.append(compute_ndcg_at_k(yg.tolist(), self.score_features(Xg).tolist(), k=5))
            idx += g
        baseline_ndcg = float(np.mean(baseline_ndcgs)) if baseline_ndcgs else 0.0

        # Try LightGBM LambdaMART first; fallback to regularized ridge ranking weights
        trained_type = "ridge_lambdarank"
        new_weights = self.weights.copy()
        new_booster = None

        try:
            import lightgbm as lgb
            ranker = lgb.LGBMRanker(
                objective="lambdarank",
                metric="ndcg",
                ndcg_eval_at=[5],
                n_estimators=40,
                learning_rate=0.08,
                num_leaves=15,
                min_child_samples=2,
                random_state=42,
                verbose=-1,
            )
            ranker.fit(X, y, group=group_sizes)
            new_booster = ranker.booster_
            trained_type = "lightgbm_lambdamart"
        except Exception:
            # Closed-form L2 ridge regression blended with prior weights
            lam = 1.5
            A = X.T @ X + lam * np.eye(X.shape[1])
            b = X.T @ y + lam * DEFAULT_WEIGHTS
            new_weights = np.linalg.solve(A, b)

        # Evaluate candidate NDCG@5
        cand_ndcgs = []
        idx = 0
        for g in group_sizes:
            Xg, yg = X[idx : idx + g], y[idx : idx + g]
            preds = new_booster.predict(Xg) if new_booster is not None else (Xg @ new_weights)
            cand_ndcgs.append(compute_ndcg_at_k(yg.tolist(), np.asarray(preds).tolist(), k=5))
            idx += g
        candidate_ndcg = float(np.mean(cand_ndcgs)) if cand_ndcgs else baseline_ndcg

        promoted = (not promote_if_improved) or (candidate_ndcg + 1e-6 >= baseline_ndcg)
        if promoted:
            self.weights = new_weights
            self.lgbm_booster = new_booster
            self.ndcg_at_5 = round(candidate_ndcg, 4)
            self.version = f"{trained_type}-v{int(time.time())}"
            if new_booster is not None:
                new_booster.save_model(LGBM_MODEL_PATH)
            with open(MODEL_META_PATH, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "version": self.version,
                        "ndcg_at_5": self.ndcg_at_5,
                        "weights": self.weights.tolist(),
                        "doc_stats": self.doc_stats,
                        "updated_at": time.time(),
                    },
                    f,
                    indent=2,
                )

        return {
            "ok": True,
            "promoted": promoted,
            "model_type": trained_type,
            "version": self.version,
            "baseline_ndcg_at_5": round(baseline_ndcg, 4),
            "candidate_ndcg_at_5": round(candidate_ndcg, 4),
            "num_query_groups": len(group_sizes),
            "num_feedback_events": len(rows),
        }
