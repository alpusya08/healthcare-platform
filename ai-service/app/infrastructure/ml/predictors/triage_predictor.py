from __future__ import annotations

import structlog
import pandas as pd

from app.core.entities.diagnosis import ModelPrediction
from app.core.entities.medical_features import MedicalFeatures
from app.core.interfaces.ml_predictor import MLPredictor

logger = structlog.get_logger()

TRIAGE_FEATURES = [
    "age",
    "sex",
    "symptom_duration_days",
    "pain_severity",
    "onset_type",
    "is_worsening",
    "affects_daily_activity",
    "has_chronic_conditions",
    "takes_medications",
    "prior_similar_episode",
    "associated_symptoms_count",
    "red_flag_present",
]

_TRIAGE_LABELS = {
    0: "Плановое обращение",
    1: "Срочное обращение",
    2: "Экстренная помощь",
}

_TRIAGE_CODES = {0: "ROUTINE", 1: "URGENT", 2: "EMERGENCY"}


class MLflowTriagePredictor(MLPredictor):
    def __init__(self, model_uri: str, version: str) -> None:
        import mlflow.sklearn
        self._pipeline = mlflow.sklearn.load_model(model_uri)
        self._version = version
        logger.info("triage_predictor.loaded", model_uri=model_uri, version=version)

    @property
    def model_version(self) -> str:
        return self._version

    def predict(self, features: MedicalFeatures) -> ModelPrediction:
        data = features.to_dict()
        row = {k: data.get(k) for k in TRIAGE_FEATURES}
        df = pd.DataFrame([row])

        proba = self._pipeline.predict_proba(df)[0]
        class_id = int(proba.argmax())
        confidence = float(proba[class_id])

        return ModelPrediction(
            class_id=class_id,
            diagnosis=_TRIAGE_LABELS[class_id],
            confidence=confidence,
            raw_probability=float(proba[1]) if len(proba) > 1 else confidence,
            feature_importances=self._extract_importances(),
            triage_code=_TRIAGE_CODES[class_id],
        )

    def _extract_importances(self) -> dict[str, float] | None:
        try:
            classifier = self._pipeline.named_steps.get("classifier")
            if classifier is None or not hasattr(classifier, "feature_importances_"):
                return None
            preprocessor = self._pipeline.named_steps.get("preprocessor")
            if preprocessor and hasattr(preprocessor, "get_feature_names_out"):
                names = list(preprocessor.get_feature_names_out())
            else:
                names = TRIAGE_FEATURES
            importances = classifier.feature_importances_.tolist()
            return dict(zip(names, importances))
        except Exception:
            logger.warning("triage_predictor.importances_extraction_failed")
            return None
