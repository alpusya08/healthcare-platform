from typing import Optional

from app.core.entities.analysis_session import AnalysisSession
from app.core.entities.diagnosis import Diagnosis
from app.core.entities.medical_features import MedicalFeatures
from app.core.entities.question import Question
from app.core.interfaces.domain_strategy import MedicalDomain


class NeurologyDomain(MedicalDomain):
    @property
    def code(self) -> str:
        return "neurology"

    @property
    def display_name(self) -> str:
        return "Неврология"

    @property
    def required_features(self) -> list[str]:
        return []

    async def extract_features(self, session: AnalysisSession) -> MedicalFeatures:
        raise NotImplementedError("Neurology domain is not implemented in MVP")

    async def generate_next_question(
        self, session: AnalysisSession, partial_features: MedicalFeatures
    ) -> Optional[Question]:
        raise NotImplementedError("Neurology domain is not implemented in MVP")

    async def check_emergency(self, features: MedicalFeatures) -> Optional[str]:
        raise NotImplementedError("Neurology domain is not implemented in MVP")

    async def predict(self, features: MedicalFeatures) -> Diagnosis:
        raise NotImplementedError("Neurology domain is not implemented in MVP")

    def get_model_version(self) -> str:
        return "not-implemented"
