from typing import Optional

from app.core.entities.medical_features import MedicalFeatures


def check_cardiology_emergency(features: MedicalFeatures) -> Optional[str]:
    desc = str(features.get("_raw_description") or "").lower()

    emergency_keywords = [
        ("сильная давящая боль", "отдает в руку"),
        ("сильная давящая боль", "холодный пот"),
        ("боль за грудиной", "не проходит"),
        ("резкая боль в груди", "одышка"),
    ]
    for keywords in emergency_keywords:
        if all(kw in desc for kw in keywords):
            return (
                "Описанные симптомы могут указывать на инфаркт миокарда. "
                "НЕМЕДЛЕННО вызовите скорую помощь — 103."
            )

    systolic = features.get("resting_blood_pressure")
    if systolic is not None:
        try:
            # Handle string answers like "140/90", "145 мм рт.ст.", "145"
            systolic_val = float(str(systolic).split("/")[0].split()[0])
            if systolic_val >= 180:
                return (
                    "Очень высокое артериальное давление требует "
                    "немедленной медицинской помощи. Вызовите скорую — 103."
                )
        except (ValueError, IndexError):
            pass

    return None
