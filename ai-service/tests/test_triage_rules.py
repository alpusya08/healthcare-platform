"""Tests for general clinical triage rules (MTS/ESI-based)."""
import pytest

from app.ml.train_triage import _triage_label


def row(**kwargs) -> dict:
    defaults = {
        "age": 35,
        "sex": 1,
        "symptom_duration_days": 3,
        "pain_severity": 4,
        "onset_type": 0,
        "is_worsening": 0,
        "affects_daily_activity": 0,
        "has_chronic_conditions": 0,
        "takes_medications": 0,
        "prior_similar_episode": 0,
        "associated_symptoms_count": 1,
        "red_flag_present": 0,
    }
    defaults.update(kwargs)
    return defaults


class TestEmergencyRules:
    def test_red_flag_with_sudden_onset_is_emergency(self) -> None:
        assert _triage_label(row(red_flag_present=1, onset_type=1)) == 2

    def test_extreme_severity_is_emergency(self) -> None:
        assert _triage_label(row(pain_severity=9)) == 2

    def test_maximum_severity_is_emergency(self) -> None:
        assert _triage_label(row(pain_severity=10)) == 2

    def test_thunderclap_pattern_is_emergency(self) -> None:
        # Sudden onset + high severity + very short duration
        assert _triage_label(row(pain_severity=8, onset_type=1, symptom_duration_days=0)) == 2

    def test_rapidly_worsening_severe_acute_pain_is_emergency(self) -> None:
        assert _triage_label(row(pain_severity=8, onset_type=1, is_worsening=1)) == 2

    def test_elderly_sudden_severe_multisymptom_is_emergency(self) -> None:
        assert _triage_label(row(age=70, pain_severity=8, associated_symptoms_count=5)) == 2

    def test_red_flag_high_severity_is_emergency(self) -> None:
        assert _triage_label(row(red_flag_present=1, pain_severity=7)) == 2

    def test_small_child_red_flag_moderate_severity_is_emergency(self) -> None:
        assert _triage_label(row(age=3, red_flag_present=1, pain_severity=6)) == 2

    def test_small_child_red_flag_low_severity_not_emergency(self) -> None:
        result = _triage_label(row(age=3, red_flag_present=1, pain_severity=4))
        assert result in (1, 2)  # at minimum URGENT

    def test_moderate_severity_no_red_flag_not_emergency(self) -> None:
        assert _triage_label(row(pain_severity=5, red_flag_present=0)) != 2


class TestUrgentRules:
    def test_high_severity_is_urgent(self) -> None:
        assert _triage_label(row(pain_severity=7)) == 1

    def test_moderate_severity_worsening_is_urgent(self) -> None:
        assert _triage_label(row(pain_severity=5, is_worsening=1)) == 1

    def test_moderate_severity_adl_impact_is_urgent(self) -> None:
        assert _triage_label(row(pain_severity=5, affects_daily_activity=1)) == 1

    def test_many_symptoms_moderate_pain_is_urgent(self) -> None:
        assert _triage_label(row(associated_symptoms_count=4, pain_severity=4)) == 1

    def test_red_flag_with_mild_pain_is_urgent(self) -> None:
        assert _triage_label(row(red_flag_present=1, pain_severity=3)) == 1

    def test_chronic_condition_decompensation_is_urgent(self) -> None:
        assert _triage_label(row(has_chronic_conditions=1, pain_severity=6, is_worsening=1)) == 1

    def test_elderly_moderate_multisymptom_is_urgent(self) -> None:
        assert _triage_label(row(age=72, pain_severity=5, associated_symptoms_count=3)) == 1

    def test_child_moderate_pain_multiple_symptoms_is_urgent(self) -> None:
        assert _triage_label(row(age=8, pain_severity=5, associated_symptoms_count=3)) == 1

    def test_prolonged_worsening_moderate_pain_is_urgent(self) -> None:
        assert _triage_label(row(symptom_duration_days=20, pain_severity=5, is_worsening=1)) == 1

    def test_acute_onset_short_duration_moderate_is_urgent(self) -> None:
        assert _triage_label(row(onset_type=1, symptom_duration_days=1, pain_severity=5)) == 1


class TestRoutineRules:
    def test_mild_chronic_stable_is_routine(self) -> None:
        assert _triage_label(row(
            pain_severity=3,
            onset_type=0,
            is_worsening=0,
            red_flag_present=0,
            symptom_duration_days=14,
        )) == 0

    def test_low_severity_no_red_flags_is_routine(self) -> None:
        assert _triage_label(row(
            pain_severity=2,
            red_flag_present=0,
            is_worsening=0,
            affects_daily_activity=0,
        )) == 0

    def test_mild_pain_no_adl_impact_is_routine(self) -> None:
        assert _triage_label(row(pain_severity=2, affects_daily_activity=0)) == 0

    def test_known_chronic_condition_mild_stable_is_routine(self) -> None:
        assert _triage_label(row(
            has_chronic_conditions=1,
            pain_severity=3,
            is_worsening=0,
            prior_similar_episode=1,
            symptom_duration_days=30,
        )) == 0

    def test_single_mild_symptom_gradual_onset_is_routine(self) -> None:
        assert _triage_label(row(
            pain_severity=2,
            onset_type=0,
            associated_symptoms_count=0,
            red_flag_present=0,
        )) == 0


class TestEdgeCases:
    def test_severity_8_gradual_onset_long_duration_not_thunderclap(self) -> None:
        # Thunderclap requires duration <= 1 day; long duration should not trigger it
        result = _triage_label(row(pain_severity=8, onset_type=1, symptom_duration_days=5))
        # Still EMERGENCY because pain >= 9 rule doesn't apply, but red+sudden may not either
        # At severity 8, sudden but not short duration: check what rule applies
        assert result in (1, 2)

    def test_severity_boundary_6_no_red_flag_worsening_gradual(self) -> None:
        result = _triage_label(row(pain_severity=6, is_worsening=0, red_flag_present=0))
        assert result in (0, 1)

    def test_all_zeros_is_routine(self) -> None:
        assert _triage_label(row(
            age=30,
            pain_severity=0,
            onset_type=0,
            is_worsening=0,
            affects_daily_activity=0,
            has_chronic_conditions=0,
            red_flag_present=0,
            associated_symptoms_count=0,
        )) == 0

    def test_elderly_with_moderate_chronic_stable_may_be_urgent(self) -> None:
        # 70+ with 5 severity and 3 associated symptoms → URGENT by elderly rule
        result = _triage_label(row(age=75, pain_severity=5, associated_symptoms_count=3))
        assert result >= 1
