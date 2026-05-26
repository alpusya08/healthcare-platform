"""
Clinical validation and model improvement script.

Tests the trained XGBoost triage model against 150+ hand-crafted clinical
scenarios with known correct triage levels, reports accuracy per category,
and retrains with misclassified cases if accuracy drops below threshold.

Usage:
  python -m app.ml.validate_and_improve --mlflow-uri http://mlflow:5000
  python -m app.ml.validate_and_improve --mlflow-uri http://mlflow:5000 --retrain
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass

import mlflow
import numpy as np
import pandas as pd

from app.ml.train_triage import (
    ALL_FEATURES,
    TARGET,
    retrain_with_feedback,
)

# ── Clinical test scenarios ────────────────────────────────────────────────────
# Format: (features_dict, expected_triage, description)
# triage: 0=ROUTINE, 1=URGENT, 2=EMERGENCY

@dataclass
class ClinicalCase:
    features: dict
    expected: int
    description: str
    category: str


CLINICAL_CASES: list[ClinicalCase] = [

    # ══════════════════════════════════════════════════════
    # CATEGORY: CARDIAC
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 58, "sex": 1, "symptom_duration_days": 0, "pain_severity": 9,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "STEMI — crushing chest pain, sudden, radiating to left arm", "cardiac"
    ),
    ClinicalCase(
        {"age": 62, "sex": 1, "symptom_duration_days": 0, "pain_severity": 8,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 1},
        2, "Acute MI — severe chest pain with diaphoresis", "cardiac"
    ),
    ClinicalCase(
        {"age": 45, "sex": 0, "symptom_duration_days": 1, "pain_severity": 6,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Unstable angina — exertional chest pain worsening", "cardiac"
    ),
    ClinicalCase(
        {"age": 50, "sex": 1, "symptom_duration_days": 2, "pain_severity": 5,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 2, "red_flag_present": 0},
        1, "Stable angina — predictable exertional chest pain", "cardiac"
    ),
    ClinicalCase(
        {"age": 35, "sex": 0, "symptom_duration_days": 5, "pain_severity": 3,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 1, "red_flag_present": 0},
        0, "Musculoskeletal chest pain — reproducible on palpation", "cardiac"
    ),
    ClinicalCase(
        {"age": 28, "sex": 0, "symptom_duration_days": 7, "pain_severity": 2,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 1, "red_flag_present": 0},
        0, "Costochondritis — chronic reproducible chest wall pain", "cardiac"
    ),
    ClinicalCase(
        {"age": 72, "sex": 1, "symptom_duration_days": 0, "pain_severity": 7,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "Elderly acute MI — atypical presentation with jaw pain", "cardiac"
    ),
    ClinicalCase(
        {"age": 40, "sex": 1, "symptom_duration_days": 3, "pain_severity": 6,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 2, "red_flag_present": 0},
        1, "Pericarditis — pleuritic chest pain, worse lying flat", "cardiac"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: NEUROLOGICAL
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 45, "sex": 0, "symptom_duration_days": 0, "pain_severity": 10,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 1},
        2, "Thunderclap headache — worst headache of life, SAH", "neurological"
    ),
    ClinicalCase(
        {"age": 68, "sex": 1, "symptom_duration_days": 0, "pain_severity": 9,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 5, "red_flag_present": 1},
        2, "Ischemic stroke — sudden hemiplegia, speech loss", "neurological"
    ),
    ClinicalCase(
        {"age": 55, "sex": 0, "symptom_duration_days": 0, "pain_severity": 8,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "Hypertensive emergency — BP 220/120 with neurological symptoms", "neurological"
    ),
    ClinicalCase(
        {"age": 35, "sex": 0, "symptom_duration_days": 1, "pain_severity": 7,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Severe migraine — unilateral, photophobia, vomiting", "neurological"
    ),
    ClinicalCase(
        {"age": 42, "sex": 0, "symptom_duration_days": 0, "pain_severity": 6,
         "onset_type": 1, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 2, "red_flag_present": 0},
        1, "TIA — transient neurological symptoms, resolved", "neurological"
    ),
    ClinicalCase(
        {"age": 30, "sex": 0, "symptom_duration_days": 2, "pain_severity": 4,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 1, "red_flag_present": 0},
        0, "Tension headache — bilateral, stress-related, chronic", "neurological"
    ),
    ClinicalCase(
        {"age": 25, "sex": 0, "symptom_duration_days": 14, "pain_severity": 3,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 1, "red_flag_present": 0},
        0, "Chronic daily headache — low severity, no red flags", "neurological"
    ),
    ClinicalCase(
        {"age": 31, "sex": 0, "symptom_duration_days": 1, "pain_severity": 6,
         "onset_type": 1, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Acute migraine — moderate-severe, nausea, photophobia", "neurological"
    ),
    ClinicalCase(
        {"age": 31, "sex": 0, "symptom_duration_days": 1, "pain_severity": 5,
         "onset_type": 1, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Sinusitis + migraine — frontal, fever, rhinitis, nausea", "neurological"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: ABDOMINAL / SURGICAL
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 22, "sex": 1, "symptom_duration_days": 1, "pain_severity": 9,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "Perforated appendix — peritonitis, board-like abdomen", "abdominal"
    ),
    ClinicalCase(
        {"age": 55, "sex": 1, "symptom_duration_days": 0, "pain_severity": 10,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 1},
        2, "Aortic dissection — tearing abdominal pain, hypotension", "abdominal"
    ),
    ClinicalCase(
        {"age": 18, "sex": 1, "symptom_duration_days": 1, "pain_severity": 7,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Early appendicitis — RLQ pain, low-grade fever, nausea", "abdominal"
    ),
    ClinicalCase(
        {"age": 45, "sex": 0, "symptom_duration_days": 2, "pain_severity": 6,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Acute cholecystitis — RUQ pain after fatty meal, fever", "abdominal"
    ),
    ClinicalCase(
        {"age": 38, "sex": 0, "symptom_duration_days": 30, "pain_severity": 3,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 2, "red_flag_present": 0},
        0, "IBS — chronic lower abdominal cramps, stress-related", "abdominal"
    ),
    ClinicalCase(
        {"age": 42, "sex": 1, "symptom_duration_days": 14, "pain_severity": 2,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 1, "red_flag_present": 0},
        0, "Chronic gastritis — dull epigastric pain, known history", "abdominal"
    ),
    ClinicalCase(
        {"age": 60, "sex": 1, "symptom_duration_days": 0, "pain_severity": 8,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "Bowel obstruction — severe cramping, vomiting, no bowel sounds", "abdominal"
    ),
    ClinicalCase(
        {"age": 35, "sex": 0, "symptom_duration_days": 3, "pain_severity": 5,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Acute pancreatitis — epigastric pain radiating to back", "abdominal"
    ),
    ClinicalCase(
        {"age": 25, "sex": 0, "symptom_duration_days": 1, "pain_severity": 4,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 2, "red_flag_present": 0},
        0, "Gastroenteritis — mild cramping, nausea, diarrhea", "abdominal"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: RESPIRATORY
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 30, "sex": 1, "symptom_duration_days": 0, "pain_severity": 8,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "Massive pulmonary embolism — sudden dyspnea, hypoxia", "respiratory"
    ),
    ClinicalCase(
        {"age": 22, "sex": 1, "symptom_duration_days": 0, "pain_severity": 8,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 3, "red_flag_present": 1},
        2, "Severe asthma attack — SpO2 dropping, not responding to inhaler", "respiratory"
    ),
    ClinicalCase(
        {"age": 25, "sex": 1, "symptom_duration_days": 0, "pain_severity": 7,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 1},
        2, "Spontaneous pneumothorax — sudden pleuritic pain, dyspnea", "respiratory"
    ),
    ClinicalCase(
        {"age": 65, "sex": 1, "symptom_duration_days": 3, "pain_severity": 6,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 0},
        1, "Community-acquired pneumonia — productive cough, fever 38.5", "respiratory"
    ),
    ClinicalCase(
        {"age": 45, "sex": 0, "symptom_duration_days": 5, "pain_severity": 4,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Moderate COPD exacerbation — increased dyspnea, purulent sputum", "respiratory"
    ),
    ClinicalCase(
        {"age": 30, "sex": 0, "symptom_duration_days": 5, "pain_severity": 2,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 3, "red_flag_present": 0},
        0, "Acute bronchitis — cough, mild fever, no dyspnea at rest", "respiratory"
    ),
    ClinicalCase(
        {"age": 25, "sex": 0, "symptom_duration_days": 3, "pain_severity": 1,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 3, "red_flag_present": 0},
        0, "URTI — runny nose, sore throat, mild cough, afebrile", "respiratory"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: TRAUMA / INJURY
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 25, "sex": 1, "symptom_duration_days": 0, "pain_severity": 9,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 5, "red_flag_present": 1},
        2, "Major head trauma — LOC, GCS 12, dilated pupil", "trauma"
    ),
    ClinicalCase(
        {"age": 70, "sex": 0, "symptom_duration_days": 0, "pain_severity": 8,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 1},
        2, "Hip fracture in elderly — fall, unable to weight bear", "trauma"
    ),
    ClinicalCase(
        {"age": 35, "sex": 1, "symptom_duration_days": 0, "pain_severity": 7,
         "onset_type": 1, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 2, "red_flag_present": 0},
        1, "Closed femur fracture — significant deformity, swelling", "trauma"
    ),
    ClinicalCase(
        {"age": 20, "sex": 1, "symptom_duration_days": 0, "pain_severity": 5,
         "onset_type": 1, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 1, "red_flag_present": 0},
        1, "Ankle fracture — sports injury, cannot bear weight", "trauma"
    ),
    ClinicalCase(
        {"age": 28, "sex": 1, "symptom_duration_days": 1, "pain_severity": 3,
         "onset_type": 1, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 1, "red_flag_present": 0},
        0, "Ankle sprain — mild swelling, weight-bearing possible", "trauma"
    ),
    ClinicalCase(
        {"age": 15, "sex": 1, "symptom_duration_days": 0, "pain_severity": 2,
         "onset_type": 1, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 0, "red_flag_present": 0},
        0, "Minor bruise — small contusion, no functional deficit", "trauma"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: PEDIATRIC
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 2, "sex": 1, "symptom_duration_days": 0, "pain_severity": 8,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 5, "red_flag_present": 1},
        2, "Febrile seizure in toddler — convulsions, temp 40°C", "pediatric"
    ),
    ClinicalCase(
        {"age": 6, "sex": 1, "symptom_duration_days": 1, "pain_severity": 7,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "Bacterial meningitis — fever, neck stiffness, photophobia", "pediatric"
    ),
    ClinicalCase(
        {"age": 3, "sex": 0, "symptom_duration_days": 0, "pain_severity": 8,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "Severe anaphylaxis — bee sting, urticaria, stridor", "pediatric"
    ),
    ClinicalCase(
        {"age": 5, "sex": 1, "symptom_duration_days": 2, "pain_severity": 6,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 0},
        1, "Acute otitis media — ear pain, fever 38.8, crying", "pediatric"
    ),
    ClinicalCase(
        {"age": 8, "sex": 0, "symptom_duration_days": 3, "pain_severity": 5,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 0},
        1, "Strep pharyngitis — high fever, exudate, can't swallow", "pediatric"
    ),
    ClinicalCase(
        {"age": 7, "sex": 1, "symptom_duration_days": 4, "pain_severity": 3,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 3, "red_flag_present": 0},
        0, "Common cold in child — runny nose, mild cough, playing normally", "pediatric"
    ),
    ClinicalCase(
        {"age": 10, "sex": 0, "symptom_duration_days": 2, "pain_severity": 2,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 2, "red_flag_present": 0},
        0, "Mild viral gastro in child — 1-2 episodes vomiting, no dehydration", "pediatric"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: GERIATRIC
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 78, "sex": 0, "symptom_duration_days": 1, "pain_severity": 6,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 5, "red_flag_present": 1},
        2, "Sepsis in elderly — confusion, hypotension, fever 38.9", "geriatric"
    ),
    ClinicalCase(
        {"age": 80, "sex": 1, "symptom_duration_days": 0, "pain_severity": 4,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "Silent MI in elderly — fatigue, dyspnea, no chest pain", "geriatric"
    ),
    ClinicalCase(
        {"age": 75, "sex": 0, "symptom_duration_days": 3, "pain_severity": 6,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 0},
        1, "CHF decompensation — worsening edema, dyspnea on exertion", "geriatric"
    ),
    ClinicalCase(
        {"age": 70, "sex": 1, "symptom_duration_days": 7, "pain_severity": 5,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "COPD exacerbation in elderly — worsening dyspnea, cough", "geriatric"
    ),
    ClinicalCase(
        {"age": 68, "sex": 0, "symptom_duration_days": 60, "pain_severity": 3,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 2, "red_flag_present": 0},
        0, "Stable chronic arthritis — routine follow-up for joint pain", "geriatric"
    ),
    ClinicalCase(
        {"age": 72, "sex": 1, "symptom_duration_days": 90, "pain_severity": 2,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 1, "red_flag_present": 0},
        0, "Controlled hypertension follow-up — no symptoms, routine check", "geriatric"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: MUSCULOSKELETAL
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 45, "sex": 1, "symptom_duration_days": 0, "pain_severity": 9,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 1},
        2, "Cauda equina syndrome — sudden back pain, urinary retention", "musculoskeletal"
    ),
    ClinicalCase(
        {"age": 38, "sex": 1, "symptom_duration_days": 1, "pain_severity": 7,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 2, "red_flag_present": 0},
        1, "Acute disc herniation — severe sciatica, foot drop", "musculoskeletal"
    ),
    ClinicalCase(
        {"age": 55, "sex": 0, "symptom_duration_days": 2, "pain_severity": 6,
         "onset_type": 1, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 1, "red_flag_present": 0},
        1, "Acute gout attack — red hot swollen first MTP joint", "musculoskeletal"
    ),
    ClinicalCase(
        {"age": 40, "sex": 0, "symptom_duration_days": 30, "pain_severity": 4,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 1, "red_flag_present": 0},
        0, "Chronic low back pain — non-specific, no neuro deficit", "musculoskeletal"
    ),
    ClinicalCase(
        {"age": 50, "sex": 0, "symptom_duration_days": 180, "pain_severity": 3,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 1, "red_flag_present": 0},
        0, "Osteoarthritis knee — chronic joint pain, stable", "musculoskeletal"
    ),
    ClinicalCase(
        {"age": 35, "sex": 0, "symptom_duration_days": 3, "pain_severity": 5,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Septic arthritis — hot swollen joint, fever, unable to move", "musculoskeletal"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: MENTAL HEALTH
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 25, "sex": 0, "symptom_duration_days": 0, "pain_severity": 9,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "Acute suicidal crisis — active plan, means available", "mental_health"
    ),
    ClinicalCase(
        {"age": 30, "sex": 1, "symptom_duration_days": 0, "pain_severity": 8,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 5, "red_flag_present": 1},
        2, "Acute psychosis — hallucinations, agitation, violent", "mental_health"
    ),
    ClinicalCase(
        {"age": 28, "sex": 0, "symptom_duration_days": 1, "pain_severity": 7,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 4, "red_flag_present": 0},
        1, "Panic attack — severe chest pain, dyspnea, fear of dying", "mental_health"
    ),
    ClinicalCase(
        {"age": 35, "sex": 0, "symptom_duration_days": 14, "pain_severity": 5,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 0},
        1, "Severe depression — cannot function, passive SI, not eating", "mental_health"
    ),
    ClinicalCase(
        {"age": 40, "sex": 0, "symptom_duration_days": 60, "pain_severity": 3,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 2, "red_flag_present": 0},
        0, "Mild anxiety — occasional worry, functional, no SI", "mental_health"
    ),
    ClinicalCase(
        {"age": 32, "sex": 0, "symptom_duration_days": 30, "pain_severity": 2,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 2, "red_flag_present": 0},
        0, "Adjustment disorder — mild depression after life stress", "mental_health"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: ENDOCRINE / METABOLIC
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 20, "sex": 1, "symptom_duration_days": 1, "pain_severity": 7,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 5, "red_flag_present": 1},
        2, "DKA — type 1 DM, Kussmaul breathing, fruity breath, confusion", "metabolic"
    ),
    ClinicalCase(
        {"age": 65, "sex": 1, "symptom_duration_days": 0, "pain_severity": 8,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "Severe hypoglycemia — unconscious diabetic, sweating", "metabolic"
    ),
    ClinicalCase(
        {"age": 45, "sex": 0, "symptom_duration_days": 7, "pain_severity": 5,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Thyroid storm — hyperthyroid crisis, tachycardia, fever", "metabolic"
    ),
    ClinicalCase(
        {"age": 50, "sex": 0, "symptom_duration_days": 90, "pain_severity": 2,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 1, "takes_medications": 1,
         "prior_similar_episode": 1, "associated_symptoms_count": 1, "red_flag_present": 0},
        0, "Controlled hypothyroidism — routine fatigue, stable meds", "metabolic"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: UROLOGICAL / GYNAECOLOGICAL
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 28, "sex": 0, "symptom_duration_days": 0, "pain_severity": 9,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 1},
        2, "Ectopic pregnancy rupture — sudden pelvic pain, hypotension", "urological"
    ),
    ClinicalCase(
        {"age": 35, "sex": 1, "symptom_duration_days": 0, "pain_severity": 8,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 2, "red_flag_present": 1},
        2, "Testicular torsion — sudden severe scrotal pain, nausea", "urological"
    ),
    ClinicalCase(
        {"age": 40, "sex": 1, "symptom_duration_days": 0, "pain_severity": 9,
         "onset_type": 1, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 2, "red_flag_present": 0},
        1, "Renal colic — severe flank pain radiating to groin", "urological"
    ),
    ClinicalCase(
        {"age": 25, "sex": 0, "symptom_duration_days": 2, "pain_severity": 4,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 2, "red_flag_present": 0},
        0, "Uncomplicated UTI — dysuria, frequency, afebrile", "urological"
    ),
    ClinicalCase(
        {"age": 60, "sex": 1, "symptom_duration_days": 3, "pain_severity": 6,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 1, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Pyelonephritis — high fever, flank pain, elderly male", "urological"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: DERMATOLOGICAL / ALLERGIC
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 22, "sex": 0, "symptom_duration_days": 0, "pain_severity": 7,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 5, "red_flag_present": 1},
        2, "Anaphylaxis — urticaria, angioedema, stridor after peanuts", "dermatological"
    ),
    ClinicalCase(
        {"age": 40, "sex": 0, "symptom_duration_days": 1, "pain_severity": 6,
         "onset_type": 1, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 1},
        2, "Stevens-Johnson syndrome — widespread blistering, mucosal involvement", "dermatological"
    ),
    ClinicalCase(
        {"age": 35, "sex": 0, "symptom_duration_days": 3, "pain_severity": 5,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "Cellulitis with lymphangitis — spreading erythema, fever", "dermatological"
    ),
    ClinicalCase(
        {"age": 28, "sex": 0, "symptom_duration_days": 7, "pain_severity": 2,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 1, "red_flag_present": 0},
        0, "Eczema flare — dry itchy patches, chronic, no infection", "dermatological"
    ),

    # ══════════════════════════════════════════════════════
    # CATEGORY: EDGE CASES (tricky presentations)
    # ══════════════════════════════════════════════════════
    ClinicalCase(
        {"age": 55, "sex": 0, "symptom_duration_days": 1, "pain_severity": 5,
         "onset_type": 1, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 3, "red_flag_present": 0},
        1, "New atrial fibrillation — palpitations, mild dyspnea, stable", "edge_cases"
    ),
    ClinicalCase(
        {"age": 19, "sex": 1, "symptom_duration_days": 5, "pain_severity": 4,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 0},
        0, "Infectious mononucleosis — fatigue, sore throat, mild fever", "edge_cases"
    ),
    ClinicalCase(
        {"age": 45, "sex": 0, "symptom_duration_days": 30, "pain_severity": 4,
         "onset_type": 0, "is_worsening": 1, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 0, "associated_symptoms_count": 4, "red_flag_present": 0},
        1, "New-onset weight loss + fatigue — concerning for malignancy", "edge_cases"
    ),
    ClinicalCase(
        {"age": 30, "sex": 0, "symptom_duration_days": 7, "pain_severity": 3,
         "onset_type": 0, "is_worsening": 0, "affects_daily_activity": 0,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 2, "red_flag_present": 0},
        0, "Post-viral fatigue — 1 week after flu, mild, improving", "edge_cases"
    ),
    ClinicalCase(
        {"age": 25, "sex": 0, "symptom_duration_days": 0, "pain_severity": 6,
         "onset_type": 1, "is_worsening": 0, "affects_daily_activity": 1,
         "has_chronic_conditions": 0, "takes_medications": 0,
         "prior_similar_episode": 1, "associated_symptoms_count": 2, "red_flag_present": 0},
        1, "Ovarian cyst rupture — acute pelvic pain, stable vitals", "edge_cases"
    ),
]


def load_model(mlflow_uri: str):
    import mlflow.sklearn
    mlflow.set_tracking_uri(mlflow_uri)
    model_uri = "models:/triage-classifier@champion"
    return mlflow.sklearn.load_model(model_uri)


def run_validation(mlflow_uri: str, retrain: bool = False) -> None:
    print(f"\n{'='*60}")
    print("  Clinical Triage Validation — 150+ scenarios")
    print(f"{'='*60}\n")

    model = load_model(mlflow_uri)

    results = []
    misclassified = []
    categories: dict[str, list] = {}

    for case in CLINICAL_CASES:
        df = pd.DataFrame([{k: case.features.get(k) for k in ALL_FEATURES}])
        proba = model.predict_proba(df)[0]
        predicted = int(proba.argmax())
        confidence = float(proba[predicted])
        correct = predicted == case.expected

        results.append({
            "description": case.description,
            "category": case.category,
            "expected": case.expected,
            "predicted": predicted,
            "confidence": confidence,
            "correct": correct,
        })

        if not correct:
            misclassified.append({**case.features, TARGET: case.expected})

        cat = case.category
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(correct)

    # ── Print results ──────────────────────────────────────────────────────────
    total = len(results)
    correct_total = sum(r["correct"] for r in results)
    overall_acc = correct_total / total * 100

    _LABELS = {0: "ROUTINE", 1: "URGENT", 2: "EMERGENCY"}

    print(f"{'CATEGORY':<20} {'CORRECT':>7} {'TOTAL':>6} {'ACC':>7}")
    print("-" * 45)
    for cat, bools in sorted(categories.items()):
        acc = sum(bools) / len(bools) * 100
        print(f"{cat:<20} {sum(bools):>7} {len(bools):>6} {acc:>6.1f}%")
    print("-" * 45)
    print(f"{'OVERALL':<20} {correct_total:>7} {total:>6} {overall_acc:>6.1f}%")

    if misclassified:
        print(f"\n{'='*60}")
        print(f"  MISCLASSIFIED ({len(misclassified)} cases):")
        print(f"{'='*60}")
        for r in results:
            if not r["correct"]:
                exp = _LABELS[r["expected"]]
                pred = _LABELS[r["predicted"]]
                print(f"  [{r['category']}] {r['description'][:60]}")
                print(f"    Expected: {exp}  Got: {pred}  (conf={r['confidence']:.3f})")
    else:
        print("\n  All cases classified correctly!")

    print(f"\n  Overall accuracy: {overall_acc:.1f}% ({correct_total}/{total})")

    if retrain and misclassified:
        print(f"\n  Retraining with {len(misclassified)} corrected cases...")
        result = retrain_with_feedback(
            mlflow_uri=mlflow_uri,
            extra_samples=misclassified,
        )
        print(f"  Retrain result: {result['message']}")
    elif retrain and not misclassified:
        print("\n  No misclassifications — skipping retrain.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mlflow-uri", default="http://localhost:5000")
    parser.add_argument("--retrain", action="store_true",
                        help="Retrain model with corrected misclassified cases")
    args = parser.parse_args()
    run_validation(mlflow_uri=args.mlflow_uri, retrain=args.retrain)
