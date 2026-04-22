from __future__ import annotations

import re
import uuid
from typing import Optional

import structlog

from app.core.entities.analysis_session import AnalysisSession
from app.core.entities.diagnosis import Diagnosis
from app.core.entities.medical_features import MedicalFeatures
from app.core.entities.question import Question
from app.core.enums import QuestionType, TriageLevel
from app.core.interfaces.domain_strategy import MedicalDomain
from app.core.interfaces.llm_provider import LLMProvider
from app.infrastructure.llm.general_questions import (
    AREA_DISPLAY_NAMES,
    detect_general_area,
    get_questions_for_area,
)

logger = structlog.get_logger()

MAX_QUESTIONS = 7

GENERAL_FEATURES = [
    "duration_days",
    "pain_severity",
    "pain_character",
    "pain_location",
    "associated_symptoms",
    "fever",
    "food_relation",
    "radiation",
    "movement_relation",
    "swelling",
    "trauma",
    "movement_limit",
    "cough_type",
    "throat_pain",
    "nasal_congestion",
    "onset",
    "photophobia",
    "associated_nausea",
    "spread",
    "trigger",
    "skin_symptom",
    "symptom_area",
]

# Emergency keyword patterns for non-cardiac complaints
_EMERGENCY_PATTERNS = [
    (r"внезапн.{0,20}сильн.{0,20}голов", "Внезапная сильная головная боль — возможен инсульт или разрыв аневризмы. Немедленно вызовите скорую — 103"),
    (r"онемени.{0,20}(рук|ног|лиц|половин)", "Онемение конечностей или лица — возможен инсульт. Немедленно вызовите скорую — 103"),
    (r"(не могу говорить|речь нарушена|перекосило лицо)", "Нарушение речи или асимметрия лица — признак инсульта. Немедленно вызовите скорую — 103"),
    (r"(сильна.{0,10}боль в животе|острый живот|живот как доска)", "Острая боль в животе — возможна хирургическая патология. Немедленно обратитесь в скорую — 103"),
    (r"(температур.{0,10}(40|41|42)|жар.{0,10}(40|41))", "Очень высокая температура — обратитесь к врачу немедленно"),
    (r"(потер.{0,10}сознани|упал в обморок)", "Потеря сознания — требует немедленной медицинской помощи. Вызовите скорую — 103"),
]


class GeneralSymptomDomain(MedicalDomain):
    """Universal symptom intake domain for non-cardiology complaints."""

    def __init__(self, llm: LLMProvider) -> None:
        self._llm = llm

    @property
    def code(self) -> str:
        return "general"

    @property
    def display_name(self) -> str:
        return "Общая симптоматика"

    @property
    def required_features(self) -> list[str]:
        return GENERAL_FEATURES

    async def extract_features(self, session: AnalysisSession) -> MedicalFeatures:
        area = detect_general_area(session.initial_description)

        asked_features: set[str] = set()
        answered: dict[str, str] = {}
        for q in session.questions:
            if q.feature_name:
                asked_features.add(q.feature_name)
            if q.feature_name and q.answer:
                answered[q.feature_name] = q.answer

        # Try to pull age from description text (used only for context, not a GENERAL_FEATURE)
        age: int | None = None
        age_match = re.search(r"\b(\d{1,3})\s*(?:лет|год|года)\b", session.initial_description, re.IGNORECASE)
        if age_match:
            age = int(age_match.group(1))

        values: dict = {f: None for f in GENERAL_FEATURES}
        values["symptom_area"] = area
        for feature, answer in answered.items():
            values[feature] = answer
        if age is not None:
            values["_age_from_description"] = age

        values["_raw_description"] = session.initial_description
        return MedicalFeatures(values=values)

    async def generate_next_question(
        self, session: AnalysisSession, partial_features: MedicalFeatures
    ) -> Optional[Question]:
        if session.questions_count >= MAX_QUESTIONS:
            return None

        area = partial_features.get("symptom_area") or detect_general_area(session.initial_description)
        questions = get_questions_for_area(area)

        asked_feature_names: set[str] = {
            q.feature_name for q in session.questions if q.feature_name
        }

        for q_def in questions:
            fname = q_def["feature_name"]
            if fname not in asked_feature_names:
                q_type = QuestionType(q_def["type"])
                return Question(
                    id=uuid.uuid4(),
                    session_id=session.id,
                    question_text=q_def["question_text"],
                    question_type=q_type,
                    options=q_def.get("options"),
                    feature_name=fname,
                    hint=q_def.get("hint"),
                    order_index=session.questions_count,
                )

        return None

    async def check_emergency(self, features: MedicalFeatures) -> Optional[str]:
        desc = (features.get("_raw_description") or "").lower()
        for pattern, message in _EMERGENCY_PATTERNS:
            if re.search(pattern, desc, re.IGNORECASE):
                return message
        return None

    async def predict(self, features: MedicalFeatures) -> Diagnosis:
        area = features.get("symptom_area") or "general"
        area_name = AREA_DISPLAY_NAMES.get(area, "симптомы")
        severity_raw = str(features.get("pain_severity") or "")
        duration_raw = str(features.get("duration_days") or "")

        is_severe = any(w in severity_raw.lower() for w in ["7–8", "9–10", "сильн", "невынос"])
        is_long = any(w in duration_raw.lower() for w in ["больше недели", "больше месяца"])

        summary = self._build_summary(area_name, features, severity_raw, duration_raw)
        explanation = self._build_general_explanation(area, area_name, is_severe)
        possible_causes = self._build_possible_causes(area, features)
        recommendations = self._build_recommendations(area, is_severe, is_long)
        red_flags = self._build_red_flags(area, features)

        triage = TriageLevel.URGENT if (is_severe or red_flags) else TriageLevel.ROUTINE

        return Diagnosis(
            domain=self.code,
            primary_diagnosis=f"Жалобы на {area_name}",
            confidence=0.0,
            explanation=explanation,
            recommendations=recommendations,
            triage_level=triage,
            model_version="general-rule-based-v2",
            recommended_specialization=self._specialization_for_area(area),
            possible_causes=possible_causes,
            red_flags=red_flags,
            summary=summary,
        )

    def get_model_version(self) -> str:
        return "general-rule-based-v2"

    def _build_summary(self, area_name: str, features: MedicalFeatures, severity: str, duration: str) -> str:
        parts = [f"Основная жалоба: {area_name}."]
        if duration:
            parts.append(f"Длительность: {duration}.")
        if severity:
            parts.append(f"Интенсивность: {severity}.")

        location = features.get("pain_location")
        if location:
            parts.append(f"Локализация: {location}.")
        character = features.get("pain_character")
        if character:
            parts.append(f"Характер: {character}.")
        fever = features.get("fever")
        if fever and "нет" not in str(fever).lower() and "нормал" not in str(fever).lower():
            parts.append(f"Температура: {fever}.")
        return " ".join(parts)

    def _build_general_explanation(self, area: str, area_name: str, is_severe: bool) -> str:
        area_advice = {
            "head": (
                "Головная боль — один из самых распространённых симптомов. "
                "Большинство случаев связано с напряжением, стрессом или недосыпанием. "
                "Однако регулярные, очень интенсивные или впервые возникшие резкие боли "
                "требуют консультации невролога."
            ),
            "abdomen": (
                "Боль в животе может быть вызвана широким спектром причин: "
                "от функциональных расстройств (синдром раздражённого кишечника, гастрит) "
                "до состояний, требующих неотложного лечения (аппендицит, панкреатит, кишечная непроходимость). "
                "Точный диагноз устанавливается только после осмотра, анализов и инструментальных исследований."
            ),
            "throat": (
                "Симптомы простуды чаще всего вызваны вирусами и проходят самостоятельно за 5–7 дней. "
                "Бактериальные инфекции (стрептококковая ангина) требуют антибиотиков и определяются по анализам. "
                "При высокой температуре, сильной боли в горле, одышке или ухудшении состояния — нужна консультация врача."
            ),
            "back": (
                "Боль в спине в большинстве случаев связана с мышечным спазмом, остеохондрозом или защемлением нерва. "
                "Боль, отдающая в ногу до стопы, онемение или слабость в ногах — признак серьёзного защемления "
                "и требуют срочного осмотра невролога."
            ),
            "limbs": (
                "Боль в суставах или мышцах может быть результатом травмы, перегрузки, воспаления или артроза. "
                "Длительная утренняя скованность или боль в нескольких суставах одновременно — повод исключить "
                "ревматическое заболевание у ревматолога."
            ),
            "skin": (
                "Кожные симптомы чаще всего вызваны контактным дерматитом, аллергической реакцией или инфекцией. "
                "В большинстве случаев они хорошо поддаются местному лечению. "
                "Затяжные или распространяющиеся высыпания требуют осмотра дерматолога."
            ),
        }.get(area, "Ваши симптомы требуют профессиональной медицинской оценки.")

        severity_comment = (
            "\n\n⚠️ Интенсивность жалоб высокая — настоятельно рекомендуем не откладывать визит к врачу."
            if is_severe
            else ""
        )

        return (
            f"{area_advice}{severity_comment}\n\n"
            "Важно: данная оценка носит информационный характер и не является диагнозом. "
            "Для точного диагноза необходим очный осмотр врача и при необходимости — анализы и инструментальные исследования."
        )

    def _build_possible_causes(self, area: str, features: MedicalFeatures) -> list[str]:
        character = str(features.get("pain_character") or "").lower()
        location = str(features.get("pain_location") or "").lower()
        food = str(features.get("food_relation") or "").lower()
        fever = str(features.get("fever") or "").lower()
        bowel = str(features.get("bowel_changes") or "").lower()
        radiation = str(features.get("radiation") or "").lower()
        trauma = str(features.get("trauma") or "").lower()
        swelling = str(features.get("swelling") or "").lower()
        photo = str(features.get("photophobia") or "").lower()
        nausea = str(features.get("associated_nausea") or "").lower()

        causes: list[str] = []

        if area == "head":
            if "пульсиру" in character or "висках" in character or photo.startswith("да") or nausea.startswith("да"):
                causes.append("Мигрень — пульсирующая односторонняя боль с тошнотой и светобоязнью")
            if "давящ" in character or "сжима" in character:
                causes.append("Головная боль напряжения — двусторонняя сжимающая боль на фоне стресса или переутомления")
            if "острая" in character or "стреляющ" in character:
                causes.append("Невралгия (раздражение нерва) — стреляющая короткая боль")
            causes.append("Повышение или понижение артериального давления")
            causes.append("Шейный остеохондроз с сосудистым компонентом")

        elif area == "abdomen":
            if "верхн" in location or "эпигастр" in location:
                causes.append("Гастрит или язвенная болезнь желудка")
            if "правое подреберь" in location:
                causes.append("Заболевания желчного пузыря или печени")
            if "пупочн" in location or "по всему" in location:
                causes.append("Кишечная колика, синдром раздражённого кишечника")
            if "справа" in location and "вниз" in location:
                causes.append("Аппендицит — требует срочной диагностики")
            if "после еды" in food or "натощак" in food or "жирн" in food:
                causes.append("Заболевания желудочно-кишечного тракта (гастрит, панкреатит)")
            if "понос" in bowel or "запор" in bowel:
                causes.append("Кишечная инфекция или функциональное расстройство кишечника")
            if not fever.startswith("нет") and "37.5" in fever:
                causes.append("Воспалительный процесс в органах брюшной полости")

        elif area == "throat":
            if "выше 39" in fever or "38–39" in fever:
                causes.append("Бактериальная ангина или грипп")
            else:
                causes.append("Острая респираторная вирусная инфекция (ОРВИ)")
            if "лающий" in str(features.get("cough_type") or "").lower():
                causes.append("Ларингит (воспаление гортани)")
            if "жёлто" in str(features.get("nasal_congestion") or "").lower() or "густ" in str(features.get("cough_type") or "").lower():
                causes.append("Возможна бактериальная инфекция (синусит, бронхит)")

        elif area == "back":
            if "стреляющ" in character or "острая" in character:
                causes.append("Острый приступ радикулопатии (защемление нерва)")
            if "ноющ" in character or "тупая" in character:
                causes.append("Мышечно-тонический синдром, остеохондроз")
            if "ногу" in radiation or "ногу" in radiation or "седалищ" in radiation:
                causes.append("Грыжа межпозвонкового диска со сдавлением седалищного нерва")
            if "тяжест" in trauma or "поднят" in trauma:
                causes.append("Перенапряжение мышц спины, миозит")

        elif area == "limbs":
            if "травма" in trauma or "падени" in trauma:
                causes.append("Ушиб, растяжение связок или возможный перелом")
            if "отёк" in swelling or "покрасн" in swelling:
                causes.append("Воспалительный процесс в суставе (артрит) или мягких тканях")
            if "перегрузка" in trauma:
                causes.append("Тендинит / миозит после физической нагрузки")
            assoc = str(features.get("associated_symptoms") or "").lower()
            if "30 минут" in assoc and "более" in assoc:
                causes.append("Воспалительный артрит (ревматоидный, реактивный)")
            if not causes:
                causes.append("Артроз — возрастные изменения сустава")

        elif area == "skin":
            trigger = str(features.get("trigger") or "").lower()
            sym = str(features.get("skin_symptom") or "").lower()
            if "контакт" in trigger:
                causes.append("Контактный дерматит — реакция на химию, косметику, ткань")
            if "лекарств" in trigger or "еда" in trigger:
                causes.append("Аллергическая реакция (крапивница, лекарственная сыпь)")
            if "пузырьк" in sym or "волдыр" in sym:
                causes.append("Герпетическая инфекция или буллёзный дерматоз")
            if "зуд" in sym:
                causes.append("Атопический дерматит, чесотка, грибковое поражение")
            if not causes:
                causes.append("Неуточнённое кожное заболевание — нужен осмотр")

        if not causes:
            causes.append("Точную причину можно определить только после очного осмотра")

        return causes[:5]

    def _build_red_flags(self, area: str, features: MedicalFeatures) -> list[str]:
        flags: list[str] = []
        onset = str(features.get("onset") or "").lower()
        radiation = str(features.get("radiation") or "").lower()
        bowel = str(features.get("bowel_changes") or "").lower()
        fever = str(features.get("fever") or "").lower()
        assoc = str(features.get("associated_symptoms") or "").lower()
        swelling = str(features.get("swelling") or "").lower()
        trauma = str(features.get("trauma") or "").lower()

        if "удар грома" in onset or "резко" in onset:
            flags.append("Внезапная сильная головная боль 'как удар' — повод исключить инсульт или субарахноидальное кровоизлияние")
        if "выше 38.5" in fever or "выше 39" in fever:
            flags.append("Высокая температура (выше 38.5°C) более 3 дней — требует осмотра врача")
        if area == "abdomen" and ("кров" in bowel or "чёрный" in bowel):
            flags.append("Кровь в стуле или чёрный стул — признак желудочно-кишечного кровотечения")
        if area == "back" and "ногу" in radiation and ("седалищ" in radiation or "стопы" in radiation):
            flags.append("Боль с онемением и слабостью в ноге — возможно сдавление нерва, нужен срочный осмотр")
        if area == "throat" and ("одышк" in assoc or "грудь" in assoc):
            flags.append("Одышка или боль в груди при простуде — повод срочно показаться врачу")
        if area == "skin" and ("отёк лица" in assoc or "дыхани" in assoc):
            flags.append("Отёк лица или затруднённое дыхание — признак тяжёлой аллергии, вызывайте 103")
        if area == "limbs" and "травма" in trauma and "сильн" in swelling:
            flags.append("Сильный отёк после травмы — нельзя исключить перелом, нужен рентген")
        return flags

    @staticmethod
    def _specialization_for_area(area: str) -> str:
        return {
            "head": "neurology",
            "back": "neurology",
            "abdomen": "therapy",
            "throat": "therapy",
            "limbs": "therapy",
            "skin": "dermatology",
        }.get(area, "therapy")

    def _build_recommendations(self, area: str, is_severe: bool, is_long: bool) -> list[str]:
        specialist = {
            "head": "неврологу",
            "abdomen": "терапевту или гастроэнтерологу",
            "throat": "терапевту или ЛОР-врачу",
            "back": "неврологу или ортопеду",
            "limbs": "травматологу или ревматологу",
            "skin": "дерматологу",
        }.get(area, "терапевту")

        recs = [f"Запишитесь на консультацию к {specialist}"]
        if is_severe:
            recs.insert(0, "Не откладывайте визит к врачу — симптомы выражены сильно")
        if is_long:
            recs.append("Длительные симптомы требуют обследования — сдайте общий анализ крови")
        recs.append("Если состояние резко ухудшится — вызовите скорую помощь: 103")
        return recs
