from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.core.enums import AnalysisStatus
from app.core.entities.question import Question


@dataclass
class AnalysisSession:
    id: UUID
    user_id: UUID
    domain_code: str
    initial_description: str
    status: AnalysisStatus
    questions: list[Question] = field(default_factory=list)
    file_summaries: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def questions_count(self) -> int:
        return len(self.questions)

    def format_qa_history(self) -> str:
        if not self.questions:
            return "No questions asked yet."
        lines: list[str] = []
        for i, q in enumerate(self.questions, 1):
            answer = q.answer if q.answer is not None else "(not answered)"
            lines.append(f"Q{i}: {q.question_text}\nA{i}: {answer}")
        return "\n".join(lines)

    def format_files_summary(self) -> str:
        if not self.file_summaries:
            return "No files uploaded."
        return "\n".join(f"- {s}" for s in self.file_summaries)
