import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Loader2, AlertTriangle, Phone, CheckCircle2,
  Info, ArrowRight, Calendar, HelpCircle, Upload,
  MessageSquareOff, Brain, Shield, Clock,
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
                  <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
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
              : <ReportView report={report} onReset={handleReset} />
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

function ReportView({ report, onReset }: { report: AnalysisReport; onReset: () => void }) {
  const navigate = useNavigate();
  const cfg = TRIAGE_CONFIG[report.triage_level];
  const Icon = cfg.icon;
  const confidencePct = Math.round(report.confidence * 100);

  return (
    <div className="space-y-5">
      {/* Hero triage card */}
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

      {/* 2-col grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Possible diagnoses */}
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

        {/* Recommendations */}
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

        {/* Red flags */}
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

      {/* Summary */}
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

      {/* Available slots widget */}
      {report.triage_level !== "EMERGENCY" && (
        <UpcomingSlotsCard
          specializationCode={report.recommended_specialization}
          aiSessionId={report.session_id}
        />
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground leading-relaxed px-1 border-t border-border pt-4">
        ⚕️ {report.disclaimer}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={onReset}
          className="rounded-xl"
        >
          Проверить снова
        </Button>
        <Button
          asChild
          className="flex-1 rounded-xl"
        >
          <Link
            to={
              report.recommended_specialization
                ? `${routes.patient.doctors}?specialization=${report.recommended_specialization}`
                : routes.patient.doctors
            }
          >
            <Calendar className="mr-2 w-4 h-4" />
            Найти врача
          </Link>
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate(routes.patient.home)}
          className="rounded-xl"
        >
          На главную
        </Button>
      </div>
    </div>
  );
}
