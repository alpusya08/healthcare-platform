"""
Domain-specific diagnosis predictor.

One instance per medical domain (cardiology, gastroenterology, ...).
Loads an MLflow-registered model and returns top-K diagnoses with probabilities
for a given feature vector.
"""
from __future__ import annotations

import pandas as pd
import structlog

from app.core.entities.diagnosis import DiagnosisCandidate
from app.core.entities.medical_features import MedicalFeatures
from app.ml.diagnosis.registry import (
    ALL_DIAGNOSIS_FEATURES,
    DomainConfig,
    get_domain,
)

logger = structlog.get_logger()


class DomainDiagnosisPredictor:
    """Wraps an MLflow sklearn pipeline trained for one domain."""

    def __init__(
        self,
        domain: DomainConfig,
        pipeline,                # mlflow-loaded sklearn Pipeline
        model_version: str,
    ) -> None:
        self._domain = domain
        self._pipeline = pipeline
        self._version = model_version

    @property
    def domain_code(self) -> str:
        return self._domain.code

    @property
    def model_version(self) -> str:
        return self._version

    @classmethod
    def from_mlflow(cls, domain_code: str, model_uri: str, version: str) -> "DomainDiagnosisPredictor":
        import mlflow.sklearn

        domain = get_domain(domain_code)
        if domain is None:
            raise ValueError(f"Unsupported domain: {domain_code}")
        pipeline = mlflow.sklearn.load_model(model_uri)
        logger.info("diagnosis_predictor.loaded", domain=domain_code, version=version, uri=model_uri)
        return cls(domain=domain, pipeline=pipeline, model_version=version)

    def predict_top_k(self, features: MedicalFeatures, k: int = 3) -> list[DiagnosisCandidate]:
        data = features.to_dict()
        row = {f: data.get(f, 0) for f in ALL_DIAGNOSIS_FEATURES}
        df = pd.DataFrame([row])

        proba = self._pipeline.predict_proba(df)[0]
        order = sorted(range(len(proba)), key=lambda i: -proba[i])
        top = order[: min(k, len(proba))]

        return [
            DiagnosisCandidate(
                code=self._domain.diagnoses[i].code,
                name_ru=self._domain.diagnoses[i].name_ru,
                name_lay_ru=self._domain.diagnoses[i].name_lay_ru,
                probability=float(proba[i]),
                icd10=self._domain.diagnoses[i].icd10,
            )
            for i in top
        ]
