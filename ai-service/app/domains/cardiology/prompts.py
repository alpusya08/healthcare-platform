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

QUESTION_GENERATION_PROMPT = """You are a medical AI assistant conducting a cardiology screening interview.
Based on the conversation so far, generate ONE next question to gather missing diagnostic information.

Patient's description: {description}
Previous Q&A: {qa_history}
Already asked: {asked_questions_count} questions
Missing features that need data: {missing_features}

Rules:
- Ask in Russian
- One clear, simple question
- Prefer multiple-choice when possible (provide options list)
- Use empathetic, professional tone
- Focus on the most critical missing feature first
- Do not ask for information already provided

Return ONLY a valid JSON object:
{{
  "question_text": "Your question in Russian",
  "type": "single_choice" | "number" | "boolean" | "text",
  "options": ["option1", "option2", ...] or null,
  "feature_name": "the feature this question targets"
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
