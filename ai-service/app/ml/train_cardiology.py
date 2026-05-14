"""
Train XGBoost cardiology model on merged datasets.

Datasets:
  - UCI Heart Disease: Cleveland, Hungary, Switzerland, VA Long Beach (auto-downloaded)
  - Optional: Kaggle Heart Disease Dataset (place in data/raw/kaggle_heart.csv)
  - Optional: doctor feedback from the feedback loop (passed as extra_samples)

Usage:
  python -m app.ml.train_cardiology
  python -m app.ml.train_cardiology --mlflow-uri http://mlflow:5000
"""
from __future__ import annotations

import argparse
import io
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
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

DATA_DIR = Path(__file__).resolve().parents[3] / "data" / "raw"
EXPERIMENT_NAME = "cardiology-diagnosis"
MODEL_REGISTRY_NAME = "cardiology-diagnosis"

NUMERIC_FEATURES = ["age", "resting_blood_pressure", "cholesterol", "max_heart_rate", "oldpeak"]
CATEGORICAL_FEATURES = [
    "sex", "chest_pain_type", "fasting_blood_sugar",
    "resting_ecg", "exercise_angina", "st_slope",
]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# Maps UCI column names → our feature names
_UCI_RENAME = {
    "cp": "chest_pain_type",
    "trestbps": "resting_blood_pressure",
    "chol": "cholesterol",
    "fbs": "fasting_blood_sugar",
    "restecg": "resting_ecg",
    "thalach": "max_heart_rate",
    "exang": "exercise_angina",
    "slope": "st_slope",
}

_UCI_SOURCES = [
    ("cleveland",  "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data"),
    ("hungarian",  "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.hungarian.data"),
    ("switzerland","https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.switzerland.data"),
    ("va",         "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.va.data"),
]

_UCI_COLUMNS = [
    "age", "sex", "chest_pain_type", "resting_blood_pressure",
    "cholesterol", "fasting_blood_sugar", "resting_ecg", "max_heart_rate",
    "exercise_angina", "oldpeak", "st_slope", "ca", "thal", "target",
]


# ── Dataset loaders ───────────────────────────────────────────────────────────

def _download_uci_source(name: str, url: str) -> pd.DataFrame | None:
    cache_path = DATA_DIR / f"uci_{name}.csv"
    if cache_path.exists():
        raw = cache_path.read_text()
    else:
        try:
            import urllib.request
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(url, timeout=15) as resp:
                raw = resp.read().decode("utf-8")
            cache_path.write_text(raw)
            print(f"  Downloaded {name} → {cache_path}")
        except Exception as exc:
            print(f"  Warning: could not download UCI {name}: {exc}")
            return None

    try:
        df = pd.read_csv(
            io.StringIO(raw),
            header=None,
            names=_UCI_COLUMNS,
            na_values="?",
        )
        df["source"] = name
        return df
    except Exception as exc:
        print(f"  Warning: could not parse UCI {name}: {exc}")
        return None


def load_uci_datasets() -> pd.DataFrame:
    parts = []
    for name, url in _UCI_SOURCES:
        df = _download_uci_source(name, url)
        if df is not None:
            parts.append(df)
    if not parts:
        raise RuntimeError("Could not load any UCI dataset. Check network access.")
    merged = pd.concat(parts, ignore_index=True)
    print(f"UCI total: {len(merged)} rows from {len(parts)} sources")
    return merged


def _try_load_kaggle() -> pd.DataFrame | None:
    path = DATA_DIR / "kaggle_heart.csv"
    if not path.exists():
        return None
    try:
        df = pd.read_csv(path)
        # Kaggle dataset uses same UCI column names but abbreviated
        df = df.rename(columns=_UCI_RENAME)
        df["source"] = "kaggle"
        if "target" not in df.columns and "condition" in df.columns:
            df["target"] = df["condition"]
        print(f"Kaggle dataset loaded: {len(df)} rows")
        return df
    except Exception as exc:
        print(f"  Warning: could not load kaggle_heart.csv: {exc}")
        return None


def prepare_dataset(extra_samples: Optional[list[dict]] = None) -> pd.DataFrame:
    uci = load_uci_datasets()
    parts = [uci]

    kaggle = _try_load_kaggle()
    if kaggle is not None:
        parts.append(kaggle)

    if extra_samples:
        feedback_df = pd.DataFrame(extra_samples)
        feedback_df["source"] = "feedback"
        parts.append(feedback_df)
        print(f"Feedback samples added: {len(feedback_df)} rows")

    df = pd.concat(parts, ignore_index=True)

    # Binarize target (UCI uses 0=healthy, 1-4=disease)
    df["target"] = (df["target"].fillna(0) > 0).astype(int)

    # Keep only our 11 features + target
    cols = ALL_FEATURES + ["target"]
    available = [c for c in cols if c in df.columns]
    df = df[available].copy()

    # Replace '?' and invalid zeros in lab values
    for col in ["cholesterol", "resting_blood_pressure", "max_heart_rate"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df.loc[df[col] == 0, col] = np.nan

    print(f"Final dataset: {len(df)} rows, target balance: {df['target'].value_counts().to_dict()}")
    return df


# ── Model building ────────────────────────────────────────────────────────────

def build_pipeline(params: dict) -> Pipeline:
    num_cols = [c for c in NUMERIC_FEATURES if c != "ca" and c != "thal"]
    cat_cols = [c for c in CATEGORICAL_FEATURES]

    preprocessor = ColumnTransformer(
        [
            ("num", Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]), num_cols),
            ("cat", Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
            ]), cat_cols),
        ],
        remainder="drop",
    )

    return Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", xgb.XGBClassifier(**params, random_state=42)),
    ])


def _tune_hyperparams(X_train: pd.DataFrame, y_train: pd.Series) -> dict:
    """Optuna hyperparameter search. Falls back to sensible defaults if optuna unavailable."""
    try:
        import optuna
        optuna.logging.set_verbosity(optuna.logging.WARNING)

        def objective(trial: optuna.Trial) -> float:
            params = {
                "n_estimators": trial.suggest_int("n_estimators", 100, 400),
                "max_depth": trial.suggest_int("max_depth", 3, 8),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
                "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
                "gamma": trial.suggest_float("gamma", 0.0, 1.0),
                "eval_metric": "logloss",
                "use_label_encoder": False,
            }
            pipeline = build_pipeline(params)
            cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
            scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1", n_jobs=-1)
            return scores.mean()

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=40, show_progress_bar=False)
        best = study.best_params
        best["eval_metric"] = "logloss"
        best["use_label_encoder"] = False
        print(f"Optuna best F1 (CV): {study.best_value:.4f}, params: {best}")
        return best

    except ImportError:
        print("Optuna not installed — using GridSearchCV fallback")
        return _grid_search(X_train, y_train)


def _grid_search(X_train: pd.DataFrame, y_train: pd.Series) -> dict:
    from sklearn.model_selection import GridSearchCV

    param_grid = {
        "classifier__n_estimators": [100, 200, 300],
        "classifier__max_depth": [3, 5, 7],
        "classifier__learning_rate": [0.05, 0.1, 0.2],
        "classifier__subsample": [0.8, 1.0],
    }
    base_params = {
        "eval_metric": "logloss",
        "use_label_encoder": False,
        "colsample_bytree": 0.8,
    }
    pipeline = build_pipeline(base_params)
    gs = GridSearchCV(
        pipeline, param_grid,
        cv=5, scoring="f1", n_jobs=-1, verbose=0,
    )
    gs.fit(X_train, y_train)
    best = gs.best_params_
    # Strip "classifier__" prefix
    return {
        k.replace("classifier__", ""): v for k, v in best.items()
    } | {"eval_metric": "logloss", "use_label_encoder": False, "colsample_bytree": 0.8}


# ── Main training function ────────────────────────────────────────────────────

def train(mlflow_uri: str = "http://localhost:5000") -> None:
    mlflow.set_tracking_uri(mlflow_uri)
    mlflow.set_experiment(EXPERIMENT_NAME)

    df = prepare_dataset()
    X = df.drop(columns=["target", "source"], errors="ignore")
    y = df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42,
    )

    print(f"Train: {len(X_train)}, Test: {len(X_test)}")
    print("Tuning hyperparameters...")
    best_params = _tune_hyperparams(X_train, y_train)
    pipeline = build_pipeline(best_params)

    with mlflow.start_run(run_name="cardiology_v2"):
        mlflow.log_params(best_params)
        mlflow.log_param("model_version", "cardiology_v2")
        mlflow.log_param("features", str(ALL_FEATURES))
        mlflow.log_param("n_train", len(X_train))
        mlflow.log_param("n_test", len(X_test))
        mlflow.log_param("sources", str(df["source"].unique().tolist()) if "source" in df else "uci")

        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1")
        mlflow.log_metric("cv_f1_mean", cv_scores.mean())
        mlflow.log_metric("cv_f1_std", cv_scores.std())

        pipeline.fit(X_train, y_train)

        y_pred = pipeline.predict(X_test)
        y_proba = pipeline.predict_proba(X_test)[:, 1]

        metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred, zero_division=0),
            "recall": recall_score(y_test, y_pred, zero_division=0),
            "f1": f1_score(y_test, y_pred, zero_division=0),
            "roc_auc": roc_auc_score(y_test, y_proba),
        }
        mlflow.log_metrics(metrics)
        print(f"\nTest metrics: {metrics}")
        print(classification_report(y_test, y_pred))

        # Log confusion matrix as artifact
        _log_confusion_matrix(y_test, y_pred)

        # Log feature importances
        _log_feature_importances(pipeline)

        mlflow.sklearn.log_model(
            sk_model=pipeline,
            artifact_path="model",
            registered_model_name=MODEL_REGISTRY_NAME,
        )
        mlflow.set_tag("stage", "v2")
        mlflow.set_tag("model_type", "xgboost")
        mlflow.set_tag("feature_set", "11_features_no_ca_thal")

    client = mlflow.MlflowClient()
    versions = client.search_model_versions(f"name='{MODEL_REGISTRY_NAME}'")
    latest = max(int(v.version) for v in versions)
    client.set_registered_model_alias(MODEL_REGISTRY_NAME, "champion", str(latest))
    print(f"cardiology_v2 registered as version {latest} and promoted to 'champion'")


def retrain_with_feedback(
    mlflow_uri: str = "http://localhost:5000",
    extra_samples: Optional[list[dict]] = None,
) -> dict:
    """Retrain with doctor feedback. Deploy only if F1 improves."""
    mlflow.set_tracking_uri(mlflow_uri)
    mlflow.set_experiment(EXPERIMENT_NAME)

    old_f1 = _get_champion_f1(mlflow_uri)

    df = prepare_dataset(extra_samples=extra_samples or [])
    X = df.drop(columns=["target", "source"], errors="ignore")
    y = df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42,
    )

    best_params = _tune_hyperparams(X_train, y_train)
    pipeline = build_pipeline(best_params)

    with mlflow.start_run(run_name="cardiology_retrain_feedback"):
        mlflow.log_params(best_params)
        mlflow.log_param("feedback_samples", len(extra_samples or []))
        mlflow.log_param("n_train", len(X_train))
        mlflow.log_param("n_test", len(X_test))

        pipeline.fit(X_train, y_train)

        y_pred = pipeline.predict(X_test)
        y_proba = pipeline.predict_proba(X_test)[:, 1]

        new_f1 = f1_score(y_test, y_pred, zero_division=0)
        metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred, zero_division=0),
            "recall": recall_score(y_test, y_pred, zero_division=0),
            "f1": new_f1,
            "roc_auc": roc_auc_score(y_test, y_proba),
        }
        mlflow.log_metrics(metrics)
        mlflow.log_metric("old_champion_f1", old_f1 or 0.0)

        deployed = False
        if old_f1 is None or new_f1 > old_f1:
            mlflow.sklearn.log_model(
                sk_model=pipeline,
                artifact_path="model",
                registered_model_name=MODEL_REGISTRY_NAME,
            )
            mlflow.set_tag("stage", "promoted")

            client = mlflow.MlflowClient()
            versions = client.search_model_versions(f"name='{MODEL_REGISTRY_NAME}'")
            latest = max(int(v.version) for v in versions)
            client.set_registered_model_alias(MODEL_REGISTRY_NAME, "champion", str(latest))
            deployed = True
            print(f"New model F1={new_f1:.4f} > old F1={old_f1:.4f} → deployed as champion v{latest}")
        else:
            mlflow.set_tag("stage", "rejected")
            print(f"New model F1={new_f1:.4f} ≤ old F1={old_f1:.4f} → NOT deployed")

    return {
        "status": "ok",
        "message": f"New F1={new_f1:.4f}, champion F1={old_f1:.4f}. Deployed: {deployed}",
        "new_f1": new_f1,
        "old_f1": old_f1,
        "deployed": deployed,
    }


def _get_champion_f1(mlflow_uri: str) -> float | None:
    try:
        client = mlflow.MlflowClient(tracking_uri=mlflow_uri)
        alias_version = client.get_model_version_by_alias(MODEL_REGISTRY_NAME, "champion")
        run = client.get_run(alias_version.run_id)
        return run.data.metrics.get("f1")
    except Exception:
        return None


def _log_confusion_matrix(y_test, y_pred) -> None:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(6, 5))
        ConfusionMatrixDisplay.from_predictions(y_test, y_pred, ax=ax)
        ax.set_title("Confusion Matrix — Cardiology Model")
        tmp = Path("/tmp/confusion_matrix.png")
        fig.savefig(tmp, bbox_inches="tight")
        plt.close(fig)
        mlflow.log_artifact(str(tmp), artifact_path="plots")
    except Exception as exc:
        print(f"  Could not log confusion matrix: {exc}")


def _log_feature_importances(pipeline: Pipeline) -> None:
    try:
        classifier = pipeline.named_steps["classifier"]
        if not hasattr(classifier, "feature_importances_"):
            return
        preprocessor = pipeline.named_steps["preprocessor"]
        if hasattr(preprocessor, "get_feature_names_out"):
            names = list(preprocessor.get_feature_names_out())
        else:
            names = ALL_FEATURES
        importances = classifier.feature_importances_
        importance_dict = dict(zip(names, importances.tolist()))

        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        sorted_items = sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
        feat_names, feat_vals = zip(*sorted_items[:15])
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.barh(range(len(feat_names)), feat_vals)
        ax.set_yticks(range(len(feat_names)))
        ax.set_yticklabels(feat_names, fontsize=9)
        ax.set_title("Feature Importances")
        ax.invert_yaxis()
        tmp = Path("/tmp/feature_importances.png")
        fig.savefig(tmp, bbox_inches="tight")
        plt.close(fig)
        mlflow.log_artifact(str(tmp), artifact_path="plots")
        mlflow.log_dict(importance_dict, "feature_importances.json")
    except Exception as exc:
        print(f"  Could not log feature importances: {exc}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mlflow-uri", default="http://localhost:5000")
    args = parser.parse_args()
    train(mlflow_uri=args.mlflow_uri)
