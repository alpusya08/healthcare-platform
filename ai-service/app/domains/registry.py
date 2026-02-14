from app.core.exceptions import DomainNotSupportedException
from app.core.interfaces.domain_strategy import MedicalDomain


class DomainRegistry:
    def __init__(self) -> None:
        self._domains: dict[str, MedicalDomain] = {}

    def register(self, domain: MedicalDomain) -> None:
        self._domains[domain.code] = domain

    def get(self, code: str) -> MedicalDomain:
        if code not in self._domains:
            raise DomainNotSupportedException(
                f"Medical domain '{code}' is not supported. "
                f"Available: {list(self._domains.keys())}"
            )
        return self._domains[code]

    def list_available(self) -> list[str]:
        return list(self._domains.keys())
