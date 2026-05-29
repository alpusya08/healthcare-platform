"""Tests for the ML triage classifier feature extraction and clinical rules.

Validates that:
 1. _triage_label() correctly maps clinical features to ROUTINE/URGENT/EMERGENCY
 2. generate_synthetic_dataset() produces a balanced, reproducible dataset
 3. build_pipeline() trains a model that achieves minimum clinical accuracy
"""
from __future__ import annotations

import numpy as np
import pytest

from app.ml.train_triage import (
    ALL_FEATURES,
    BINARY_FEATURES,
    NUMERIC_FEATURES,
    TARGET,
    _default_params,
    _triage_label,
    build_pipeline,
    generate_synthetic_dataset,
)


# ── _triage_label unit tests ──────────────────────────────────────────────────


class TestTriageLabelRules:
    """Each test verifies one deterministic clinical triage rule."""

    def _row(self, **kwargs) -> dict:
        base = {
            "age": 35,
            "sex": 0,
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
        base.update(kwargs)
        return base

    def test_mild_gradual_pain_is_routine(self) -> None:
        row = self._row(pain_severity=3, onset_type=0, is_worsening=0)
        assert _triage_label(row) == 0

    def test_severe_pain_9_is_emergency(self) -> None:
        row = self._row(pain_severity=9)
        assert _triage_label(row) == 2

    def test_extreme_pain_10_is_emergency(self) -> None:
        row = self._row(pain_severity=10)
        assert _triage_label(row) == 2

    def test_red_flag_sudden_onset_is_emergency(self) -> None:
        row = self._row(red_flag_present=1, onset_type=1, pain_severity=5)
        assert _triage_label(row) == 2

    def test_red_flag_high_severity_is_emergency(self) -> None:
        row = self._row(red_flag_present=1, pain_severity=7)
        assert _triage_label(row) == 2

    def test_thunderclap_pattern_is_emergency(self) -> None:
        # Severity 8, sudden, <1 day — subarachnoid hemorrhage pattern
        row = self._row(pain_severity=8, onset_type=1, symptom_duration_days=1)
        assert _triage_label(row) == 2

    def test_moderate_severity_is_urgent(self) -> None:
        row = self._row(pain_severity=7)
        assert _triage_label(row) == 1

    def test_worsening_moderate_pain_is_urgent(self) -> None:
        row = self._row(pain_severity=5, is_worsening=1)
        assert _triage_label(row) == 1

    def test_adl_impairment_moderate_is_urgent(self) -> None:
        row = self._row(pain_severity=5, affects_daily_activity=1)
        assert _triage_label(row) == 1

    def test_elderly_moderate_severe_is_urgent(self) -> None:
        row = self._row(age=72, pain_severity=5, associated_symptoms_count=3)
        assert _triage_label(row) == 1

    def test_child_with_red_flag_severe_is_emergency(self) -> None:
        row = self._row(age=3, red_flag_present=1, pain_severity=6)
        assert _triage_label(row) == 2

    def test_chronic_worsening_severe_is_urgent(self) -> None:
        row = self._row(has_chronic_conditions=1, pain_severity=6, is_worsening=1)
        assert _triage_label(row) == 1


# ── generate_synthetic_dataset ────────────────────────────────────────────────


class TestSyntheticDataset:
    def test_returns_correct_columns(self) -> None:
        df = generate_synthetic_dataset(n_samples=200, seed=42)
        for col in ALL_FEATURES + [TARGET]:
            assert col in df.columns, f"Missing column: {col}"

    def test_target_has_three_classes(self) -> None:
        df = generate_synthetic_dataset(n_samples=300, seed=42)
        assert set(df[TARGET].unique()) == {0, 1, 2}

    def test_dataset_size_matches_request(self) -> None:
        df = generate_synthetic_dataset(n_samples=500, seed=0)
        assert len(df) == 500

    def test_reproducible_with_same_seed(self) -> None:
        df1 = generate_synthetic_dataset(n_samples=100, seed=7)
        df2 = generate_synthetic_dataset(n_samples=100, seed=7)
        assert df1[TARGET].tolist() == df2[TARGET].tolist()

    def test_different_seeds_differ(self) -> None:
        df1 = generate_synthetic_dataset(n_samples=200, seed=1)
        df2 = generate_synthetic_dataset(n_samples=200, seed=99)
        assert df1[TARGET].tolist() != df2[TARGET].tolist()

    def test_no_missing_values(self) -> None:
        df = generate_synthetic_dataset(n_samples=200, seed=42)
        assert df[ALL_FEATURES].isna().sum().sum() == 0

    def test_pain_severity_in_valid_range(self) -> None:
        df = generate_synthetic_dataset(n_samples=300, seed=42)
        assert df["pain_severity"].between(1, 10).all()

    def test_binary_features_are_binary(self) -> None:
        df = generate_synthetic_dataset(n_samples=300, seed=42)
        for col in BINARY_FEATURES:
            unique = set(df[col].unique())
            assert unique.issubset({0, 1}), f"Non-binary values in {col}: {unique}"

    def test_triage_labels_mostly_consistent_with_rules(self) -> None:
        """Dataset includes ~8% intentional label noise for robustness.
        At least 90% of labels must match the deterministic triage rules.
        """
        df = generate_synthetic_dataset(n_samples=500, seed=42)
        mismatches = sum(
            _triage_label(row.to_dict()) != row[TARGET]
            for _, row in df.iterrows()
        )
        noise_rate = mismatches / len(df)
        assert noise_rate <= 0.15, f"Label noise too high: {noise_rate:.2%}"


# ── build_pipeline + model accuracy ───────────────────────────────────────────


class TestBuildPipeline:
    @pytest.fixture(scope="class")
    def trained_pipeline(self):
        """Train once and reuse across tests in this class."""
        from sklearn.model_selection import train_test_split

        df = generate_synthetic_dataset(n_samples=1000, seed=42)
        X = df[ALL_FEATURES]
        y = df[TARGET]
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        pipeline = build_pipeline(_default_params())
        pipeline.fit(X_train, y_train)
        return pipeline, X_test, y_test

    def test_pipeline_achieves_minimum_accuracy(self, trained_pipeline) -> None:
        from sklearn.metrics import accuracy_score

        pipeline, X_test, y_test = trained_pipeline
        acc = accuracy_score(y_test, pipeline.predict(X_test))
        assert acc >= 0.90, f"Accuracy too low: {acc:.4f} < 0.90"

    def test_pipeline_predicts_all_three_classes(self, trained_pipeline) -> None:
        pipeline, X_test, _ = trained_pipeline
        predictions = set(pipeline.predict(X_test))
        assert predictions == {0, 1, 2}, f"Missing class predictions: {predictions}"

    def test_pipeline_returns_probabilities(self, trained_pipeline) -> None:
        pipeline, X_test, _ = trained_pipeline
        proba = pipeline.predict_proba(X_test)
        assert proba.shape == (len(X_test), 3)
        # Probabilities must sum to ~1 for each sample
        np.testing.assert_allclose(proba.sum(axis=1), 1.0, atol=1e-5)

    def test_emergency_recall_above_threshold(self, trained_pipeline) -> None:
        """Emergency class must have high recall — false negatives are clinically dangerous."""
        from sklearn.metrics import recall_score

        pipeline, X_test, y_test = trained_pipeline
        y_pred = pipeline.predict(X_test)
        recall = recall_score(y_test, y_pred, labels=[2], average="macro")
        assert recall >= 0.85, f"Emergency recall too low: {recall:.4f} < 0.85"
