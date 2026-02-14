"""Train XGBoost model for cardiology diagnosis on UCI Heart Disease dataset."""
from pathlib import Path

import mlflow
import mlflow.sklearn
import pandas as pd
import xgboost as xgb
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "uci_heart_disease.csv"
EXPERIMENT_NAME = "cardiology-diagnosis"

NUMERIC_FEATURES = ["age", "trestbps", "chol", "thalach", "oldpeak"]
CATEGORICAL_FEATURES = ["sex", "cp", "fbs", "restecg", "exang", "slope", "ca", "thal"]


def load_data(path: Path = DATA_PATH) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["target"] = (df["target"] > 0).astype(int)
    return df


def build_pipeline(params: dict) -> Pipeline:
    preprocessor = ColumnTransformer([
        ("num", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]), NUMERIC_FEATURES),
        ("cat", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
        ]), CATEGORICAL_FEATURES),
    ])

    return Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", xgb.XGBClassifier(**params)),
    ])


def train(mlflow_uri: str = "http://localhost:5000") -> None:
    mlflow.set_tracking_uri(mlflow_uri)
    mlflow.set_experiment(EXPERIMENT_NAME)

    df = load_data()
    X = df.drop(columns=["target"])
    y = df["target"]

    params = {
        "n_estimators": 200,
        "max_depth": 5,
        "learning_rate": 0.1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "random_state": 42,
        "eval_metric": "logloss",
        "use_label_encoder": False,
    }

    pipeline = build_pipeline(params)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42,
    )

    with mlflow.start_run():
        mlflow.log_params(params)
        mlflow.log_param("dataset", "UCI Heart Disease")
        mlflow.log_param("n_samples_train", len(X_train))
        mlflow.log_param("n_samples_test", len(X_test))

        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring="accuracy")
        mlflow.log_metric("cv_accuracy_mean", cv_scores.mean())
        mlflow.log_metric("cv_accuracy_std", cv_scores.std())

        pipeline.fit(X_train, y_train)

        y_pred = pipeline.predict(X_test)
        y_proba = pipeline.predict_proba(X_test)[:, 1]

        metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred),
            "recall": recall_score(y_test, y_pred),
            "f1": f1_score(y_test, y_pred),
            "roc_auc": roc_auc_score(y_test, y_proba),
        }
        mlflow.log_metrics(metrics)

        print(f"Test metrics: {metrics}")
        print(classification_report(y_test, y_pred))

        mlflow.sklearn.log_model(
            sk_model=pipeline,
            artifact_path="model",
            registered_model_name="cardiology-diagnosis",
        )

        mlflow.set_tag("stage", "baseline")
        mlflow.set_tag("model_type", "xgboost")

    print("Training complete. Model registered in MLflow.")


if __name__ == "__main__":
    train()
