from abc import ABC, abstractmethod

from app.core.entities.diagnosis import ModelPrediction
from app.core.entities.medical_features import MedicalFeatures


class MLPredictor(ABC):
    @abstractmethod
    def predict(self, features: MedicalFeatures) -> ModelPrediction:
        ...

    @property
    @abstractmethod
    def model_version(self) -> str:
        ...
