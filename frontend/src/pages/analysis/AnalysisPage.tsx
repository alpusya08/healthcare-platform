import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader2, AlertTriangle, Phone, CheckCircle2,
  Info, ArrowRight, HelpCircle, Upload,
  MessageSquareOff, Brain, Shield, Clock,
  ListChecks, FileText, Download,
  TrendingDown, TrendingUp, Minus, RotateCcw, Home,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Progress } from "@/shared/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { analysisApi } from "@/features/analysis/api/analysisApi";
import type { AnalysisReport, QuestionDto, TriageLevel } from "@/features/analysis/types";
import { routes } from "@/shared/config/routes";
import { UpcomingSlotsCard } from "@/widgets/upcoming-slots/UpcomingSlotsCard";

type Step = "describe" | "questions" | "report";

const TRIAGE_CONFIG: Record<TriageLevel, {
  label: string;
  color: string;
  badgeVariant: "emergency" | "warning" | "success" | "info";
  bg: string;
  border: string;
  icon: typeof AlertTriangle;
}> = {
  EMERGENCY: {
    label: "ВЫЗОВИТЕ СКОРУЮ",
    color: "text-red-700 dark:text-red-400",
    badgeVariant: "emergency",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-300 dark:border-red-800",
    icon: Phone,
  },
  URGENT: {
    label: "НУЖНА КОНСУЛЬТАЦИЯ ВРАЧА",
    color: "text-amber-700 dark:text-amber-400",
    badgeVariant: "warning",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-800",
    icon: AlertTriangle,
  },
  ROUTINE: {
    label: "ПЛАНОВАЯ КОНСУЛЬТАЦИЯ",
    color: "text-emerald-700 dark:text-emerald-400",
    badgeVariant: "success",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  INSUFFICIENT_DATA: {
    label: "НЕДОСТАТОЧНО ДАННЫХ",
    color: "text-blue-700 dark:text-blue-400",
    badgeVariant: "info",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-300 dark:border-blue-800",
    icon: Info,
  },
};

const STEP_INDEX: Record<Step, number> = { describe: 1, questions: 2, report: 3 };
const STEP_LABELS = ["Симптомы", "Вопросы", "Результат"];

export function AnalysisPage() {
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>("describe");
  const [loading, setLoading] = useState(false);

  const [description, setDescription] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  const [sessionId, setSessionId] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState<QuestionDto | null>(null);
  const [, setQuestionNumber] = useState(1);
  const [currentAnswer, setCurrentAnswer] = useState("");

  const [report, setReport] = useState<AnalysisReport | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; summary: string }[]>([]);
  const [fileUploading, setFileUploading] = useState(false);

  // Open existing report from URL param (e.g. from appointment detail modal)
  useEffect(() => {
    const sid = searchParams.get("sessionId");
    if (!sid) return;
    setSessionId(sid);
    setLoading(true);
    analysisApi.getReport(sid)
      .then((r) => { setReport(r); setStep("report"); })
      .catch(() => {/* ignore — let user start fresh */})
      .finally(() => setLoading(false));
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    setFileUploading(true);
    try {
      const result = await analysisApi.uploadFile(sessionId, file);
      setUploadedFiles((prev) => [...prev, { name: file.name, summary: result.summary ?? "" }]);
      toast.success("Файл загружен и проанализирован AI");
    } catch {
      toast.error("Не удалось загрузить файл");
    } finally {
      setFileUploading(false);
      e.target.value = "";
    }
  };

  const handleStart = async () => {
    if (description.trim().length < 10) {
      toast.error("Опишите симптомы подробнее (минимум 10 символов)");
      return;
    }
    if (!consentGiven) {
      toast.error("Необходимо дать согласие на обработку данных");
      return;
    }

    setLoading(true);
    try {
      const res = await analysisApi.start({
        domainCode: "general",
        initialDescription: description,
        consentGiven: true,
      });

      setSessionId(res.session_id);

      if (res.is_non_medical) {
        setReport({ triage_level: "INSUFFICIENT_DATA", confidence: 0 } as AnalysisReport);
        setStep("report");
      } else if (res.first_question === null) {
        const finalReport = await analysisApi.finalize(res.session_id);
        setReport(finalReport);
        setStep("report");
      } else {
        setCurrentQuestion(res.first_question);
        setQuestionNumber(1);
        setStep("questions");
      }
    } catch {
      toast.error("Не удалось запустить анализ. Проверьте подключение.");
    } finally {
      setLoading(false);
    }
  };

  // Fix: answer is passed directly, not read from state closure
  const submitAnswer = async (answerValue: string) => {
    if (!currentQuestion || !answerValue.trim()) {
      toast.error("Пожалуйста, ответьте на вопрос");
      return;
    }

    setLoading(true);
    try {
      const res = await analysisApi.answer(sessionId, currentQuestion.id, answerValue);

      if (res.is_complete || res.next_question === null) {
        const finalReport = await analysisApi.finalize(sessionId);
        setReport(finalReport);
        setStep("report");
      } else {
        setCurrentQuestion(res.next_question);
        setQuestionNumber((n) => n + 1);
        setCurrentAnswer("");
      }
    } catch {
      toast.error("Ошибка при отправке ответа. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = () => submitAnswer(currentAnswer);
  const handleSkip = () => submitAnswer("не знаю");

  const handleReset = () => {
    setStep("describe");
    setDescription("");
    setConsentGiven(false);
    setSessionId("");
    setCurrentQuestion(null);
    setQuestionNumber(1);
    setCurrentAnswer("");
    setReport(null);
  };

  const currentStepNum = STEP_INDEX[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-0">
            {[1, 2, 3].map((num) => {
              const active = currentStepNum >= num;
              const lineActive = currentStepNum > num;
              return (
                <div key={num} className="flex items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`rounded-2xl w-16 h-16 flex items-center justify-center font-bold text-xl transition-all duration-300 ${
                        active
                          ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg scale-110"
                          : "bg-card border-2 border-border text-muted-foreground"
                      }`}
                    >
                      {num}
                    </div>
                    <span className={`text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {STEP_LABELS[num - 1]}
                    </span>
                  </div>
                  {num < 3 && (
                    <div className="w-20 h-1 bg-border mx-2 mb-5 overflow-hidden rounded-full">
                      <div
                        className={`h-full bg-primary rounded-full transition-all duration-500 ${lineActive ? "w-full" : "w-0"}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 1: Describe */}
          {step === "describe" && (
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent rounded-t-xl pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">AI-Анализ симптомов</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Опишите ваши жалобы максимально подробно
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Что вас беспокоит?</Label>
                  <Textarea
                    placeholder="Например: три дня болит горло и температура 38, трудно глотать. Или: сильно болит голова в висках с утра, стало хуже за последние два дня..."
                    className="min-h-[140px] resize-none text-sm rounded-xl"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={5000}
                  />
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground">{description.length}/5000</span>
                  </div>
                </div>

                {/* Security info */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-info/5 border border-info/20">
                  <Shield className="w-4 h-4 text-info mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ваши данные защищены и используются только для анализа в рамках текущей сессии.
                  </p>
                </div>

                {/* Consent */}
                <div className="flex items-start gap-3 p-4 bg-secondary rounded-xl">
                  <Checkbox
                    id="consent"
                    checked={consentGiven}
                    onCheckedChange={(v) => setConsentGiven(Boolean(v))}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consent" className="text-sm font-normal leading-relaxed cursor-pointer">
                    Я даю согласие на анализ введённых данных для предварительной оценки состояния здоровья.
                    Понимаю, что результат не является медицинским диагнозом.
                  </Label>
                </div>

                <Button
                  onClick={handleStart}
                  disabled={loading || description.trim().length < 10 || !consentGiven}
                  className="w-full rounded-xl"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Анализируем...</>
                  ) : (
                    <>Начать анализ <ArrowRight className="ml-2 w-4 h-4" /></>
                  )}
                </Button>

                {/* Info mini cards */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {[
                    { icon: Clock, label: "2–3 минуты", sub: "на анализ" },
                    { icon: Brain, label: "AI-модель", sub: "обучена на клинических данных" },
                    { icon: Shield, label: "Безопасно", sub: "данные не сохраняются" },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="flex flex-col items-center text-center gap-1.5 p-3 rounded-xl bg-card border border-border">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">{label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{sub}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Questions */}
          {step === "questions" && currentQuestion && (
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-br from-warning/5 to-transparent rounded-t-xl pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <HelpCircle className="w-5 h-5 text-warning" />
                  <span className="text-xs font-semibold text-warning uppercase tracking-wide">Уточняющие вопросы</span>
                </div>
                <CardTitle className="text-base leading-relaxed">
                  {currentQuestion.question_text}
                </CardTitle>

                {currentQuestion.hint && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-info/5 border border-info/20 p-3">
                    <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {currentQuestion.hint}
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Single choice / boolean */}
                {(currentQuestion.question_type === "single_choice" ||
                  currentQuestion.question_type === "boolean") &&
                  currentQuestion.options && (
                    <div className="space-y-2">
                      {currentQuestion.options.map((opt) => (
                        <Button
                          key={opt}
                          variant="outline"
                          onClick={() => setCurrentAnswer(opt)}
                          className={`w-full justify-start text-sm h-auto py-3 px-4 rounded-xl transition-all ${
                            currentAnswer === opt
                              ? "border-primary bg-primary/5 text-primary font-medium"
                              : ""
                          }`}
                        >
                          {opt.replace(/\s*\(\d+(?:\.\d+)?\)$/, "")}
                        </Button>
                      ))}
                    </div>
                  )}

                {/* Number input */}
                {currentQuestion.question_type === "number" && (
                  <Input
                    type="number"
                    placeholder="Введите число..."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="text-sm rounded-xl"
                  />
                )}

                {/* Text input */}
                {currentQuestion.question_type === "text" && (
                  <Textarea
                    placeholder="Ваш ответ..."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="min-h-[80px] resize-none text-sm rounded-xl"
                  />
                )}

                {/* File upload */}
                <div className="pt-1">
                  <label
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      fileUploading || !sessionId
                        ? "opacity-50 cursor-not-allowed border-border"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    {fileUploading ? (
                      <><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Загрузка...</span></>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center">
                          Прикрепить документы (заключения, снимки, анализы)<br />
                          <span className="text-[10px]">PDF, JPG, PNG до 50 МБ</span>
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={fileUploading || !sessionId}
                    />
                  </label>

                  {uploadedFiles.length > 0 && (
                    <ul className="mt-2 space-y-2">
                      {uploadedFiles.map((f, i) => (
                        <li key={i} className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
                          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </div>
                          {f.summary && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 pl-5">
                              {f.summary.replace(/^\[.*?\]\s*/, "").slice(0, 120)}…
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="rounded-xl"
                    disabled={loading}
                  >
                    Назад
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="rounded-xl"
                    disabled={loading}
                  >
                    Пропустить
                  </Button>
                  <Button
                    onClick={handleAnswer}
                    disabled={loading || !currentAnswer.trim()}
                    className="flex-1 rounded-xl"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Далее <ArrowRight className="ml-1.5 w-4 h-4" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Report */}
          {step === "report" && report && (
            report.triage_level === "INSUFFICIENT_DATA" && report.confidence === 0
              ? <NonMedicalScreen onReset={handleReset} />
              : <ReportView report={report} onReset={handleReset} sessionFiles={uploadedFiles} />
          )}

        </div>
      </div>
    </div>
  );
}

function NonMedicalScreen({ onReset }: { onReset: () => void }) {
  const navigate = useNavigate();
  return (
    <Card className="shadow-xl border-border">
      <CardContent className="pt-10 pb-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <MessageSquareOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">Это не медицинский запрос</h2>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Система предназначена для оценки симптомов и жалоб на здоровье.
            Опишите, что вас беспокоит — боль, температуру, слабость или другие симптомы.
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <Button onClick={onReset} className="rounded-xl">Описать симптомы</Button>
          <Button variant="outline" onClick={() => navigate(routes.patient.home)} className="rounded-xl">На главную</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportView({
  report,
  onReset,
  sessionFiles = [],
  mode = "patient",
}: {
  report: AnalysisReport;
  onReset?: () => void;
  sessionFiles?: { name: string; summary: string }[];
  mode?: "patient" | "doctor";
}) {
  const navigate = useNavigate();
  const cfg = TRIAGE_CONFIG[report.triage_level];
  const Icon = cfg.icon;
  const confidencePct = Math.round(report.confidence * 100);

  const hasMetrics =
    report.pain_severity != null ||
    report.symptom_duration_days != null ||
    report.is_worsening != null;

  const handlePrint = () => {
    const triageLabel = cfg.label;
    const confidenceStr = `${confidencePct}%`;
    const date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

    const redFlagsHtml = report.red_flags?.length
      ? `<ul>${report.red_flags.map((f) => `<li>${f}</li>`).join("")}</ul>`
      : "<p>Нет</p>";

    const recsHtml = report.recommendations?.length
      ? `<ol>${report.recommendations.map((r) => `<li>${r}</li>`).join("")}</ol>`
      : "";

    const nextStepsHtml = report.next_steps?.length
      ? report.next_steps.map((s) => `<tr><td><b>${s.timeframe}</b></td><td>${s.action}</td><td>${s.detail || ""}</td></tr>`).join("")
      : "";

    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<title>Отчёт AI-анализа — ${report.primary_diagnosis}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 40px; line-height: 1.6; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #444; margin: 20px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-weight: bold; font-size: 12px; }
  .badge-emergency { background:#fee2e2; color:#991b1b; }
  .badge-urgent    { background:#fef3c7; color:#92400e; }
  .badge-routine   { background:#d1fae5; color:#065f46; }
  .badge-info      { background:#dbeafe; color:#1e40af; }
  .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  td, th { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
  th { background: #f9fafb; font-weight: bold; font-size: 12px; }
  ul, ol { margin: 4px 0; padding-left: 20px; }
  li { margin-bottom: 3px; }
  .disclaimer { margin-top: 30px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px; color: #666; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>Отчёт AI-анализа симптомов</h1>
<p class="meta">Дата: ${date} · Версия модели: ${report.model_version} · Сессия: ${String(report.session_id).slice(0, 8)}…</p>

<span class="badge badge-${report.triage_level === "EMERGENCY" ? "emergency" : report.triage_level === "URGENT" ? "urgent" : report.triage_level === "INSUFFICIENT_DATA" ? "info" : "routine"}">
  ${triageLabel}
</span>

<h2>Предварительный диагноз</h2>
<p><b>${report.primary_diagnosis}</b> — уверенность ${confidenceStr}</p>
${report.summary ? `<p>${report.summary}</p>` : ""}

<h2>Объяснение</h2>
<p>${report.explanation}</p>

${report.possible_causes?.length ? `<h2>Возможные причины</h2><ul>${report.possible_causes.map((c) => `<li>${c}</li>`).join("")}</ul>` : ""}

<h2>Рекомендации</h2>
${recsHtml}

${report.red_flags?.length ? `<h2>Тревожные симптомы</h2>${redFlagsHtml}` : ""}

${nextStepsHtml ? `<h2>Что делать дальше</h2><table><thead><tr><th>Когда</th><th>Действие</th><th>Детали</th></tr></thead><tbody>${nextStepsHtml}</tbody></table>` : ""}

${report.recommended_specialization ? `<h2>Рекомендуемый специалист</h2><p>${report.recommended_specialization}</p>` : ""}

<div class="disclaimer">${report.disclaimer}</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-5">
      {/* ── Hero triage card ─────────────────────────────────────── */}
      <Card className={`shadow-2xl border-2 ${cfg.border}`}>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
              <Icon className={`w-8 h-8 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <Badge
                variant={cfg.badgeVariant}
                className={`text-xs font-bold uppercase tracking-wide ${
                  report.triage_level === "EMERGENCY" ? "animate-pulse" : ""
                }`}
              >
                {cfg.label}
              </Badge>
              <p className={`font-semibold text-base leading-snug ${cfg.color}`}>
                {report.primary_diagnosis}
              </p>
              {report.triage_level === "EMERGENCY" && (
                <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 shrink-0" />
                  Немедленно вызовите скорую помощь — 103
                </p>
              )}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Уверенность:</span>
                  <span className={`font-bold ${
                    confidencePct >= 75 ? "text-emerald-600" :
                    confidencePct >= 60 ? "text-amber-600" : "text-muted-foreground"
                  }`}>
                    {confidencePct}%
                  </span>
                </div>
                <Progress
                  value={confidencePct}
                  className={`h-2 ${
                    confidencePct >= 75 ? "[&>div]:bg-emerald-500" :
                    confidencePct >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-slate-400"
                  }`}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Symptom metrics row ──────────────────────────────────── */}
      {hasMetrics && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="shadow-md">
            <CardContent className="pt-4 pb-4 flex flex-col items-center text-center gap-1">
              <p className="text-xs text-muted-foreground">Интенсивность</p>
              <p className={`text-2xl font-bold ${
                report.pain_severity != null && report.pain_severity >= 7
                  ? "text-red-500"
                  : report.pain_severity != null && report.pain_severity >= 4
                  ? "text-amber-500"
                  : "text-foreground"
              }`}>
                {report.pain_severity != null ? `${report.pain_severity}/10` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="pt-4 pb-4 flex flex-col items-center text-center gap-1">
              <p className="text-xs text-muted-foreground">Длительность</p>
              <p className="text-2xl font-bold text-foreground">
                {report.symptom_duration_days != null
                  ? report.symptom_duration_days < 1
                    ? "< дня"
                    : `${report.symptom_duration_days} дн.`
                  : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="pt-4 pb-4 flex flex-col items-center text-center gap-1">
              <p className="text-xs text-muted-foreground">Ухудшение</p>
              <div className="flex items-center gap-1">
                {report.is_worsening === true && (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
                {report.is_worsening === false && (
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                )}
                {report.is_worsening == null && (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
                <p className={`text-2xl font-bold ${
                  report.is_worsening === true
                    ? "text-red-500"
                    : report.is_worsening === false
                    ? "text-emerald-500"
                    : "text-muted-foreground"
                }`}>
                  {report.is_worsening === true ? "Да" : report.is_worsening === false ? "Нет" : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── 2-col grid: causes / recommendations / red flags ─────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {report.possible_causes && report.possible_causes.length > 0 && (
          <Card className="shadow-md">
            <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 to-transparent rounded-t-xl">
              <CardTitle className="text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                Возможные причины
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <ul className="space-y-2">
                {report.possible_causes.map((cause, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                    <Badge variant="outline" className="shrink-0 text-[10px] mt-0.5">{i + 1}</Badge>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {report.recommendations.length > 0 && (
          <Card className="shadow-md">
            <CardHeader className="pb-3 bg-gradient-to-br from-safe/5 to-transparent rounded-t-xl">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-safe" />
                Рекомендации
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-safe shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {report.red_flags && report.red_flags.length > 0 && (
          <Card className="shadow-md border-emergency/20 sm:col-span-2">
            <CardHeader className="pb-3 bg-gradient-to-br from-emergency/5 to-transparent rounded-t-xl">
              <CardTitle className="text-sm flex items-center gap-2 text-emergency">
                <AlertTriangle className="w-4 h-4" />
                Когда срочно к врачу
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <ul className="space-y-2">
                {report.red_flags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-emergency mt-2 shrink-0" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Summary ──────────────────────────────────────────────── */}
      {report.summary && (
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-info" />
              Что мы выяснили
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/90 leading-relaxed">{report.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Next steps timeline ──────────────────────────────────── */}
      {report.next_steps && report.next_steps.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 to-transparent rounded-t-xl">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              Что делать дальше
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div>
              {report.next_steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                    {i < report.next_steps.length - 1 && (
                      <div className="w-px flex-1 bg-border my-1.5 min-h-[20px]" />
                    )}
                  </div>
                  <div className="pb-4 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      {step.timeframe}
                    </span>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{step.action}</p>
                    {step.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Uploaded documents ───────────────────────────────────── */}
      {sessionFiles.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Прикреплённые документы
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {sessionFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-muted/20">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground flex-1 truncate">{f.name}</span>
                <Badge variant="success" className="gap-1 text-xs shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  Учтён
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Slots widget ─────────────────────────────────────────── */}
      {mode === "patient" && (report.triage_level === "URGENT" || report.triage_level === "ROUTINE" || report.triage_level === "INSUFFICIENT_DATA") && (
        <UpcomingSlotsCard
          specializationCode={report.recommended_specialization}
          aiSessionId={report.session_id}
        />
      )}

      {/* ── Disclaimer ───────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground leading-relaxed px-1 border-t border-border pt-4">
        ⚕️ {report.disclaimer}
      </p>

      {/* ── Tревожные симптомы (red flags pill block) ─────────────── */}
      {report.red_flags && report.red_flags.length > 0 && (
        <Card className="shadow-md border-red-200 dark:border-red-900">
          <CardHeader className="pb-3 bg-gradient-to-br from-red-50/60 to-transparent dark:from-red-950/20 rounded-t-xl">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              Тревожные симптомы
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {report.red_flags.map((flag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                >
                  {flag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-600 text-white">
              <Phone className="w-4 h-4 shrink-0" />
              <p className="text-sm font-medium flex-1">
                При любом из этих симптомов — звонить 103 немедленно
              </p>
              <a
                href="tel:103"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-white text-red-600 font-black text-lg shadow-md hover:scale-105 active:scale-95 transition-transform shrink-0"
              >
                103
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Action buttons ───────────────────────────────────────── */}
      {mode === "doctor" && (
        <button
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-muted/40 transition-all text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <Download className="w-4 h-4" />
          Скачать PDF
        </button>
      )}
      {mode === "patient" && <div className="grid grid-cols-3 gap-3">
        <button
          onClick={onReset}
          className="flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
            <RotateCcw className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs font-semibold text-primary leading-tight text-center">Проверить снова</span>
        </button>

        <button
          onClick={handlePrint}
          className="flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-muted/40 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-muted group-hover:bg-muted/70 flex items-center justify-center transition-colors">
            <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground leading-tight text-center transition-colors">Скачать PDF</span>
        </button>

        <button
          onClick={() => navigate(routes.patient.home)}
          className="flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-muted/40 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-muted group-hover:bg-muted/70 flex items-center justify-center transition-colors">
            <Home className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground leading-tight text-center transition-colors">На главную</span>
        </button>
      </div>}
    </div>
  );
}
