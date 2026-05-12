from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import pandas as pd


@dataclass
class MedicalFeatures:
    values: dict[str, Any]

    def get(self, key: str, default: Any = None) -> Any:
        return self.values.get(key, default)

    def missing_fields(self, required: list[str]) -> list[str]:
        return [f for f in required if self.values.get(f) is None]

    def to_dataframe(self) -> pd.DataFrame:
        return pd.DataFrame([self.values])

    def to_dict(self) -> dict[str, Any]:
        return dict(self.values)
