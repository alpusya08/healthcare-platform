from enum import Enum


class TriageLevel(str, Enum):
    EMERGENCY = "EMERGENCY"
    URGENT = "URGENT"
    ROUTINE = "ROUTINE"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class QuestionType(str, Enum):
    SINGLE_CHOICE = "single_choice"
    MULTI_CHOICE = "multi_choice"
    NUMBER = "number"
    BOOLEAN = "boolean"
    TEXT = "text"


class AnalysisStatus(str, Enum):
    STARTED = "STARTED"
    QUESTIONING = "QUESTIONING"
    PROCESSING_FILES = "PROCESSING_FILES"
    ANALYZING = "ANALYZING"
    COMPLETED = "COMPLETED"
    EMERGENCY = "EMERGENCY"
    ERROR = "ERROR"


class FeedbackVerdict(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PARTIALLY_APPROVED = "PARTIALLY_APPROVED"
