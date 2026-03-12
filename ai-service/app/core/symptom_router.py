from __future__ import annotations

import re

_NON_CARDIAC_PATTERNS = [
    r"\bголов",          # headache
    r"\bмигрен",         # migraine
    r"\bжелудо",         # stomach
    r"\bживот",          # abdomen
    r"\bтошнот",         # nausea
    r"\bрвот",           # vomiting
    r"\bспин",           # back
    r"\bпоясниц",        # lower back
    r"\bгорло",          # throat
    r"\bнасморк",        # runny nose
    r"\bпростуд",        # cold
    r"\btemperatur",     # temperature (English fallback)
    r"\bтемператур",     # fever
    r"\bглаз",           # eyes
    r"\bзрени",          # vision
    r"\bухо\b",          # ear
    r"\bуши\b",
    r"\bслух",           # hearing
    r"\bзуб",            # tooth
    r"\bкожа",           # skin
    r"\bсыпь",           # rash
    r"\bзуд",            # itching
    r"\bсустав",         # joint
    r"\bколен",          # knee
    r"\bрук[аи]\b",      # arm
    r"\bног[аи]\b",      # leg
    r"\bпсих",           # psychological
    r"\bтревог",         # anxiety
    r"\bдепресс",        # depression
]

_CARDIAC_PATTERNS = [
    r"\bгруд",           # chest
    r"\bсердц",          # heart
    r"\bсердеч",         # cardiac
    r"\bдавлени",        # pressure (blood pressure context)
    r"\bодышк",          # shortness of breath
    r"\bинфаркт",        # heart attack
    r"\bсосуд",          # vessels
    r"\bаритм",          # arrhythmia
    r"\bтахикард",       # tachycardia
    r"\bпульс",          # pulse
    r"\bпрерывани",      # heart skipping
    r"\bстенокард",      # angina
]


def detect_symptom_area(description: str) -> str:
    """Return 'cardiology' or 'general' based on description keywords."""
    lower = description.lower()
    has_cardiac = any(re.search(p, lower) for p in _CARDIAC_PATTERNS)
    if has_cardiac:
        return "cardiology"
    has_non_cardiac = any(re.search(p, lower) for p in _NON_CARDIAC_PATTERNS)
    if has_non_cardiac:
        return "general"
    return "cardiology"
