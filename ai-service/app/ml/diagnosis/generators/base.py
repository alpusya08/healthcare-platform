"""
Base utilities for synthetic dataset generation per medical domain.

Each domain generator produces a DataFrame where:
  - rows = synthetic patient cases
  - columns = ALL_DIAGNOSIS_FEATURES + ["diagnosis_code", "diagnosis_class_id"]

The output is fed to train_domain.py to fit an XGBoost multi-class classifier.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.ml.diagnosis.registry import (
    ALL_DIAGNOSIS_FEATURES,
    DomainConfig,
)


# ── Sampling primitives ────────────────────────────────────────────────────────

def rng(seed: int | None = None) -> np.random.Generator:
    return np.random.default_rng(seed)


def bern(p: float, r: np.random.Generator) -> int:
    """Bernoulli: returns 1 with probability p, else 0."""
    return int(r.random() < p)


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def normal_int(mean: float, sd: float, lo: int, hi: int, r: np.random.Generator) -> int:
    """Truncated integer normal."""
    v = r.normal(mean, sd)
    return int(clamp(round(v), lo, hi))


def choice_p(items: list, probs: list[float], r: np.random.Generator):
    """Pick one item by categorical distribution."""
    return r.choice(items, p=probs)


# ── Base feature template ──────────────────────────────────────────────────────

def empty_features() -> dict:
    """Return a dict with every diagnosis feature set to 0 (binary) or 0 (ordinal).
    Generators override only the features relevant to the diagnosis."""
    return {f: 0 for f in ALL_DIAGNOSIS_FEATURES}


# ── Generator framework ────────────────────────────────────────────────────────

DiagnosisGenerator = callable  # signature: (rng) -> dict[str, int|float]


def build_domain_dataset(
    domain: DomainConfig,
    generators: dict[str, DiagnosisGenerator],
    samples_per_class: int,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Build a balanced synthetic dataset for one domain.

    Parameters
    ----------
    domain : DomainConfig
    generators : dict[diagnosis_code -> generator function]
        Each generator takes a numpy Generator and returns a feature dict.
    samples_per_class : number of synthetic cases per diagnosis
    """
    missing = [d.code for d in domain.diagnoses if d.code not in generators]
    if missing:
        raise ValueError(f"Missing generators for diagnoses: {missing}")

    r = rng(seed)
    rows: list[dict] = []

    for class_id, dx in enumerate(domain.diagnoses):
        gen = generators[dx.code]
        for _ in range(samples_per_class):
            features = empty_features()
            features.update(gen(r))
            features["diagnosis_code"] = dx.code
            features["diagnosis_class_id"] = class_id
            rows.append(features)

    df = pd.DataFrame(rows)
    # Shuffle so classes are interleaved
    return df.sample(frac=1.0, random_state=seed).reset_index(drop=True)
