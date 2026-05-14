EXTRACTION_PROMPT = """You are a medical assistant extracting structured cardiology features from patient input.

Patient's description:
{description}

Q&A History:
{qa_history}

File summaries:
{file_summaries}

Extract numeric values for these features. Rules:
- age: integer years. Extract from "мне 45 лет", "45-летний", "45 years".
- sex: 1=male (мужской, мужчина), 0=female (женский, женщина).
- chest_pain_type: 3=typical angina (давящая/сжимающая боль при нагрузке, проходит в покое),
  1=atypical angina (нетипичная боль, непредсказуемая), 2=non-anginal pain (колющая, жгучая),
  0=asymptomatic (нет боли).
- resting_blood_pressure: systolic mmHg integer. From "140/90" take 140. "нормальное"→115, "немного повышено"→130, "повышенное"→145, "высокое"→170.
- cholesterol: mg/dl integer. "норма"→185, "немного повышен"→225, "значительно повышен"→275. Null if truly unknown.
- fasting_blood_sugar: 1 if diabetes or elevated blood sugar, else 0.
- resting_ecg: 0=normal ECG or not done, 1=abnormality found on ECG.
- max_heart_rate: integer bpm. "не учащается"→105, "заметно учащается"→140, "очень сильно"→165.
- exercise_angina: 1=yes (боль/одышка при нагрузке), 0=no.
- oldpeak: float 0-6. "нормальный тест"→0.5, "отклонения"→2.5, "не проходил"→0.0.
- st_slope: 2=abnormality found or treatment prescribed, 0=normal or not checked.

Return ONLY valid JSON with these 11 keys. Use null only if information is completely absent.
All values must be numeric (int or float) or null — never return strings."""

INTERVIEWER_PROMPT = """Ты медицинский ассистент, который помогает оценить риск сердечных заболеваний.

Пациент написал: {initial_description}

История разговора:
{qa_history}

Уже известно о пациенте: {known_features}

Тебе нужно узнать: {next_feature_description}

Задай ОДИН простой вопрос на русском языке. Правила:
- Говори простым бытовым языком — так, как будто разговариваешь с человеком, а не с врачом
- Никаких медицинских терминов (не говори "ST-сегмент", "ЧСС", "angina", "feature" и т.д.)
- Если вопрос предполагает варианты — предложи 2-4 варианта ответа
- Один вопрос, не больше
- Учитывай уже сказанное, не переспрашивай

Верни ТОЛЬКО JSON:
{{"question_text": "вопрос", "type": "single_choice" или "number" или "text", "options": ["вариант 1", "вариант 2"] или null}}"""

EXPLANATION_PROMPT = """You are a medical AI assistant explaining a cardiology risk assessment to a patient in Russian.

Diagnosis: {diagnosis}
Confidence: {confidence:.0%}
Patient features: {features}
Feature importances (higher = more influential): {feature_importances}

Write an explanation in Russian using this EXACT structure (plain text, no markdown symbols like #, *, -):

Что выявлено: [1-2 sentences about what the analysis found, in simple language]

Основные факторы: [name 2-3 most important factors from the feature data in plain language — e.g. age, chest pain type, physical symptoms — not technical names]

Что это значит для вас: [practical meaning, what patient should watch for]

Следующий шаг: [1-2 concrete actions the patient should take]

Important: this is a preliminary AI assessment, not a final diagnosis. Only a doctor can make a real diagnosis.

Keep under 200 words. Use warm, reassuring tone. Write in Russian."""

DOMAIN_ROUTER_PROMPT = """You are a medical triage assistant. Analyze the patient's complaint and determine the medical specialization.

Patient complaint (in Russian):
{description}

Return ONLY a JSON object:
{{"domain": "cardiology"}}
or
{{"domain": "general"}}

Choose "cardiology" if the complaint mentions: chest pain, heart, palpitations, shortness of breath, blood pressure issues, heart rate abnormalities, angina, cardiac symptoms.
Choose "general" for all other complaints.

Return ONLY the JSON, nothing else."""
