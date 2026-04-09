"""
FinBERT-based financial sentiment (-1 .. +1) and coarse label.
"""
from __future__ import annotations

import logging
import threading
from typing import Literal

logger = logging.getLogger(__name__)

_model = None
_tokenizer = None
_lock = threading.Lock()


def _load_finbert():
    global _model, _tokenizer
    if _model is not None:
        return _model, _tokenizer
    with _lock:
        if _model is not None:
            return _model, _tokenizer
        try:
            import torch
            from transformers import AutoModelForSequenceClassification, AutoTokenizer

            name = "ProsusAI/finbert"
            _tok = AutoTokenizer.from_pretrained(name)
            _mdl = AutoModelForSequenceClassification.from_pretrained(name)
            _mdl.eval()
            _tokenizer = _tok
            _model = _mdl
            logger.info("[FinBERT] Model loaded: %s", name)
        except Exception as e:
            logger.exception("[FinBERT] Load failed: %s", e)
            raise
    return _model, _tokenizer


def analyze_sentiment(text: str) -> tuple[float, Literal["positive", "negative", "neutral"]]:
    """
    Returns (sentiment_score in [-1, 1], label).
    """
    snippet = (text or "").strip()
    if not snippet:
        return 0.0, "neutral"
    snippet = snippet[:2000]

    try:
        import torch

        model, tokenizer = _load_finbert()
        inputs = tokenizer(
            snippet,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True,
        )
        with torch.no_grad():
            logits = model(**inputs).logits[0]
            probs = torch.softmax(logits, dim=-1).tolist()
    except Exception as e:
        logger.warning("[FinBERT] Inference fallback (neutral): %s", e)
        return 0.0, "neutral"

    id2label = {int(k): str(v).lower() for k, v in model.config.id2label.items()}
    idx_pos = next((i for i, lb in id2label.items() if lb == "positive"), 0)
    idx_neg = next((i for i, lb in id2label.items() if lb == "negative"), 1)
    idx_neu = next((i for i, lb in id2label.items() if lb == "neutral"), 2)

    pos, neg, neu = probs[idx_pos], probs[idx_neg], probs[idx_neu]
    score = float(pos - neg)
    score = max(-1.0, min(1.0, score))

    if pos >= neg and pos >= neu:
        label: Literal["positive", "negative", "neutral"] = "positive"
    elif neg >= pos and neg >= neu:
        label = "negative"
    else:
        label = "neutral"
    return score, label
