class AIServiceError(Exception):
    pass


class DomainNotSupportedException(AIServiceError):
    pass


class SessionNotFoundException(AIServiceError):
    pass


class AnalysisAlreadyCompletedException(AIServiceError):
    pass


class LLMProviderError(AIServiceError):
    pass


class ModelNotLoadedException(AIServiceError):
    pass
