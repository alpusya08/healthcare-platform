from __future__ import annotations

import re

_NON_CARDIAC_PATTERNS = [
    r"\bголов",          # headache
    r"\bмигрен",         # migraine
    r"\bжелудо",         # stomach
    r"\bживот",          # abdomen
    r"\bтошн",           # nausea: тошнит, тошнота, тошнило
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
    r"\bрук(?:[аиуе]|ой)\b",   # arm — рука/руки/руку/руке/рукой
    r"\bног(?:[аиуе]|ой)\b",   # leg — нога/ноги/ногу/ноге/ногой
    r"\bпсих",           # psychological
    r"\bтревог",         # anxiety
    r"\bдепресс",        # depression
]

_CARDIAC_PATTERNS = [
    r"\bгруд",           # chest — грудь, груди, грудная
    r"\bсердц",          # heart
    r"\bсердеч",         # cardiac
    r"\bдавлени[ея]",    # blood pressure
    r"\bодышк",          # shortness of breath
    r"\bинфаркт",        # heart attack
    r"\bсосуд",          # vessels
    r"\bаритм",          # arrhythmia
    r"\bтахикард",       # tachycardia
    r"\bпульс\b",        # pulse — exact word, NOT пульсирует
    r"\bпрерывани",      # heart skipping
    r"\bстенокард",      # angina
    r"\bкардио",         # cardio
    r"\bсжима",          # squeezing sensation
    r"\bдавящ",          # давящая боль — classic angina descriptor
    r"\bнагрузк",        # "при нагрузке" — exertional symptoms
    r"\bпокое\b",        # "проходит в покое" — relieved at rest = angina pattern
    r"\bхолодн.{1,10}пот",   # cold sweat — cardiac emergency sign
    r"\bлевой? рук",     # pain radiating to left arm
    r"\bлев.{1,5}плеч",  # left shoulder radiation
]

# Non-cardiac symptoms that override cardiac keywords when present in head context
_HEAD_CONTEXT_OVERRIDES = [
    r"пульсиру",         # пульсирует (pulsating pain — head)
    r"висках?",          # temples
    r"стучит в голов",   # pounding in the head
]


def detect_symptom_area(description: str) -> str:
    """Return 'cardiology' or 'general' based on description keywords."""
    lower = description.lower()

    has_non_cardiac = any(re.search(p, lower) for p in _NON_CARDIAC_PATTERNS)
    has_head_context = any(re.search(p, lower) for p in _HEAD_CONTEXT_OVERRIDES)

    # Head-pain context words (пульсирует, виски) override cardiac keyword detection
    if has_head_context and has_non_cardiac:
        return "general"

    has_cardiac = any(re.search(p, lower) for p in _CARDIAC_PATTERNS)
    if has_cardiac:
        return "cardiology"

    if has_non_cardiac:
        return "general"

    return "general"
