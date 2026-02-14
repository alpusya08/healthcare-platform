from __future__ import annotations

from typing import Optional
from uuid import UUID

from app.core.entities.analysis_session import AnalysisSession
from app.core.entities.question import Question
from app.core.interfaces.session_repository import AnalysisSessionRepository


class InMemorySessionRepository(AnalysisSessionRepository):
    def __init__(self) -> None:
        self._sessions: dict[UUID, AnalysisSession] = {}
        self._reports: dict[UUID, dict] = {}

    async def create(self, session: AnalysisSession) -> AnalysisSession:
        self._sessions[session.id] = session
        return session

    async def get(self, session_id: UUID) -> Optional[AnalysisSession]:
        return self._sessions.get(session_id)

    async def update_status(self, session_id: UUID, status: str) -> None:
        session = self._sessions.get(session_id)
        if session:
            from app.core.enums import AnalysisStatus
            session.status = AnalysisStatus(status)

    async def add_question(self, question: Question) -> None:
        session = self._sessions.get(question.session_id)
        if session:
            session.questions.append(question)

    async def update_answer(self, question_id: UUID, answer: str) -> None:
        for session in self._sessions.values():
            for q in session.questions:
                if q.id == question_id:
                    q.answer = answer
                    return

    async def add_file_summary(self, session_id: UUID, summary: str) -> None:
        session = self._sessions.get(session_id)
        if session:
            session.file_summaries.append(summary)

    async def save_report(self, session_id: UUID, report_data: dict) -> None:
        self._reports[session_id] = report_data

    async def get_report(self, session_id: UUID) -> Optional[dict]:
        return self._reports.get(session_id)
