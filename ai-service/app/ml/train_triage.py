"""
Train XGBoost triage classifier (ROUTINE / URGENT / EMERGENCY).

Features (12 general medical features extracted from patient dialogue):
  age, sex, symptom_duration_days, pain_severity, onset_type,
  is_worsening, affects_daily_activity, has_chronic_conditions,
  takes_medications, prior_similar_episode, associated_symptoms_count,
  red_flag_present

Target: triage_level  0=ROUTINE  1=URGENT  2=EMERGENCY

Usage:
  python -m app.ml.train_triage
  python -m app.ml.train_triage --mlflow-uri http://mlflow:5000
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Optional

import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

EXPERIMENT_NAME = "triage-classification"
MODEL_REGISTRY_NAME = "triage-classifier"

NUMERIC_FEATURES = [
    "age", "symptom_duration_days", "pain_severity", "associated_symptoms_count",
]
BINARY_FEATURES = [
    "sex", "onset_type", "is_worsening", "affects_daily_activity",
    "has_chronic_conditions", "takes_medications", "prior_similar_episode",
    "red_flag_present",
]
ALL_FEATURES = NUMERIC_FEATURES + BINARY_FEATURES
TARGET = "triage_level"

_TRIAGE_CODES = {0: "ROUTINE", 1: "URGENT", 2: "EMERGENCY"}


# ── Synthetic dataset generation ──────────────────────────────────────────────

def _triage_label(row: dict) -> int:
    """Deterministic triage rule based on Manchester Triage System principles."""
    sev = row["pain_severity"]
    red = row["red_flag_present"]
    onset = row["onset_type"]
    worsening = row["is_worsening"]
    adl = row["affects_daily_activity"]
    dur = row["symptom_duration_days"]
    assoc = row["associated_symptoms_count"]
    chronic = row["has_chronic_conditions"]

    # EMERGENCY: life-threatening signs
    if red == 1 and onset == 1:
        return 2
    if sev >= 9:
        return 2
    if sev >= 8 and onset == 1 and worsening == 1:
        return 2

    # URGENT: significant but not immediate threat
    if sev >= 7:
        return 1
    if sev >= 5 and worsening == 1:
        return 1
    if adl == 1 and sev >= 5:
        return 1
    if assoc >= 4 and sev >= 4:
        return 1
    if onset == 1 and dur <= 1 and sev >= 5:
        return 1
    if red == 1 and sev >= 4:
        return 1
    if chronic == 1 and sev >= 6 and worsening == 1:
        return 1

    return 0


def generate_synthetic_dataset(n_samples: int = 3000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []

    for _ in range(n_samples):
        row: dict = {
            "age": int(rng.integers(5, 90)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.choice(
                [0, 1, 2, 3, 5, 7, 14, 30, 60, 90],
                p=[0.15, 0.15, 0.1, 0.1, 0.1, 0.1, 0.1, 0.08, 0.07, 0.05],
            )),
            "pain_severity": int(rng.integers(0, 11)),
            "onset_type": int(rng.choice([0, 1], p=[0.65, 0.35])),
            "is_worsening": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.55, 0.45])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.65, 0.35])),
            "takes_medications": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "associated_symptoms_count": int(rng.choice(
                [0, 1, 2, 3, 4, 5, 6],
                p=[0.2, 0.25, 0.2, 0.15, 0.1, 0.07, 0.03],
            )),
            "red_flag_present": int(rng.choice([0, 1], p=[0.85, 0.15])),
        }
        row[TARGET] = _triage_label(row)

        # Add small noise (~5%) to avoid perfect separability
        if rng.random() < 0.05:
            current = row[TARGET]
            neighbors = [l for l in [0, 1, 2] if l != current]
            row[TARGET] = int(rng.choice(neighbors))

        rows.append(row)

    df = pd.DataFrame(rows)
    dist = df[TARGET].value_counts().sort_index().to_dict()
    print(f"Generated {len(df)} samples — distribution: {_TRIAGE_CODES[0]}={dist.get(0,0)}, "
          f"{_TRIAGE_CODES[1]}={dist.get(1,0)}, {_TRIAGE_CODES[2]}={dist.get(2,0)}")
    return df


def load_or_generate_dataset(extra_samples: Optional[list[dict]] = None) -> pd.DataFrame:
    data_dir = Path(__file__).resolve().parents[3] / "data" / "raw"
    data_dir.mkdir(parents=True, exist_ok=True)
    cache_path = data_dir / "triage_synthetic.csv"

    if cache_path.exists():
        base_df = pd.read_csv(cache_path)
        print(f"Loaded cached synthetic dataset: {len(base_df)} rows from {cache_path}")
    else:
        base_df = generate_synthetic_dataset(n_samples=3000)
        base_df.to_csv(cache_path, index=False)
        print(f"Saved synthetic dataset to {cache_path}")

    parts = [base_df]

    if extra_samples:
        fb_df = pd.DataFrame(extra_samples)
        # Ensure all feature columns exist
        for col in ALL_FEATURES:
            if col not in fb_df.columns:
                fb_df[col] = np.nan
        if TARGET in fb_df.columns:
            parts.append(fb_df[ALL_FEATURES + [TARGET]])
            print(f"Added {len(fb_df)} feedback samples")

    df = pd.concat(parts, ignore_index=True)
    print(f"Total training data: {len(df)} rows")
    return df


# ── Model building ────────────────────────────────────────────────────────────

def build_pipeline(params: dict) -> Pipeline:
    preprocessor = ColumnTransformer(
        [
            ("num", Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]), NUMERIC_FEATURES),
            ("bin", SimpleImputer(strategy="most_frequent"), BINARY_FEATURES),
        ],
        remainder="drop",
    )
    return Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", xgb.XGBClassifier(
            **params,
            objective="multi:softprob",
            num_class=3,
            random_state=42,
            eval_metric="mlogloss",
        )),
    ])


def _default_params() -> dict:
    return {
        "n_estimators": 200,
        "max_depth": 5,
        "learning_rate": 0.1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 3,
    }


# ── Main training ─────────────────────────────────────────────────────────────

def train(mlflow_uri: str = "http://localhost:5000") -> None:
    mlflow.set_tracking_uri(mlflow_uri)
    mlflow.set_experiment(EXPERIMENT_NAME)

    df = load_or_generate_dataset()
    X = df[ALL_FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42,
    )
    print(f"Train: {len(X_train)}  Test: {len(X_test)}")

    params = _default_params()
    pipeline = build_pipeline(params)

    with mlflow.start_run(run_name="triage_v1"):
        mlflow.log_params(params)
        mlflow.log_param("features", ALL_FEATURES)
        mlflow.log_param("n_train", len(X_train))
        mlflow.log_param("n_test", len(X_test))
        mlflow.log_param("target_classes", list(_TRIAGE_CODES.values()))

        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_f1 = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1_macro")
        mlflow.log_metric("cv_f1_macro_mean", cv_f1.mean())
        mlflow.log_metric("cv_f1_macro_std", cv_f1.std())
        print(f"CV F1-macro: {cv_f1.mean():.4f} ± {cv_f1.std():.4f}")

        pipeline.fit(X_train, y_train)

        y_pred = pipeline.predict(X_test)
        metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "f1_macro": f1_score(y_test, y_pred, average="macro", zero_division=0),
            "f1_routine": f1_score(y_test, y_pred, labels=[0], average="micro", zero_division=0),
            "f1_urgent": f1_score(y_test, y_pred, labels=[1], average="micro", zero_division=0),
            "f1_emergency": f1_score(y_test, y_pred, labels=[2], average="micro", zero_division=0),
        }
        mlflow.log_metrics(metrics)
        print(f"\nTest metrics: {metrics}")
        print(classification_report(y_test, y_pred, target_names=list(_TRIAGE_CODES.values())))

        _log_feature_importances(pipeline)

        mlflow.sklearn.log_model(
            sk_model=pipeline,
            artifact_path="model",
            registered_model_name=MODEL_REGISTRY_NAME,
        )
        mlflow.set_tag("model_type", "xgboost_multiclass")
        mlflow.set_tag("feature_set", "12_general_triage_features")

    _promote_to_champion(mlflow_uri)


def retrain_with_feedback(
    mlflow_uri: str = "http://localhost:5000",
    extra_samples: Optional[list[dict]] = None,
) -> dict:
    """Retrain with doctor feedback labels. Deploy only if F1-macro improves."""
    mlflow.set_tracking_uri(mlflow_uri)
    mlflow.set_experiment(EXPERIMENT_NAME)

    old_f1 = _get_champion_f1(mlflow_uri)

    df = load_or_generate_dataset(extra_samples=extra_samples or [])
    X = df[ALL_FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42,
    )

    params = _default_params()
    pipeline = build_pipeline(params)

    with mlflow.start_run(run_name="triage_retrain_feedback"):
        mlflow.log_params(params)
        mlflow.log_param("feedback_samples", len(extra_samples or []))
        mlflow.log_param("n_train", len(X_train))

        pipeline.fit(X_train, y_train)

        y_pred = pipeline.predict(X_test)
        new_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
        metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "f1_macro": new_f1,
            "old_champion_f1": old_f1 or 0.0,
        }
        mlflow.log_metrics(metrics)

        deployed = False
        if old_f1 is None or new_f1 > old_f1:
            mlflow.sklearn.log_model(
                sk_model=pipeline,
                artifact_path="model",
                registered_model_name=MODEL_REGISTRY_NAME,
            )
            mlflow.set_tag("stage", "promoted")
            _promote_to_champion(mlflow_uri)
            deployed = True
            print(f"New F1={new_f1:.4f} > old F1={old_f1:.4f} → deployed as champion")
        else:
            mlflow.set_tag("stage", "rejected")
            print(f"New F1={new_f1:.4f} ≤ old F1={old_f1:.4f} → NOT deployed")

    return {
        "status": "ok",
        "message": f"New F1={new_f1:.4f}, champion F1={old_f1:.4f}. Deployed: {deployed}",
        "new_f1": new_f1,
        "old_f1": old_f1,
        "deployed": deployed,
    }


def _promote_to_champion(mlflow_uri: str) -> None:
    client = mlflow.MlflowClient(tracking_uri=mlflow_uri)
    try:
        versions = client.search_model_versions(f"name='{MODEL_REGISTRY_NAME}'")
        latest = max(int(v.version) for v in versions)
        client.set_registered_model_alias(MODEL_REGISTRY_NAME, "champion", str(latest))
        print(f"Promoted version {latest} to 'champion'")
    except Exception as exc:
        print(f"Warning: could not promote to champion: {exc}")


def _get_champion_f1(mlflow_uri: str) -> float | None:
    try:
        client = mlflow.MlflowClient(tracking_uri=mlflow_uri)
        alias_version = client.get_model_version_by_alias(MODEL_REGISTRY_NAME, "champion")
        run = client.get_run(alias_version.run_id)
        return run.data.metrics.get("f1_macro")
    except Exception:
        return None


def _log_feature_importances(pipeline: Pipeline) -> None:
    try:
        classifier = pipeline.named_steps["classifier"]
        if not hasattr(classifier, "feature_importances_"):
            return
        names = ALL_FEATURES
        importances = classifier.feature_importances_
        importance_dict = dict(zip(names, importances.tolist()))
        mlflow.log_dict(importance_dict, "feature_importances.json")
        print("Feature importances:", sorted(importance_dict.items(), key=lambda x: -x[1])[:5])
    except Exception as exc:
        print(f"Could not log feature importances: {exc}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mlflow-uri", default="http://localhost:5000")
    args = parser.parse_args()
    train(mlflow_uri=args.mlflow_uri)
