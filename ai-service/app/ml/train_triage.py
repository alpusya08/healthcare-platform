"""
Train XGBoost triage classifier (ROUTINE / URGENT / EMERGENCY).

Features (12 general medical features extracted from patient dialogue):
  age, sex, symptom_duration_days, pain_severity, onset_type,
  is_worsening, affects_daily_activity, has_chronic_conditions,
  takes_medications, prior_similar_episode, associated_symptoms_count,
  red_flag_present

Target: triage_level  0=ROUTINE  1=URGENT  2=EMERGENCY

Real-world triage distribution (based on MTS/ESI studies):
  ROUTINE   ~62%
  URGENT    ~28%
  EMERGENCY ~10%

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


# ── Clinical triage rules (Manchester Triage System + ESI principles) ──────────

def _triage_label(row: dict) -> int:
    """
    Deterministic triage rule based on:
    - Manchester Triage System (MTS)
    - Emergency Severity Index (ESI)
    - Clinical guidelines for common presentations
    """
    sev = row["pain_severity"]
    red = row["red_flag_present"]
    onset = row["onset_type"]          # 1=sudden, 0=gradual
    worsening = row["is_worsening"]
    adl = row["affects_daily_activity"]
    dur = row["symptom_duration_days"]
    assoc = row["associated_symptoms_count"]
    chronic = row["has_chronic_conditions"]
    age = row["age"]

    # ── EMERGENCY criteria ──────────────────────────────────────────────────────

    # Red flag + sudden onset = potentially life-threatening
    if red == 1 and onset == 1:
        return 2

    # Severe acute pain (9-10/10) — cardiac, surgical, neurological emergency
    if sev >= 9:
        return 2

    # Thunderclap onset with high severity — subarachnoid hemorrhage pattern
    if sev >= 8 and onset == 1 and dur <= 1:
        return 2

    # Rapidly worsening severe pain — acute abdomen, aortic dissection
    if sev >= 8 and worsening == 1 and onset == 1:
        return 2

    # Elderly with sudden severe symptom + multiple associated symptoms
    if age >= 65 and sev >= 8 and assoc >= 4:
        return 2

    # Red flag in children — potentially sepsis, meningitis
    if age <= 5 and red == 1 and sev >= 6:
        return 2

    # Extreme severity regardless of other factors
    if sev == 10:
        return 2

    # High severity + red flag (even without sudden onset)
    if red == 1 and sev >= 7:
        return 2

    # ── URGENT criteria ─────────────────────────────────────────────────────────

    # Significant pain affecting daily life
    if sev >= 7:
        return 1

    # Moderate-severe worsening pain
    if sev >= 5 and worsening == 1:
        return 1

    # Pain affecting daily activity at moderate severity
    if adl == 1 and sev >= 5:
        return 1

    # Multiple associated symptoms with moderate pain — systemic illness
    if assoc >= 4 and sev >= 4:
        return 1

    # Sudden onset, short duration, moderate-severe — acute episode
    if onset == 1 and dur <= 2 and sev >= 5:
        return 1

    # Red flag with moderate symptoms
    if red == 1 and sev >= 3:
        return 1

    # Chronic condition decompensation
    if chronic == 1 and sev >= 6 and worsening == 1:
        return 1

    # Elderly with moderate symptoms + multiple complaints
    if age >= 70 and sev >= 5 and assoc >= 3:
        return 1

    # Child with moderate-high fever-equivalent (pain 5+ and multiple symptoms)
    if age <= 12 and sev >= 5 and assoc >= 3:
        return 1

    # Prolonged moderate symptoms not improving
    if dur >= 14 and sev >= 5 and worsening == 1:
        return 1

    # Multiple associated symptoms with ADL impairment
    if assoc >= 5 and adl == 1:
        return 1

    # Worsening with many symptoms even at lower severity
    if worsening == 1 and assoc >= 4 and sev >= 4:
        return 1

    return 0


# ── Clinical scenario generators ───────────────────────────────────────────────

def _scenario_cardiac(rng: np.random.Generator, triage: int) -> dict:
    """Chest pain / cardiac presentations."""
    if triage == 2:  # EMERGENCY: ACS, STEMI pattern
        return {
            "age": int(rng.integers(45, 80)),
            "sex": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "symptom_duration_days": int(rng.choice([0, 1])),
            "pain_severity": int(rng.integers(7, 11)),
            "onset_type": 1,
            "is_worsening": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "takes_medications": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "associated_symptoms_count": int(rng.integers(3, 7)),
            "red_flag_present": 1,
        }
    elif triage == 1:  # URGENT: unstable angina pattern
        return {
            "age": int(rng.integers(40, 75)),
            "sex": int(rng.choice([0, 1], p=[0.35, 0.65])),
            "symptom_duration_days": int(rng.choice([0, 1, 2, 3])),
            "pain_severity": int(rng.integers(5, 8)),
            "onset_type": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "is_worsening": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "takes_medications": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "associated_symptoms_count": int(rng.integers(2, 5)),
            "red_flag_present": int(rng.choice([0, 1], p=[0.5, 0.5])),
        }
    else:  # ROUTINE: musculoskeletal chest pain
        return {
            "age": int(rng.integers(20, 60)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(2, 30)),
            "pain_severity": int(rng.integers(2, 6)),
            "onset_type": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "is_worsening": 0,
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.8, 0.2])),
            "takes_medications": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "associated_symptoms_count": int(rng.integers(0, 3)),
            "red_flag_present": 0,
        }


def _scenario_neurological(rng: np.random.Generator, triage: int) -> dict:
    """Headache / neurological presentations."""
    if triage == 2:  # EMERGENCY: thunderclap, stroke
        return {
            "age": int(rng.integers(30, 80)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": 0,
            "pain_severity": int(rng.integers(8, 11)),
            "onset_type": 1,
            "is_worsening": 1,
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "takes_medications": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "prior_similar_episode": 0,
            "associated_symptoms_count": int(rng.integers(3, 7)),
            "red_flag_present": 1,
        }
    elif triage == 1:  # URGENT: severe migraine, TIA
        return {
            "age": int(rng.integers(20, 65)),
            "sex": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "symptom_duration_days": int(rng.choice([0, 1, 2])),
            "pain_severity": int(rng.integers(6, 9)),
            "onset_type": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "is_worsening": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "takes_medications": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "associated_symptoms_count": int(rng.integers(2, 5)),
            "red_flag_present": int(rng.choice([0, 1], p=[0.6, 0.4])),
        }
    else:  # ROUTINE: tension headache, chronic migraine
        return {
            "age": int(rng.integers(18, 55)),
            "sex": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "symptom_duration_days": int(rng.integers(1, 14)),
            "pain_severity": int(rng.integers(2, 6)),
            "onset_type": 0,
            "is_worsening": 0,
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "takes_medications": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "prior_similar_episode": 1,
            "associated_symptoms_count": int(rng.integers(0, 3)),
            "red_flag_present": 0,
        }


def _scenario_abdominal(rng: np.random.Generator, triage: int) -> dict:
    """Abdominal pain — appendicitis, peritonitis, bowel obstruction."""
    if triage == 2:  # EMERGENCY: peritonitis, severe acute abdomen
        return {
            "age": int(rng.integers(10, 80)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.choice([0, 1, 2])),
            "pain_severity": int(rng.integers(8, 11)),
            "onset_type": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "is_worsening": 1,
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "takes_medications": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "prior_similar_episode": 0,
            "associated_symptoms_count": int(rng.integers(3, 7)),
            "red_flag_present": 1,
        }
    elif triage == 1:  # URGENT: appendicitis (early), cholecystitis
        return {
            "age": int(rng.integers(15, 65)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.choice([0, 1, 2, 3])),
            "pain_severity": int(rng.integers(5, 9)),
            "onset_type": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "is_worsening": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "takes_medications": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "associated_symptoms_count": int(rng.integers(2, 5)),
            "red_flag_present": int(rng.choice([0, 1], p=[0.5, 0.5])),
        }
    else:  # ROUTINE: IBS, gastritis, functional pain
        return {
            "age": int(rng.integers(18, 60)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(2, 60)),
            "pain_severity": int(rng.integers(1, 5)),
            "onset_type": 0,
            "is_worsening": 0,
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "takes_medications": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "prior_similar_episode": 1,
            "associated_symptoms_count": int(rng.integers(0, 3)),
            "red_flag_present": 0,
        }


def _scenario_respiratory(rng: np.random.Generator, triage: int) -> dict:
    """Respiratory presentations — dyspnea, pneumonia, PE."""
    if triage == 2:  # EMERGENCY: PE, severe asthma, pneumothorax
        return {
            "age": int(rng.integers(20, 75)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.choice([0, 1])),
            "pain_severity": int(rng.integers(6, 11)),
            "onset_type": 1,
            "is_worsening": 1,
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "takes_medications": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "associated_symptoms_count": int(rng.integers(3, 6)),
            "red_flag_present": 1,
        }
    elif triage == 1:  # URGENT: pneumonia, moderate asthma
        return {
            "age": int(rng.integers(15, 70)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(1, 7)),
            "pain_severity": int(rng.integers(4, 8)),
            "onset_type": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "is_worsening": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "takes_medications": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "associated_symptoms_count": int(rng.integers(2, 5)),
            "red_flag_present": int(rng.choice([0, 1], p=[0.5, 0.5])),
        }
    else:  # ROUTINE: URTI, mild bronchitis
        return {
            "age": int(rng.integers(5, 65)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(1, 14)),
            "pain_severity": int(rng.integers(1, 5)),
            "onset_type": 0,
            "is_worsening": 0,
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "takes_medications": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "prior_similar_episode": 1,
            "associated_symptoms_count": int(rng.integers(1, 4)),
            "red_flag_present": 0,
        }


def _scenario_trauma(rng: np.random.Generator, triage: int) -> dict:
    """Trauma / injury presentations."""
    if triage == 2:  # EMERGENCY: major trauma, head injury
        return {
            "age": int(rng.integers(15, 75)),
            "sex": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "symptom_duration_days": 0,
            "pain_severity": int(rng.integers(7, 11)),
            "onset_type": 1,
            "is_worsening": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "takes_medications": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "prior_similar_episode": 0,
            "associated_symptoms_count": int(rng.integers(3, 7)),
            "red_flag_present": 1,
        }
    elif triage == 1:  # URGENT: fractures, significant lacerations
        return {
            "age": int(rng.integers(10, 70)),
            "sex": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "symptom_duration_days": int(rng.choice([0, 1])),
            "pain_severity": int(rng.integers(5, 9)),
            "onset_type": 1,
            "is_worsening": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "takes_medications": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "prior_similar_episode": 0,
            "associated_symptoms_count": int(rng.integers(1, 4)),
            "red_flag_present": int(rng.choice([0, 1], p=[0.5, 0.5])),
        }
    else:  # ROUTINE: sprains, minor injuries
        return {
            "age": int(rng.integers(10, 65)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(0, 7)),
            "pain_severity": int(rng.integers(2, 6)),
            "onset_type": 1,
            "is_worsening": 0,
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.8, 0.2])),
            "takes_medications": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "associated_symptoms_count": int(rng.integers(0, 3)),
            "red_flag_present": 0,
        }


def _scenario_pediatric(rng: np.random.Generator, triage: int) -> dict:
    """Pediatric presentations — children 0–14."""
    if triage == 2:  # EMERGENCY: febrile seizure, meningitis, severe dehydration
        return {
            "age": int(rng.integers(0, 10)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.choice([0, 1])),
            "pain_severity": int(rng.integers(7, 11)),
            "onset_type": 1,
            "is_worsening": 1,
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "takes_medications": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "associated_symptoms_count": int(rng.integers(3, 7)),
            "red_flag_present": 1,
        }
    elif triage == 1:  # URGENT: high fever, moderate illness
        return {
            "age": int(rng.integers(1, 14)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(1, 5)),
            "pain_severity": int(rng.integers(4, 8)),
            "onset_type": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "is_worsening": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "takes_medications": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "associated_symptoms_count": int(rng.integers(2, 5)),
            "red_flag_present": int(rng.choice([0, 1], p=[0.5, 0.5])),
        }
    else:  # ROUTINE: URTI, mild gastro
        return {
            "age": int(rng.integers(2, 14)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(1, 7)),
            "pain_severity": int(rng.integers(1, 5)),
            "onset_type": 0,
            "is_worsening": 0,
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.8, 0.2])),
            "takes_medications": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "prior_similar_episode": 1,
            "associated_symptoms_count": int(rng.integers(1, 4)),
            "red_flag_present": 0,
        }


def _scenario_geriatric(rng: np.random.Generator, triage: int) -> dict:
    """Geriatric presentations — elderly 65+, often atypical."""
    if triage == 2:  # EMERGENCY: silent MI, stroke, sepsis in elderly
        return {
            "age": int(rng.integers(70, 95)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.choice([0, 1, 2])),
            "pain_severity": int(rng.integers(5, 10)),
            "onset_type": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "is_worsening": 1,
            "affects_daily_activity": 1,
            "has_chronic_conditions": 1,
            "takes_medications": 1,
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "associated_symptoms_count": int(rng.integers(3, 7)),
            "red_flag_present": 1,
        }
    elif triage == 1:  # URGENT: decompensated chronic disease
        return {
            "age": int(rng.integers(65, 85)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(1, 7)),
            "pain_severity": int(rng.integers(4, 8)),
            "onset_type": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "is_worsening": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "affects_daily_activity": 1,
            "has_chronic_conditions": 1,
            "takes_medications": 1,
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "associated_symptoms_count": int(rng.integers(2, 5)),
            "red_flag_present": int(rng.choice([0, 1], p=[0.5, 0.5])),
        }
    else:  # ROUTINE: stable chronic complaints
        return {
            "age": int(rng.integers(65, 80)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(7, 90)),
            "pain_severity": int(rng.integers(2, 5)),
            "onset_type": 0,
            "is_worsening": 0,
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "has_chronic_conditions": 1,
            "takes_medications": 1,
            "prior_similar_episode": 1,
            "associated_symptoms_count": int(rng.integers(1, 4)),
            "red_flag_present": 0,
        }


def _scenario_musculoskeletal(rng: np.random.Generator, triage: int) -> dict:
    """Back pain, joint pain, musculoskeletal."""
    if triage == 2:
        return {
            "age": int(rng.integers(30, 70)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.choice([0, 1])),
            "pain_severity": int(rng.integers(9, 11)),
            "onset_type": 1,
            "is_worsening": 1,
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "takes_medications": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "associated_symptoms_count": int(rng.integers(2, 5)),
            "red_flag_present": 1,
        }
    elif triage == 1:
        return {
            "age": int(rng.integers(25, 70)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(0, 7)),
            "pain_severity": int(rng.integers(5, 8)),
            "onset_type": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "is_worsening": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "takes_medications": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "associated_symptoms_count": int(rng.integers(1, 4)),
            "red_flag_present": int(rng.choice([0, 1], p=[0.7, 0.3])),
        }
    else:
        return {
            "age": int(rng.integers(20, 65)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(3, 90)),
            "pain_severity": int(rng.integers(1, 5)),
            "onset_type": 0,
            "is_worsening": 0,
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "takes_medications": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "prior_similar_episode": 1,
            "associated_symptoms_count": int(rng.integers(0, 3)),
            "red_flag_present": 0,
        }


def _scenario_mental_health(rng: np.random.Generator, triage: int) -> dict:
    """Mental health / psychiatric presentations."""
    if triage == 2:
        return {
            "age": int(rng.integers(18, 50)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.choice([0, 1])),
            "pain_severity": int(rng.integers(7, 10)),
            "onset_type": 1,
            "is_worsening": 1,
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "takes_medications": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "associated_symptoms_count": int(rng.integers(3, 6)),
            "red_flag_present": 1,
        }
    elif triage == 1:
        return {
            "age": int(rng.integers(18, 55)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(1, 14)),
            "pain_severity": int(rng.integers(5, 8)),
            "onset_type": 0,
            "is_worsening": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "takes_medications": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "associated_symptoms_count": int(rng.integers(2, 5)),
            "red_flag_present": 0,
        }
    else:
        return {
            "age": int(rng.integers(18, 60)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(7, 60)),
            "pain_severity": int(rng.integers(2, 5)),
            "onset_type": 0,
            "is_worsening": 0,
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "takes_medications": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "prior_similar_episode": 1,
            "associated_symptoms_count": int(rng.integers(1, 4)),
            "red_flag_present": 0,
        }


def _scenario_general(rng: np.random.Generator, triage: int) -> dict:
    """General / mixed presentations."""
    if triage == 2:
        sev = int(rng.integers(8, 11))
        return {
            "age": int(rng.integers(5, 90)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.choice([0, 1, 2])),
            "pain_severity": sev,
            "onset_type": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "is_worsening": 1,
            "affects_daily_activity": 1,
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "takes_medications": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "associated_symptoms_count": int(rng.integers(3, 7)),
            "red_flag_present": int(rng.choice([0, 1], p=[0.2, 0.8])),
        }
    elif triage == 1:
        return {
            "age": int(rng.integers(10, 80)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(0, 10)),
            "pain_severity": int(rng.integers(5, 8)),
            "onset_type": int(rng.integers(0, 2)),
            "is_worsening": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.3, 0.7])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "takes_medications": int(rng.choice([0, 1], p=[0.5, 0.5])),
            "prior_similar_episode": int(rng.integers(0, 2)),
            "associated_symptoms_count": int(rng.integers(2, 5)),
            "red_flag_present": int(rng.choice([0, 1], p=[0.5, 0.5])),
        }
    else:
        return {
            "age": int(rng.integers(18, 70)),
            "sex": int(rng.integers(0, 2)),
            "symptom_duration_days": int(rng.integers(1, 30)),
            "pain_severity": int(rng.integers(1, 5)),
            "onset_type": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "is_worsening": 0,
            "affects_daily_activity": int(rng.choice([0, 1], p=[0.7, 0.3])),
            "has_chronic_conditions": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "takes_medications": int(rng.choice([0, 1], p=[0.6, 0.4])),
            "prior_similar_episode": int(rng.choice([0, 1], p=[0.4, 0.6])),
            "associated_symptoms_count": int(rng.integers(0, 3)),
            "red_flag_present": 0,
        }


_SCENARIO_GENERATORS = [
    _scenario_cardiac,
    _scenario_neurological,
    _scenario_abdominal,
    _scenario_respiratory,
    _scenario_trauma,
    _scenario_pediatric,
    _scenario_geriatric,
    _scenario_musculoskeletal,
    _scenario_mental_health,
    _scenario_general,
]

# Weights: general scenarios are most common
_SCENARIO_WEIGHTS = [0.12, 0.12, 0.12, 0.10, 0.08, 0.08, 0.10, 0.12, 0.06, 0.10]


def generate_synthetic_dataset(n_samples: int = 15000, seed: int = 42) -> pd.DataFrame:
    """
    Generate clinically realistic synthetic dataset.

    Class distribution targets (based on real ED studies):
      EMERGENCY ~10%, URGENT ~28%, ROUTINE ~62%
    """
    rng = np.random.default_rng(seed)
    rows = []

    # Pre-assign triage levels with realistic distribution
    n_emergency = int(n_samples * 0.10)
    n_urgent = int(n_samples * 0.28)
    n_routine = n_samples - n_emergency - n_urgent

    triage_assignments = (
        [2] * n_emergency +
        [1] * n_urgent +
        [0] * n_routine
    )
    rng.shuffle(triage_assignments)

    scenario_weights = np.array(_SCENARIO_WEIGHTS)
    scenario_weights /= scenario_weights.sum()

    for triage in triage_assignments:
        scenario_fn = rng.choice(_SCENARIO_GENERATORS, p=scenario_weights)
        row = scenario_fn(rng, triage)

        # Verify the label matches our deterministic rules
        computed_triage = _triage_label(row)

        # If the scenario produced inconsistent features, use computed label
        # (this handles edge cases and adds realistic noise)
        if computed_triage != triage and rng.random() > 0.08:
            row[TARGET] = computed_triage
        else:
            row[TARGET] = triage

        rows.append(row)

    df = pd.DataFrame(rows)
    dist = df[TARGET].value_counts().sort_index().to_dict()
    print(
        f"Generated {len(df)} samples — "
        f"ROUTINE={dist.get(0, 0)} ({dist.get(0, 0)/len(df)*100:.1f}%), "
        f"URGENT={dist.get(1, 0)} ({dist.get(1, 0)/len(df)*100:.1f}%), "
        f"EMERGENCY={dist.get(2, 0)} ({dist.get(2, 0)/len(df)*100:.1f}%)"
    )
    return df


def load_or_generate_dataset(extra_samples: Optional[list[dict]] = None) -> pd.DataFrame:
    data_dir = Path(__file__).resolve().parents[3] / "data" / "raw"
    data_dir.mkdir(parents=True, exist_ok=True)
    cache_path = data_dir / "triage_synthetic.csv"

    # Always regenerate if cache is small (old 3k dataset)
    if cache_path.exists():
        base_df = pd.read_csv(cache_path)
        if len(base_df) < 10000:
            print(f"Cache has only {len(base_df)} rows — regenerating with full dataset...")
            base_df = generate_synthetic_dataset(n_samples=15000)
            base_df.to_csv(cache_path, index=False)
        else:
            print(f"Loaded cached synthetic dataset: {len(base_df)} rows from {cache_path}")
    else:
        base_df = generate_synthetic_dataset(n_samples=15000)
        base_df.to_csv(cache_path, index=False)
        print(f"Saved synthetic dataset to {cache_path}")

    parts = [base_df]

    if extra_samples:
        fb_df = pd.DataFrame(extra_samples)
        for col in ALL_FEATURES:
            if col not in fb_df.columns:
                fb_df[col] = np.nan
        if TARGET in fb_df.columns:
            parts.append(fb_df[ALL_FEATURES + [TARGET]])
            print(f"Added {len(fb_df)} feedback samples from doctors")

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
        "n_estimators": 300,
        "max_depth": 6,
        "learning_rate": 0.08,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 3,
        "gamma": 0.1,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
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

    with mlflow.start_run(run_name="triage_v2_clinical_scenarios"):
        mlflow.log_params(params)
        mlflow.log_param("features", ALL_FEATURES)
        mlflow.log_param("n_train", len(X_train))
        mlflow.log_param("n_test", len(X_test))
        mlflow.log_param("target_classes", list(_TRIAGE_CODES.values()))
        mlflow.log_param("dataset_version", "v2_15k_clinical_scenarios")
        mlflow.log_param("triage_standard", "Manchester_Triage_System_ESI")

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
        mlflow.set_tag("scenarios", "cardiac,neurological,abdominal,respiratory,trauma,pediatric,geriatric,musculoskeletal,mental_health,general")

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
        print("Top features:", sorted(importance_dict.items(), key=lambda x: -x[1])[:5])
    except Exception as exc:
        print(f"Could not log feature importances: {exc}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mlflow-uri", default="http://localhost:5000")
    args = parser.parse_args()
    train(mlflow_uri=args.mlflow_uri)
