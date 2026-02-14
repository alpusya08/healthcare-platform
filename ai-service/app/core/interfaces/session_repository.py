from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from app.core.entities.analysis_session import AnalysisSession
from app.core.entities.question import Question


class AnalysisSessionRepository(ABC):
    @abstractmethod
    async def create(self, session: AnalysisSession) -> AnalysisSession:
        ...

    @abstractmethod
    async def get(self, session_id: UUID) -> Optional[AnalysisSession]:
        ...

    @abstractmethod
    async def update_status(self, session_id: UUID, status: str) -> None:
        ...

    @abstractmethod
    async def add_question(self, question: Question) -> None:
        ...

    @abstractmethod
    async def update_answer(self, question_id: UUID, answer: str) -> None:
        ...

    @abstractmethod
    async def add_file_summary(self, session_id: UUID, summary: str) -> None:
        ...

    @abstractmethod
    async def save_report(self, session_id: UUID, report_data: dict) -> None:
        ...
