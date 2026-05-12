import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertTriangle, Phone, CheckCircle2,
  AlertCircle, Info, ArrowRight, Calendar, HelpCircle, Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Label } from "@/shared/ui/label";
import { Progress } from "@/shared/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Separator } from "@/shared/ui/separator";
import { analysisApi } from "@/features/analysis/api/analysisApi";
import type { AnalysisReport, QuestionDto, TriageLevel } from "@/features/analysis/types";
import { routes } from "@/shared/config/routes";
import { UpcomingSlotsCard } from "@/widgets/upcoming-slots/UpcomingSlotsCard";

type Step = "describe" | "questions" | "report";

const MAX_QUESTIONS = 7;

const TRIAGE_CONFIG: Record<TriageLevel, {
  label: string;
  color: string;
  badgeVariant: "destructive" | "secondary" | "outline" | "default";
  bg: string;
  border: string;
  icon: typeof AlertTriangle;
}> = {
  EMERGENCY: {
    label: "ВЫЗОВИТЕ СКОРУЮ",
    color: "text-red-700 dark:text-red-400",
    badgeVariant: "destructive",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-300 dark:border-red-800",
    icon: Phone,
  },
  URGENT: {
    label: "НУЖНА КОНСУЛЬТАЦИЯ ВРАЧА",
    color: "text-amber-700 dark:text-amber-400",
    badgeVariant: "secondary",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-800",
    icon: AlertTriangle,
  },
  ROUTINE: {
    label: "ПЛАНОВАЯ КОНСУЛЬТАЦИЯ",
    color: "text-emerald-700 dark:text-emerald-400",
    badgeVariant: "outline",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  INSUFFICIENT_DATA: {
    label: "НЕДОСТАТОЧНО ДАННЫХ",
    color: "text-teal-700 dark:text-teal-400",
    badgeVariant: "secondary",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    border: "border-teal-300 dark:border-teal-800",
    icon: Info,
  },
};

export function AnalysisPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("describe");
  const [loading, setLoading] = useState(false);

  const [description, setDescription] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  const [sessionId, setSessionId] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState<QuestionDto | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [currentAnswer, setCurrentAnswer] = useState("");

  const [report, setReport] = useState<AnalysisReport | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileUploading, setFileUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    setFileUploading(true);
    try {
      await analysisApi.uploadFile(sessionId, file);
      setUploadedFiles((prev) => [...prev, file]);
      toast.success("Файл загружен и проанализирован");
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
        domainCode: "cardiology",
        initialDescription: description,
        consentGiven: true,
      });

      setSessionId(res.session_id);

      if (res.first_question === null) {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (step === "describe" ? navigate(routes.patient.home) : handleReset())}
          className="shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Проверка симптомов</h1>
          <p className="text-sm text-muted-foreground">Кардиологический скрининг</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["describe", "questions", "report"] as Step[]).map((s, i) => {
          const labels = ["Описание", "Вопросы", "Результат"];
          const done =
            (step === "questions" && i === 0) ||
            (step === "report" && i < 2);
          const active = step === s;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors ${
                  done || active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={active ? "font-semibold text-foreground" : "text-muted-foreground"}>
                {labels[i]}
              </span>
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Describe ── */}
      {step === "describe" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Расскажите о своих симптомах</CardTitle>
            <CardDescription>
              Опишите своими словами — что беспокоит, когда началось, как проявляется
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Textarea
              placeholder="Например: болит или давит в груди при ходьбе, иногда бывает одышка. Мне 55 лет, курю, давление обычно 150/90..."
              className="min-h-[140px] resize-none text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Чем подробнее — тем точнее результат</span>
              <span>{description.length}/5000</span>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
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
              className="w-full"
            >
              {loading ? (
                <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Анализируем...</>
              ) : (
                <>Начать проверку <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Questions ── */}
      {step === "questions" && currentQuestion && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground font-medium">
                Вопрос {questionNumber} из {MAX_QUESTIONS}
              </span>
              <Badge variant="outline" className="text-xs">
                {Math.round((questionNumber / MAX_QUESTIONS) * 100)}%
              </Badge>
            </div>
            <Progress value={(questionNumber / MAX_QUESTIONS) * 100} className="h-1.5" />
            <CardTitle className="text-base mt-4 leading-relaxed">
              {currentQuestion.question_text}
            </CardTitle>

            {/* Hint block */}
            {currentQuestion.hint && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-3">
                <HelpCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed">
                  {currentQuestion.hint}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Single choice */}
            {(currentQuestion.question_type === "single_choice" ||
              currentQuestion.question_type === "boolean") &&
              currentQuestion.options && (
                <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer} className="gap-2.5">
                  {currentQuestion.options.map((opt) => (
                    <div
                      key={opt}
                      onClick={() => setCurrentAnswer(opt)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        currentAnswer === opt
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-950/50"
                          : "border-border hover:border-teal-300 dark:hover:border-teal-700 hover:bg-accent"
                      }`}
                    >
                      <RadioGroupItem value={opt} id={opt} />
                      <Label htmlFor={opt} className="cursor-pointer text-sm flex-1">
                        {opt.replace(/\s*\(\d+(?:\.\d+)?\)$/, "")}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

            {/* Number input */}
            {currentQuestion.question_type === "number" && (
              <Input
                type="number"
                placeholder="Введите число..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="text-sm"
              />
            )}

            {/* Text input */}
            {currentQuestion.question_type === "text" && (
              <Textarea
                placeholder="Ваш ответ..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
              />
            )}

            {/* Optional file upload */}
            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors w-fit">
                <Paperclip className="w-3.5 h-3.5" />
                {fileUploading ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Загрузка...</>
                ) : (
                  "Прикрепить файл (рентген, ЭКГ, УЗИ, PDF)"
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={fileUploading || !sessionId}
                />
              </label>
              {uploadedFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {uploadedFiles.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[260px]">{f.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex-1 text-sm text-muted-foreground"
                disabled={loading}
              >
                Не знаю / Пропустить
              </Button>
              <Button
                onClick={handleAnswer}
                disabled={loading || !currentAnswer.trim()}
                className="flex-1"
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

      {/* ── Step 3: Report ── */}
      {step === "report" && report && <ReportView report={report} onReset={handleReset} />}
    </div>
  );
}

function ReportView({ report, onReset }: { report: AnalysisReport; onReset: () => void }) {
  const navigate = useNavigate();
  const cfg = TRIAGE_CONFIG[report.triage_level];
  const Icon = cfg.icon;
  const confidencePct = Math.round(report.confidence * 100);

  return (
    <div className="space-y-4">
      {/* Triage banner */}
      <div className={`rounded-xl border-2 p-5 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20 shrink-0">
            <Icon className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <Badge
              variant={cfg.badgeVariant}
              className={`text-xs font-bold uppercase tracking-wide ${
                report.triage_level === "EMERGENCY"
                  ? "bg-red-600 text-white border-0 animate-pulse"
                  : ""
              }`}
            >
              {cfg.label}
            </Badge>
            <p className={`mt-2 font-semibold text-base leading-snug ${cfg.color}`}>
              {report.primary_diagnosis}
            </p>
            {report.triage_level === "EMERGENCY" && (
              <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5">
                <Phone className="w-4 h-4 shrink-0" />
                Немедленно вызовите скорую помощь — 103
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Confidence */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Достоверность оценки</span>
            <span className={`font-bold text-base ${
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
          <p className="text-xs text-muted-foreground">
            Оценка основана на статистической модели, обученной на клинических данных
          </p>
        </CardContent>
      </Card>

      {/* Summary — what we learned about the patient */}
      {report.summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Что мы выяснили
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {report.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Explanation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Что это означает
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {report.explanation}
          </div>
        </CardContent>
      </Card>

      {/* Possible causes */}
      {report.possible_causes && report.possible_causes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Возможные причины
            </CardTitle>
            <CardDescription className="text-xs">
              Это лишь предположения на основе ваших ответов — точный диагноз ставит врач
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {report.possible_causes.map((cause, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                  <span>{cause}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Red flags — emergency warnings specific to this case */}
      {report.red_flags && report.red_flags.length > 0 && (
        <Card className="border-coral-200 dark:border-coral-900 bg-coral-50/50 dark:bg-coral-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-coral-700 dark:text-coral-300">
              <AlertTriangle className="w-4 h-4" />
              Когда срочно к врачу
            </CardTitle>
            <CardDescription className="text-xs">
              Признаки, при которых нужна неотложная помощь
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.red_flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-coral-600 dark:text-coral-400 shrink-0" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Что делать дальше
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground/90">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400 text-xs font-semibold shrink-0">
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Embedded upcoming-slots widget — only for non-emergency triage */}
      {report.triage_level !== "EMERGENCY" && (
        <UpcomingSlotsCard
          specializationCode={report.recommended_specialization}
          aiSessionId={report.session_id}
        />
      )}

      {/* Disclaimer */}
      <div className="px-1">
        <Separator className="mb-3" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          ⚕️ {report.disclaimer}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="flex-1"
          onClick={() => {
            const spec = report.recommended_specialization;
            const path = spec
              ? `${routes.patient.doctors}?specialization=${spec}`
              : routes.patient.doctors;
            navigate(path);
          }}
        >
          <Calendar className="mr-2 w-4 h-4" />
          Все врачи этой специализации
        </Button>
        <Button variant="outline" onClick={onReset} className="flex-1">
          Проверить снова
        </Button>
        <Button variant="ghost" onClick={() => navigate(routes.patient.home)}>
          На главную
        </Button>
      </div>
    </div>
  );
}
