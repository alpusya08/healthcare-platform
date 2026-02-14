from abc import ABC, abstractmethod
from typing import Optional

from app.core.entities.analysis_session import AnalysisSession
from app.core.entities.diagnosis import Diagnosis
from app.core.entities.medical_features import MedicalFeatures
from app.core.entities.question import Question


class MedicalDomain(ABC):
    @property
    @abstractmethod
    def code(self) -> str:
        ...

    @property
    @abstractmethod
    def display_name(self) -> str:
        ...

    @property
    @abstractmethod
    def required_features(self) -> list[str]:
        ...

    @abstractmethod
    async def extract_features(self, session: AnalysisSession) -> MedicalFeatures:
        ...

    @abstractmethod
    async def generate_next_question(
        self, session: AnalysisSession, partial_features: MedicalFeatures
    ) -> Optional[Question]:
        ...

    @abstractmethod
    async def check_emergency(self, features: MedicalFeatures) -> Optional[str]:
        ...

    @abstractmethod
    async def predict(self, features: MedicalFeatures) -> Diagnosis:
        ...

    @abstractmethod
    def get_model_version(self) -> str:
        ...
