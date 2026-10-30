"""
Guardrails v2 for LibraRAG (input + output):
- Prompt-injection & jailbreak pattern defense
- PII detection & redaction (email, phone, Aadhaar, credit cards)
- System prompt leak detection
- Groundedness overlap check against retrieved citations
"""
import re
from typing import Dict, Any, List, Optional

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)", re.I),
    re.compile(r"reveal\s+(your\s+)?(system\s+prompt|hidden\s+instructions|developer\s+message)", re.I),
    re.compile(r"(you\s+are\s+now\s+DAN|do\s+anything\s+now|jailbreak|developer\s+mode)", re.I),
    re.compile(r"<\s*/?\s*system\s*>", re.I),
]

PII_PATTERNS = {
    "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    "phone": re.compile(r"(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,4}\)?[\s-]?)?\d{3}[\s-]?\d{4}\b"),
    "aadhaar": re.compile(r"\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b"),
    "card": re.compile(r"\b(?:\d[ -]*?){13,16}\b"),
}

SYSTEM_LEAK_HINTS = [
    "CRITICAL CONVERSATIONAL RULES",
    "You are an intelligent router for an AI assistant",
    "Return ONLY the category name",
]


def redact_pii(text: str) -> Dict[str, Any]:
    sanitized = text
    redactions: List[str] = []
    for label, pat in PII_PATTERNS.items():
        if pat.search(sanitized):
            redactions.append(label)
            sanitized = pat.sub(f"[REDACTED_{label.upper()}]", sanitized)
    return {"text": sanitized, "redactions": redactions}


def check_input_guardrail(query: str) -> Dict[str, Any]:
    if not query or not query.strip():
        return {"is_safe": False, "reason": "Empty query", "sanitized_query": "", "redactions": []}
    if len(query) > 16000:
        return {"is_safe": False, "reason": "Query exceeds maximum length", "sanitized_query": query[:16000], "redactions": []}

    for pat in INJECTION_PATTERNS:
        if pat.search(query):
            return {
                "is_safe": False,
                "reason": "prompt_injection_detected",
                "sanitized_query": query,
                "redactions": [],
            }

    pii = redact_pii(query)
    return {
        "is_safe": True,
        "reason": None,
        "sanitized_query": pii["text"],
        "redactions": pii["redactions"],
    }


def compute_groundedness(answer: str, context: str) -> float:
    """Fast lexical 4-gram & content-token groundedness score (0..1)."""
    if not context or not answer:
        return 1.0
    ans_tokens = [w.lower() for w in re.findall(r"[a-zA-Z0-9]{4,}", answer)]
    if not ans_tokens:
        return 1.0
    ctx_lower = context.lower()
    hits = sum(1 for tok in ans_tokens if tok in ctx_lower)
    return round(hits / max(len(ans_tokens), 1), 3)


def check_output_guardrail(answer: str, context: Optional[str] = None) -> Dict[str, Any]:
    issues: List[str] = []
    pii = redact_pii(answer)
    if pii["redactions"]:
        issues.extend([f"pii_leak:{r}" for r in pii["redactions"]])

    for hint in SYSTEM_LEAK_HINTS:
        if hint.lower() in answer.lower():
            issues.append("system_prompt_leak")
            break

    groundedness = compute_groundedness(pii["text"], context or "") if context else 1.0
    if context and groundedness < 0.25:
        issues.append("low_groundedness")

    return {
        "is_safe": "system_prompt_leak" not in issues,
        "sanitized_output": pii["text"] if "system_prompt_leak" not in issues else "I cannot share internal system instructions.",
        "issues": issues,
        "groundedness": groundedness,
    }
