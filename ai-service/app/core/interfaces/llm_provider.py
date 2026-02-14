from abc import ABC, abstractmethod
from typing import Any


class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, prompt: str) -> str:
        ...

    @abstractmethod
    async def complete_structured(self, prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
        ...
