import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, Phone, CheckCircle2, AlertCircle, Info, ArrowRight, Calendar } from "lucide-react";
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
    label: "ЭКСТРЕННО",
    color: "text-red-700 dark:text-red-400",
    badgeVariant: "destructive",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-300 dark:border-red-800",
    icon: Phone,
  },
  URGENT: {
    label: "СРОЧНО",
    color: "text-amber-700 dark:text-amber-400",
    badgeVariant: "secondary",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-800",
    icon: AlertTriangle,
  },
  ROUTINE: {
    label: "ПЛАНОВЫЙ ПРИЁМ",
    color: "text-emerald-700 dark:text-emerald-400",
    badgeVariant: "outline",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  INSUFFICIENT_DATA: {
    label: "НЕДОСТАТОЧНО ДАННЫХ",
    color: "text-blue-700 dark:text-blue-400",
    badgeVariant: "secondary",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-300 dark:border-blue-800",
    icon: Info,
  },
};

export function AnalysisPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("describe");
  const [loading, setLoading] = useState(false);

  // Describe step
  const [description, setDescription] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  // Questions step
  const [sessionId, setSessionId] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState<QuestionDto | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [currentAnswer, setCurrentAnswer] = useState("");

  // Report step
  const [report, setReport] = useState<AnalysisReport | null>(null);

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
        // Emergency or no questions needed — go straight to finalize
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

  const handleAnswer = async () => {
    if (!currentQuestion || !currentAnswer.trim()) {
      toast.error("Пожалуйста, ответьте на вопрос");
      return;
    }

    setLoading(true);
    try {
      const res = await analysisApi.answer(sessionId, currentQuestion.id, currentAnswer);

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
          <h1 className="text-xl font-bold text-foreground">AI Анализ симптомов</h1>
          <p className="text-sm text-muted-foreground">Кардиология · Powered by XGBoost</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["describe", "questions", "report"] as Step[]).map((s, i) => {
          const labels = ["Описание", "Вопросы", "Результат"];
          const done =
            step === "questions" && i === 0
              ? true
              : step === "report" && i < 2
                ? true
                : false;
          const active = step === s;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors ${
                  done
                    ? "bg-blue-600 text-white"
                    : active
                      ? "bg-blue-600 text-white"
                      : "bg-muted text-muted-foreground"
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
            <CardTitle className="text-base">Опишите ваши жалобы</CardTitle>
            <CardDescription>
              Расскажите подробнее — где болит, как давно, как часто, что провоцирует
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Textarea
              placeholder="Например: У меня периодически болит в груди при физической нагрузке, появилась одышка. Мне 55 лет, давление 150/90..."
              className="min-h-[140px] resize-none text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Минимум 10 символов</span>
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
                Я даю согласие на обработку введённых данных AI-системой в целях предварительного
                анализа. Понимаю, что результат не является медицинским диагнозом.
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
                <>Начать анализ <ArrowRight className="ml-2 w-4 h-4" /></>
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
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50"
                          : "border-border hover:border-blue-300 dark:hover:border-blue-700 hover:bg-accent"
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
                placeholder="Введите значение..."
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

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentAnswer("не знаю");
                  setTimeout(handleAnswer, 0);
                }}
                className="flex-1 text-sm"
                disabled={loading}
              >
                Не знаю
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
          <div className={`p-2 rounded-lg bg-white/60 dark:bg-black/20 shrink-0`}>
            <Icon className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
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
            </div>
            <p className={`mt-1.5 font-semibold text-base ${cfg.color}`}>
              {report.primary_diagnosis}
            </p>
            {report.triage_level === "EMERGENCY" && (
              <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
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
            <span className="text-muted-foreground font-medium">Уверенность модели</span>
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
            Модель: {report.model_version} · XGBoost, обучена на UCI Heart Disease (303 записи)
          </p>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500" />
            Пояснение
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/90 leading-relaxed">{report.explanation}</p>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Рекомендации</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-semibold shrink-0">
                  {i + 1}
                </span>
                {rec}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="px-1">
        <Separator className="mb-3" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          ⚕️ {report.disclaimer}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="flex-1" onClick={() => navigate(routes.patient.appointments)} disabled>
          <Calendar className="mr-2 w-4 h-4" />
          Записаться к врачу (скоро)
        </Button>
        <Button variant="outline" onClick={onReset} className="flex-1">
          Новый анализ
        </Button>
        <Button variant="ghost" onClick={() => navigate(routes.patient.home)}>
          На главную
        </Button>
      </div>
    </div>
  );
}

