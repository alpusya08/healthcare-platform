"""
Synthetic cardiology cases.

Each generator below encodes the clinical pattern of one cardiac condition
using standard textbook presentations (Harrison's, Robbins, Manchester Triage).

The features produced go through the standard preprocessor and are used to
train a multi-class XGBoost classifier (one per domain).
"""
from __future__ import annotations

import numpy as np

from app.ml.diagnosis.generators.base import (
    bern,
    build_domain_dataset,
    choice_p,
    empty_features,
    normal_int,
)
from app.ml.diagnosis.registry import CARDIOLOGY


# ── Per-diagnosis generators ────────────────────────────────────────────────────

def gen_htn_essential(r: np.random.Generator) -> dict:
    """Essential hypertension — usually asymptomatic or mild headache, chronic."""
    f = empty_features()
    f["age"] = normal_int(55, 12, 30, 85, r)
    f["sex"] = bern(0.5, r)
    f["symptom_duration_days"] = choice_p([30, 90, 180, 365, 730], [.15, .2, .25, .25, .15], r)
    f["pain_severity"] = choice_p([0, 1, 2, 3, 4], [.3, .25, .2, .15, .1], r)
    f["onset_type"] = 0   # gradual
    f["is_worsening"] = bern(0.2, r)
    f["affects_daily_activity"] = bern(0.15, r)
    f["has_chronic_conditions"] = bern(0.7, r)
    f["takes_medications"] = bern(0.6, r)
    f["prior_similar_episode"] = bern(0.5, r)
    f["associated_symptoms_count"] = choice_p([0, 1, 2, 3], [.4, .35, .2, .05], r)
    f["red_flag_present"] = bern(0.05, r)
    # Cardio-specific
    f["loc_head"] = bern(0.4, r)       # headaches with HTN
    f["loc_chest"] = bern(0.1, r)
    f["pain_character"] = choice_p([0, 1, 5], [.5, .3, .2], r)   # dull or pressing
    f["dizziness"] = bern(0.3, r)
    f["palpitations"] = bern(0.15, r)
    f["smoking"] = bern(0.3, r)
    f["alcohol_use"] = bern(0.3, r)
    f["family_history_similar"] = bern(0.5, r)
    return f


def gen_angina_stable(r: np.random.Generator) -> dict:
    """Stable angina — chest pain on exertion, relieved by rest, weeks of history."""
    f = empty_features()
    f["age"] = normal_int(62, 10, 45, 85, r)
    f["sex"] = bern(0.65, r)              # male predominance
    f["symptom_duration_days"] = choice_p([14, 30, 60, 120, 180], [.2, .3, .25, .15, .1], r)
    f["pain_severity"] = choice_p([3, 4, 5, 6, 7], [.1, .25, .35, .2, .1], r)
    f["onset_type"] = 0
    f["is_worsening"] = bern(0.3, r)
    f["affects_daily_activity"] = bern(0.6, r)
    f["has_chronic_conditions"] = bern(0.7, r)
    f["takes_medications"] = bern(0.6, r)
    f["prior_similar_episode"] = bern(0.7, r)
    f["associated_symptoms_count"] = choice_p([1, 2, 3, 4], [.2, .35, .3, .15], r)
    f["red_flag_present"] = bern(0.1, r)
    # Cardio-specific
    f["loc_chest"] = 1
    f["pain_character"] = 5               # pressing
    f["radiates"] = bern(0.6, r)         # to arm/jaw
    f["worse_on_exertion"] = 1
    f["relieved_by_rest"] = bern(0.85, r)
    f["shortness_of_breath"] = bern(0.4, r)
    f["nausea_vomiting"] = bern(0.15, r)
    f["smoking"] = bern(0.55, r)
    f["family_history_similar"] = bern(0.5, r)
    return f


def gen_mi_acute(r: np.random.Generator) -> dict:
    """Acute myocardial infarction — sudden severe chest pain, NOT relieved by rest."""
    f = empty_features()
    f["age"] = normal_int(62, 12, 35, 90, r)
    f["sex"] = bern(0.65, r)
    f["symptom_duration_days"] = choice_p([0, 1], [.85, .15], r)
    f["pain_severity"] = choice_p([7, 8, 9, 10], [.2, .35, .3, .15], r)
    f["onset_type"] = 1                   # sudden
    f["is_worsening"] = bern(0.8, r)
    f["affects_daily_activity"] = 1
    f["has_chronic_conditions"] = bern(0.55, r)
    f["takes_medications"] = bern(0.45, r)
    f["prior_similar_episode"] = bern(0.25, r)
    f["associated_symptoms_count"] = choice_p([3, 4, 5, 6], [.2, .35, .3, .15], r)
    f["red_flag_present"] = 1             # always a red flag
    # Cardio-specific
    f["loc_chest"] = 1
    f["pain_character"] = 5               # crushing/pressing
    f["radiates"] = bern(0.85, r)
    f["worse_on_exertion"] = bern(0.6, r)
    f["relieved_by_rest"] = bern(0.05, r)   # NOT relieved
    f["shortness_of_breath"] = bern(0.75, r)
    f["nausea_vomiting"] = bern(0.6, r)
    f["palpitations"] = bern(0.45, r)
    f["dizziness"] = bern(0.35, r)
    f["smoking"] = bern(0.5, r)
    f["family_history_similar"] = bern(0.45, r)
    return f


def gen_af_arrhythmia(r: np.random.Generator) -> dict:
    """Atrial fibrillation — palpitations, irregular heartbeat, sometimes dyspnea."""
    f = empty_features()
    f["age"] = normal_int(68, 12, 40, 90, r)
    f["sex"] = bern(0.55, r)
    f["symptom_duration_days"] = choice_p([0, 1, 7, 30, 180], [.25, .25, .25, .15, .1], r)
    f["pain_severity"] = choice_p([0, 1, 2, 3, 4], [.3, .25, .2, .15, .1], r)
    f["onset_type"] = bern(0.7, r)        # often sudden (paroxysmal AF)
    f["is_worsening"] = bern(0.4, r)
    f["affects_daily_activity"] = bern(0.5, r)
    f["has_chronic_conditions"] = bern(0.65, r)
    f["takes_medications"] = bern(0.55, r)
    f["prior_similar_episode"] = bern(0.55, r)
    f["associated_symptoms_count"] = choice_p([1, 2, 3, 4], [.2, .35, .3, .15], r)
    f["red_flag_present"] = bern(0.15, r)
    # Cardio-specific
    f["loc_chest"] = bern(0.4, r)
    f["palpitations"] = 1                 # cardinal symptom
    f["dizziness"] = bern(0.5, r)
    f["shortness_of_breath"] = bern(0.55, r)
    f["worse_on_exertion"] = bern(0.5, r)
    f["alcohol_use"] = bern(0.4, r)
    f["family_history_similar"] = bern(0.3, r)
    return f


def gen_heart_failure(r: np.random.Generator) -> dict:
    """Chronic heart failure — dyspnea, fatigue, leg edema, exertional worsening."""
    f = empty_features()
    f["age"] = normal_int(72, 10, 50, 92, r)
    f["sex"] = bern(0.5, r)
    f["symptom_duration_days"] = choice_p([30, 90, 180, 365, 730], [.1, .25, .3, .25, .1], r)
    f["pain_severity"] = choice_p([0, 1, 2, 3], [.4, .3, .2, .1], r)
    f["onset_type"] = 0                   # gradual
    f["is_worsening"] = bern(0.55, r)
    f["affects_daily_activity"] = 1
    f["has_chronic_conditions"] = bern(0.9, r)
    f["takes_medications"] = bern(0.85, r)
    f["prior_similar_episode"] = bern(0.6, r)
    f["associated_symptoms_count"] = choice_p([2, 3, 4, 5], [.2, .35, .3, .15], r)
    f["red_flag_present"] = bern(0.2, r)
    # Cardio-specific
    f["shortness_of_breath"] = 1          # cardinal
    f["swelling"] = bern(0.75, r)         # leg edema
    f["worse_on_exertion"] = 1
    f["palpitations"] = bern(0.3, r)
    f["dizziness"] = bern(0.3, r)
    f["loc_chest"] = bern(0.25, r)
    f["loc_limbs"] = bern(0.7, r)         # legs swelling
    return f


def gen_pericarditis(r: np.random.Generator) -> dict:
    """Pericarditis — sharp chest pain, worse on inspiration/lying, often post-viral."""
    f = empty_features()
    f["age"] = normal_int(40, 15, 18, 75, r)
    f["sex"] = bern(0.55, r)
    f["symptom_duration_days"] = choice_p([1, 3, 7, 14], [.2, .35, .3, .15], r)
    f["pain_severity"] = choice_p([4, 5, 6, 7, 8], [.15, .25, .3, .2, .1], r)
    f["onset_type"] = bern(0.5, r)
    f["is_worsening"] = bern(0.5, r)
    f["affects_daily_activity"] = bern(0.65, r)
    f["has_chronic_conditions"] = bern(0.25, r)
    f["takes_medications"] = bern(0.2, r)
    f["prior_similar_episode"] = bern(0.15, r)
    f["associated_symptoms_count"] = choice_p([1, 2, 3, 4], [.15, .3, .35, .2], r)
    f["red_flag_present"] = bern(0.3, r)
    # Cardio-specific
    f["loc_chest"] = 1
    f["pain_character"] = 4               # sharp/stabbing
    f["fever"] = bern(0.55, r)
    f["radiates"] = bern(0.4, r)
    f["shortness_of_breath"] = bern(0.5, r)
    f["worse_on_exertion"] = bern(0.4, r)
    return f


def gen_vsd_neuro(r: np.random.Generator) -> dict:
    """Functional cardiac complaints (VSD / anxiety) — diverse mild symptoms, no organic disease."""
    f = empty_features()
    f["age"] = normal_int(28, 8, 16, 50, r)
    f["sex"] = bern(0.3, r)               # female predominance
    f["symptom_duration_days"] = choice_p([30, 90, 180, 365], [.2, .3, .3, .2], r)
    f["pain_severity"] = choice_p([1, 2, 3, 4], [.3, .35, .25, .1], r)
    f["onset_type"] = bern(0.4, r)
    f["is_worsening"] = bern(0.25, r)
    f["affects_daily_activity"] = bern(0.3, r)
    f["has_chronic_conditions"] = bern(0.15, r)
    f["takes_medications"] = bern(0.15, r)
    f["prior_similar_episode"] = bern(0.7, r)
    f["associated_symptoms_count"] = choice_p([2, 3, 4, 5, 6], [.1, .2, .3, .25, .15], r)
    f["red_flag_present"] = bern(0.02, r)
    # Cardio-specific
    f["loc_chest"] = bern(0.4, r)
    f["palpitations"] = bern(0.65, r)
    f["dizziness"] = bern(0.55, r)
    f["shortness_of_breath"] = bern(0.4, r)
    f["pain_character"] = choice_p([0, 1, 2, 4], [.3, .3, .2, .2], r)
    f["relieved_by_rest"] = bern(0.5, r)
    return f


# ── Public entry point ─────────────────────────────────────────────────────────

CARDIOLOGY_GENERATORS = {
    "htn_essential":  gen_htn_essential,
    "angina_stable":  gen_angina_stable,
    "mi_acute":       gen_mi_acute,
    "af_arrhythmia":  gen_af_arrhythmia,
    "heart_failure":  gen_heart_failure,
    "pericarditis":   gen_pericarditis,
    "vsd_neuro":      gen_vsd_neuro,
}


def generate_cardiology_dataset(samples_per_class: int = 1500, seed: int = 42):
    """Build the full cardiology training dataset."""
    return build_domain_dataset(
        domain=CARDIOLOGY,
        generators=CARDIOLOGY_GENERATORS,
        samples_per_class=samples_per_class,
        seed=seed,
    )
