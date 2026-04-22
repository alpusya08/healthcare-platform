from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app.core.enums import TriageLevel


@dataclass
class Diagnosis:
    domain: str
    primary_diagnosis: str
    confidence: float
    explanation: str
    recommendations: list[str] = field(default_factory=list)
    triage_level: TriageLevel = TriageLevel.ROUTINE
    model_version: str = "unknown"
    recommended_specialization: str = "therapy"
    possible_causes: list[str] = field(default_factory=list)
    red_flags: list[str] = field(default_factory=list)
    summary: str = ""


@dataclass
class ModelPrediction:
    class_id: int
    diagnosis: str
    confidence: float
    raw_probability: float
    feature_importances: Optional[dict[str, float]] = None
