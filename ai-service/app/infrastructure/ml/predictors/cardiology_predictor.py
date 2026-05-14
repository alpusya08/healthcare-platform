from __future__ import annotations

import structlog
import pandas as pd

from app.core.entities.diagnosis import ModelPrediction
from app.core.entities.medical_features import MedicalFeatures
from app.core.interfaces.ml_predictor import MLPredictor

logger = structlog.get_logger()

_NUMERIC_FEATURES = ["age", "resting_blood_pressure", "cholesterol", "max_heart_rate", "oldpeak"]
_CATEGORICAL_FEATURES = [
    "sex", "chest_pain_type", "fasting_blood_sugar",
    "resting_ecg", "exercise_angina", "st_slope",
]
_ALL_MODEL_FEATURES = _NUMERIC_FEATURES + _CATEGORICAL_FEATURES

_DIAGNOSIS_LABELS = {
    0: "Признаков сердечно-сосудистых заболеваний не выявлено",
    1: "Выявлены признаки сердечно-сосудистого заболевания",
}


class MLflowCardiologyPredictor(MLPredictor):
    def __init__(self, model_uri: str, version: str) -> None:
        import mlflow.sklearn
        self._pipeline = mlflow.sklearn.load_model(model_uri)
        self._version = version
        logger.info("cardiology_predictor.loaded", model_uri=model_uri, version=version)

    @property
    def model_version(self) -> str:
        return self._version

    def predict(self, features: MedicalFeatures) -> ModelPrediction:
        data = features.to_dict()
        row = {k: data.get(k) for k in _ALL_MODEL_FEATURES}
        df = pd.DataFrame([row])

        proba = self._pipeline.predict_proba(df)[0]
        class_id = int(proba.argmax())
        confidence = float(proba[class_id])

        return ModelPrediction(
            class_id=class_id,
            diagnosis=_DIAGNOSIS_LABELS[class_id],
            confidence=confidence,
            raw_probability=float(proba[1]),
            feature_importances=self._extract_importances(),
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
                names = _ALL_MODEL_FEATURES
            importances = classifier.feature_importances_.tolist()
            return dict(zip(names, importances))
        except Exception:
            logger.warning("cardiology_predictor.importances_extraction_failed")
            return None
