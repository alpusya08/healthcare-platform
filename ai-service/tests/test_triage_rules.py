"""Tests for cardiology triage emergency detection rules."""
import pytest

from app.core.entities.medical_features import MedicalFeatures
from app.domains.cardiology.triage_rules import check_cardiology_emergency


def features(values: dict) -> MedicalFeatures:
    return MedicalFeatures(values=values)


class TestEmergencyKeywords:
    def test_crushing_pain_with_arm_radiation_triggers_emergency(self) -> None:
        f = features({"_raw_description": "сильная давящая боль отдает в руку, тошнота"})
        result = check_cardiology_emergency(f)
        assert result is not None
        assert "103" in result

    def test_crushing_pain_with_cold_sweat_triggers_emergency(self) -> None:
        f = features({"_raw_description": "сильная давящая боль и холодный пот"})
        result = check_cardiology_emergency(f)
        assert result is not None

    def test_sternum_pain_not_passing_triggers_emergency(self) -> None:
        f = features({"_raw_description": "боль за грудиной не проходит уже 20 минут"})
        result = check_cardiology_emergency(f)
        assert result is not None

    def test_sharp_chest_pain_with_dyspnea_triggers_emergency(self) -> None:
        f = features({"_raw_description": "резкая боль в груди и одышка"})
        result = check_cardiology_emergency(f)
        assert result is not None

    def test_routine_chest_pain_no_trigger(self) -> None:
        f = features({"_raw_description": "иногда покалывает в груди при нагрузке"})
        result = check_cardiology_emergency(f)
        assert result is None

    def test_empty_description_no_trigger(self) -> None:
        f = features({"_raw_description": ""})
        result = check_cardiology_emergency(f)
        assert result is None

    def test_missing_description_key_no_crash(self) -> None:
        f = features({})
        result = check_cardiology_emergency(f)
        assert result is None

    def test_single_keyword_alone_no_trigger(self) -> None:
        f = features({"_raw_description": "сильная давящая боль без других симптомов"})
        result = check_cardiology_emergency(f)
        assert result is None


class TestHypertensionEmergency:
    def test_very_high_systolic_triggers_emergency(self) -> None:
        f = features({"_raw_description": "голова кружится", "trestbps": 200})
        result = check_cardiology_emergency(f)
        assert result is not None
        assert "103" in result

    def test_exactly_180_triggers_emergency(self) -> None:
        f = features({"_raw_description": "", "trestbps": 180})
        result = check_cardiology_emergency(f)
        assert result is not None

    def test_179_does_not_trigger(self) -> None:
        f = features({"_raw_description": "", "trestbps": 179})
        result = check_cardiology_emergency(f)
        assert result is None

    def test_none_trestbps_no_crash(self) -> None:
        f = features({"_raw_description": "", "trestbps": None})
        result = check_cardiology_emergency(f)
        assert result is None

    def test_normal_pressure_no_trigger(self) -> None:
        f = features({"_raw_description": "немного кружится голова", "trestbps": 130})
        result = check_cardiology_emergency(f)
        assert result is None
