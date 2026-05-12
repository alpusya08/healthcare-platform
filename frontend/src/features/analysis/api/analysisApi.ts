import { apiClient } from "@/shared/api/axios";
import type { AnalysisReport, AnswerResponse, StartAnalysisResponse } from "../types";

export const analysisApi = {
  start: (payload: {
    domainCode: string;
    initialDescription: string;
    consentGiven: boolean;
  }) =>
    apiClient
      .post<StartAnalysisResponse>("/ai/analysis/start", {
        domainCode: payload.domainCode,
        initialDescription: payload.initialDescription,
        consentGiven: payload.consentGiven,
      })
      .then((r) => r.data),

  answer: (sessionId: string, questionId: string, answer: string) =>
    apiClient
      .post<AnswerResponse>(`/ai/analysis/${sessionId}/answer`, {
        questionId,
        answer,
      })
      .then((r) => r.data),

  finalize: (sessionId: string) =>
    apiClient
      .post<AnalysisReport>(`/ai/analysis/${sessionId}/finalize`)
      .then((r) => r.data),

  uploadFile: (sessionId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient
      .post<{ ok: boolean; summary: string }>(`/ai/analysis/${sessionId}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
