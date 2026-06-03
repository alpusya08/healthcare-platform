"""
Train an XGBoost multi-class diagnosis classifier for one medical domain.

Each model:
  - takes the unified diagnosis feature set (triage features + diagnosis extras)
  - outputs probability over the domain's diagnosis list (top-K returned by predictor)
  - is logged to MLflow under "diagnosis-<domain>" registered model

Usage:
  python -m app.ml.diagnosis.train_domain --domain cardiology
  python -m app.ml.diagnosis.train_domain --domain cardiology --samples 2000
  python -m app.ml.diagnosis.train_domain --domain cardiology --mlflow-uri http://mlflow:5000
"""
from __future__ import annotations

import argparse
import importlib

import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, classification_report, f1_score, top_k_accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.ml.diagnosis.registry import (
    ALL_DIAGNOSIS_FEATURES,
    DIAGNOSIS_EXTRA_FEATURES,
    TRIAGE_FEATURES,
    get_domain,
    supported_domain_codes,
)


def _load_generator(domain_code: str):
    """Dynamically import generate_<domain>_dataset from generators/<domain>.py"""
    module = importlib.import_module(f"app.ml.diagnosis.generators.{domain_code}")
    fn_name = f"generate_{domain_code}_dataset"
    if not hasattr(module, fn_name):
        raise RuntimeError(f"Generator module '{domain_code}' is missing {fn_name}()")
    return getattr(module, fn_name)


def _build_pipeline(num_classes: int) -> Pipeline:
    numeric = ["age", "symptom_duration_days", "pain_severity",
               "associated_symptoms_count", "pain_character"]
    binary = [f for f in ALL_DIAGNOSIS_FEATURES if f not in numeric]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]), numeric),
            ("bin", SimpleImputer(strategy="constant", fill_value=0), binary),
        ]
    )

    classifier = xgb.XGBClassifier(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="multi:softprob",
        num_class=num_classes,
        eval_metric="mlogloss",
        n_jobs=-1,
        random_state=42,
        tree_method="hist",
    )

    return Pipeline([("preprocessor", preprocessor), ("classifier", classifier)])


def train_domain(
    domain_code: str,
    samples_per_class: int = 1500,
    mlflow_uri: str | None = None,
    register: bool = True,
) -> dict:
    domain = get_domain(domain_code)
    if domain is None:
        raise ValueError(f"Unknown domain '{domain_code}'. Supported: {supported_domain_codes()}")

    generator_fn = _load_generator(domain_code)

    print(f"\n[{domain_code}] Generating dataset: {samples_per_class} samples/class × {domain.num_classes} classes")
    df = generator_fn(samples_per_class=samples_per_class, seed=42)
    print(f"[{domain_code}] Dataset shape: {df.shape}")
    print(f"[{domain_code}] Class distribution:")
    print(df["diagnosis_code"].value_counts())

    X = df[ALL_DIAGNOSIS_FEATURES]
    y = df["diagnosis_class_id"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = _build_pipeline(num_classes=domain.num_classes)

    if mlflow_uri:
        mlflow.set_tracking_uri(mlflow_uri)
    mlflow.set_experiment(f"diagnosis-{domain_code}")

    with mlflow.start_run() as run:
        mlflow.log_param("domain", domain_code)
        mlflow.log_param("samples_per_class", samples_per_class)
        mlflow.log_param("num_classes", domain.num_classes)
        mlflow.log_param("triage_features", len(TRIAGE_FEATURES))
        mlflow.log_param("diagnosis_extra_features", len(DIAGNOSIS_EXTRA_FEATURES))

        print(f"[{domain_code}] Training XGBoost multi:softprob ...")
        pipeline.fit(X_train, y_train)

        # Eval
        y_pred = pipeline.predict(X_test)
        y_proba = pipeline.predict_proba(X_test)

        acc = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred, average="macro")
        top3 = top_k_accuracy_score(
            y_test, y_proba, k=min(3, domain.num_classes),
            labels=list(range(domain.num_classes)),
        )

        mlflow.log_metric("accuracy", acc)
        mlflow.log_metric("f1_macro", f1)
        mlflow.log_metric("top3_accuracy", top3)

        print(f"\n[{domain_code}] === RESULTS ===")
        print(f"  Accuracy:      {acc:.4f}")
        print(f"  F1 (macro):    {f1:.4f}")
        print(f"  Top-3 accuracy:{top3:.4f}")
        print(f"\n[{domain_code}] Classification report:")
        target_names = [d.code for d in domain.diagnoses]
        print(classification_report(y_test, y_pred, target_names=target_names, zero_division=0))

        # Log model + register + promote to champion alias
        if register:
            mlflow.sklearn.log_model(
                pipeline,
                artifact_path="model",
                registered_model_name=domain.model_name,
            )
            try:
                client = mlflow.MlflowClient()
                versions = client.search_model_versions(f"name='{domain.model_name}'")
                latest = max(int(v.version) for v in versions)
                client.set_registered_model_alias(domain.model_name, "champion", str(latest))
                print(f"[{domain_code}] Promoted version {latest} to 'champion'")
            except Exception as e:
                print(f"[{domain_code}] WARNING: could not promote to champion: {e}")
        else:
            mlflow.sklearn.log_model(pipeline, artifact_path="model")

        print(f"[{domain_code}] MLflow run: {run.info.run_id}")

        return {
            "domain": domain_code,
            "accuracy": float(acc),
            "f1_macro": float(f1),
            "top3_accuracy": float(top3),
            "run_id": run.info.run_id,
        }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True, help=f"One of: {supported_domain_codes()} or 'all'")
    parser.add_argument("--samples", type=int, default=1500, help="Samples per diagnosis class")
    parser.add_argument("--mlflow-uri", default=None, help="MLflow tracking URI")
    parser.add_argument("--no-register", action="store_true", help="Skip model registry")
    args = parser.parse_args()

    domains = supported_domain_codes() if args.domain == "all" else [args.domain]
    summaries = []
    for code in domains:
        s = train_domain(
            code,
            samples_per_class=args.samples,
            mlflow_uri=args.mlflow_uri,
            register=not args.no_register,
        )
        summaries.append(s)

    print("\n" + "=" * 60)
    print("TRAINING SUMMARY")
    print("=" * 60)
    for s in summaries:
        print(f"  {s['domain']:20s}  acc={s['accuracy']:.3f}  f1={s['f1_macro']:.3f}  top3={s['top3_accuracy']:.3f}")


if __name__ == "__main__":
    main()
