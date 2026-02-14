"""Download UCI Heart Disease dataset for training."""
from pathlib import Path

import pandas as pd

UCI_URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def download_uci() -> None:
    columns = [
        "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
        "thalach", "exang", "oldpeak", "slope", "ca", "thal", "target",
    ]
    df = pd.read_csv(UCI_URL, names=columns, na_values="?")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "uci_heart_disease.csv"
    df.to_csv(output_path, index=False)
    print(f"UCI Heart Disease dataset: {len(df)} rows -> {output_path}")


if __name__ == "__main__":
    download_uci()
