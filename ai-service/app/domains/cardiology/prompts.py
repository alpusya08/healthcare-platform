EXTRACTION_PROMPT = """You are a medical assistant extracting structured cardiology features from patient input.

Patient's initial description:
{description}

Q&A History:
{qa_history}

File summaries:
{file_summaries}

Extract the following features. If information is missing, return null for that field.

Required features:
- age (integer, years)
- sex (1 = male, 0 = female)
- cp (chest pain type: 0=asymptomatic, 1=atypical_angina, 2=non_anginal, 3=typical_angina)
- trestbps (resting blood pressure, integer, mmHg)
- chol (serum cholesterol, integer, mg/dl)
- fbs (fasting blood sugar > 120 mg/dl: 1=true, 0=false)
- restecg (resting ECG: 0=normal, 1=ST-T abnormality, 2=left ventricular hypertrophy)
- thalach (maximum heart rate achieved, integer)
- exang (exercise induced angina: 1=yes, 0=no)
- oldpeak (ST depression induced by exercise, float)
- slope (slope of peak exercise ST segment: 0=upsloping, 1=flat, 2=downsloping)
- ca (number of major vessels colored by fluoroscopy: 0-3)
- thal (thalassemia: 1=normal, 2=fixed_defect, 3=reversible_defect)

Return ONLY a valid JSON object with these keys. Use null for unknown values. Do not invent values."""

QUESTION_GENERATION_PROMPT = """Ты — кардиолог-ассистент. Задай ОДИН следующий вопрос для кардиологического скрининга.

ВАЖНО: отвечай ТОЛЬКО на русском языке.

Описание пациента: {description}
История Q&A: {qa_history}
Уже задано: {asked_questions_count} вопросов
Недостающие данные: {missing_features}

Правила: один вопрос, профессиональный эмпатичный тон, не повторяй уже собранное.
По возможности предлагай варианты ответов на русском.

Верни ТОЛЬКО JSON:
{{
  "question_text": "вопрос на русском",
  "type": "single_choice" или "number" или "boolean" или "text",
  "options": ["вариант 1", "вариант 2"] или null,
  "feature_name": "целевая фича"
}}"""

EXPLANATION_PROMPT = """You are a medical AI assistant explaining a cardiology diagnosis to a patient.

Diagnosis: {diagnosis}
Confidence: {confidence:.0%}
Key patient features: {features}
Feature importances: {feature_importances}

Write a clear, empathetic explanation in Russian for the patient:
1. What the analysis found
2. What features contributed most to this assessment
3. What it means in simple terms
4. Always emphasize this is a preliminary AI assessment, not a final diagnosis

Keep it under 200 words. Use professional but accessible language."""
