export type QuestionType = "single_choice" | "multi_choice" | "number" | "boolean" | "text";
export type TriageLevel = "EMERGENCY" | "URGENT" | "ROUTINE" | "INSUFFICIENT_DATA";

export interface QuestionDto {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[] | null;
  feature_name: string | null;
  hint: string | null;
}

export interface StartAnalysisResponse {
  session_id: string;
  first_question: QuestionDto | null;
  disclaimer: string;
}

export interface AnswerResponse {
  next_question: QuestionDto | null;
  is_complete: boolean;
}

export interface AnalysisReport {
  session_id: string;
  triage_level: TriageLevel;
  primary_diagnosis: string;
  confidence: number;
  explanation: string;
  recommendations: string[];
  model_version: string;
  disclaimer: string;
  created_at: string;
  recommended_specialization: string | null;
  possible_causes: string[];
  red_flags: string[];
  summary: string;
}
