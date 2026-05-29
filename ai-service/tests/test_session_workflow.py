"""Tests for the analysis session repository and workflow state transitions."""
from __future__ import annotations

import uuid

import pytest

from app.core.entities.analysis_session import AnalysisSession
from app.core.entities.question import Question
from app.core.enums import AnalysisStatus, QuestionType
from app.infrastructure.persistence.in_memory_session_repo import InMemorySessionRepository


def make_session(description: str = "Болит голова уже два дня") -> AnalysisSession:
    return AnalysisSession(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        domain_code="general",
        initial_description=description,
        status=AnalysisStatus.STARTED,
    )


def make_question(session_id: uuid.UUID, feature: str = "pain_severity") -> Question:
    return Question(
        id=uuid.uuid4(),
        session_id=session_id,
        question_text="Оцените боль по шкале от 1 до 10",
        question_type=QuestionType.NUMBER,
        feature_name=feature,
    )


class TestInMemorySessionRepository:
    @pytest.fixture()
    def repo(self) -> InMemorySessionRepository:
        return InMemorySessionRepository()

    @pytest.mark.asyncio
    async def test_create_and_get_session(self, repo: InMemorySessionRepository) -> None:
        session = make_session()
        await repo.create(session)
        fetched = await repo.get(session.id)
        assert fetched is not None
        assert fetched.id == session.id
        assert fetched.domain_code == "general"

    @pytest.mark.asyncio
    async def test_get_unknown_session_returns_none(self, repo: InMemorySessionRepository) -> None:
        result = await repo.get(uuid.uuid4())
        assert result is None

    @pytest.mark.asyncio
    async def test_update_status_transitions_correctly(self, repo: InMemorySessionRepository) -> None:
        session = make_session()
        await repo.create(session)
        await repo.update_status(session.id, AnalysisStatus.QUESTIONING.value)
        fetched = await repo.get(session.id)
        assert fetched.status == AnalysisStatus.QUESTIONING

    @pytest.mark.asyncio
    async def test_add_question_appends_to_session(self, repo: InMemorySessionRepository) -> None:
        session = make_session()
        await repo.create(session)
        q = make_question(session.id)
        await repo.add_question(q)
        fetched = await repo.get(session.id)
        assert len(fetched.questions) == 1
        assert fetched.questions[0].id == q.id

    @pytest.mark.asyncio
    async def test_update_answer_stores_response(self, repo: InMemorySessionRepository) -> None:
        session = make_session()
        await repo.create(session)
        q = make_question(session.id)
        await repo.add_question(q)
        await repo.update_answer(q.id, "7")
        fetched = await repo.get(session.id)
        assert fetched.questions[0].answer == "7"

    @pytest.mark.asyncio
    async def test_update_answer_unknown_question_is_noop(self, repo: InMemorySessionRepository) -> None:
        session = make_session()
        await repo.create(session)
        await repo.update_answer(uuid.uuid4(), "5")  # should not raise

    @pytest.mark.asyncio
    async def test_add_file_summary_appends(self, repo: InMemorySessionRepository) -> None:
        session = make_session()
        await repo.create(session)
        await repo.add_file_summary(session.id, "[PDF: analysis.pdf] Hemoglobin 120 g/L")
        fetched = await repo.get(session.id)
        assert len(fetched.file_summaries) == 1
        assert "Hemoglobin" in fetched.file_summaries[0]

    @pytest.mark.asyncio
    async def test_save_and_get_report(self, repo: InMemorySessionRepository) -> None:
        session = make_session()
        await repo.create(session)
        report = {"triage_level": "URGENT", "confidence": 0.88}
        await repo.save_report(session.id, report)
        stored = await repo.get_report(session.id)
        assert stored["triage_level"] == "URGENT"

    @pytest.mark.asyncio
    async def test_emergency_status_transition(self, repo: InMemorySessionRepository) -> None:
        session = make_session()
        await repo.create(session)
        await repo.update_status(session.id, AnalysisStatus.EMERGENCY.value)
        fetched = await repo.get(session.id)
        assert fetched.status == AnalysisStatus.EMERGENCY


class TestAnalysisSessionEntity:
    def test_format_qa_history_no_questions(self) -> None:
        session = make_session()
        history = session.format_qa_history()
        assert "No questions" in history

    def test_format_qa_history_with_answered_question(self) -> None:
        session = make_session()
        q = make_question(session.id)
        q.answer = "5"
        session.questions.append(q)
        history = session.format_qa_history()
        assert "Q1:" in history
        assert "A1: 5" in history

    def test_format_qa_history_unanswered_shows_placeholder(self) -> None:
        session = make_session()
        session.questions.append(make_question(session.id))
        history = session.format_qa_history()
        assert "(not answered)" in history

    def test_questions_count_property(self) -> None:
        session = make_session()
        assert session.questions_count == 0
        session.questions.append(make_question(session.id))
        assert session.questions_count == 1

    def test_format_files_summary_no_files(self) -> None:
        session = make_session()
        assert "No files" in session.format_files_summary()

    def test_format_files_summary_with_files(self) -> None:
        session = make_session()
        session.file_summaries.append("[PDF: labs.pdf] Glucose 6.1 mmol/L")
        summary = session.format_files_summary()
        assert "labs.pdf" in summary
