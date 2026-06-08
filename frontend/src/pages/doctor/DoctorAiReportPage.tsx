import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, FileText, AlertTriangle, Brain,
  CheckCircle, XCircle, AlertCircle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { doctorApi, type FeedbackVerdict } from "@/features/doctor/api/doctorApi";
import { ReportView } from "@/pages/analysis/AnalysisPage";

// ── verdict config ────────────────────────────────────────────────

const VERDICT_CONFIG: Record<FeedbackVerdict, {
  label: string;
  desc: string;
  icon: typeof CheckCircle;
  selected: string;
  idle: string;
}> = {
  APPROVED: {
    label: "Подтвердить анализ",
    desc: "AI-диагноз соответствует клинической картине",
    icon: CheckCircle,
    selected: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
    idle: "border-border hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 text-muted-foreground",
  },
  PARTIAL: {
    label: "Частично верно",
    desc: "Диагноз верен, но требует уточнений",
    icon: AlertCircle,
    selected: "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
    idle: "border-border hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 text-muted-foreground",
  },
  REJECTED: {
    label: "Отклонить анализ",
    desc: "AI-диагноз не соответствует действительности",
    icon: XCircle,
    selected: "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
    idle: "border-border hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/10 text-muted-foreground",
  },
};

// ── page ──────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function DoctorAiReportPage() {
  const { id: appointmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [verdict, setVerdict] = useState<FeedbackVerdict | null>(null);
  const [comment, setComment] = useState("");
  const [correctedDiagnosis, setCorrectedDiagnosis] = useState("");

  const { data: appointments = [], isLoading: apptLoading } = useQuery({
    queryKey: ["doctor", "appointments"],
    queryFn: doctorApi.myAppointments,
  });

  const appointment = appointments.find((a) => a.id === appointmentId);
  const sessionId = appointment?.aiSessionId ?? null;

  const { data: report, isLoading: reportLoading, isError } = useQuery({
    queryKey: ["ai-report", sessionId],
    queryFn: () => doctorApi.getAiReport(sessionId!),
    enabled: !!sessionId,
    retry: false,
  });

  const feedbackMutation = useMutation({
    mutationFn: () =>
      doctorApi.submitFeedback(appointmentId!, {
        verdict: verdict!,
        comment,
        correctedDiagnosis: verdict === "REJECTED" ? correctedDiagnosis : undefined,
      }),
    onSuccess: () => {
      toast.success("Оценка отправлена — спасибо за обратную связь");
      queryClient.invalidateQueries({ queryKey: ["doctor", "appointments"] });
      navigate(-1);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Не удалось отправить оценку";
      toast.error(msg);
    },
  });

  const isLoading = apptLoading || (!!sessionId && reportLoading);
  const alreadyFeedback = appointment?.hasFeedback ?? false;
  const canFeedback = appointment?.status === "COMPLETED" && !!sessionId && !alreadyFeedback;

  const isSubmitDisabled =
    !verdict ||
    !comment.trim() ||
    (verdict === "REJECTED" && !correctedDiagnosis.trim()) ||
    feedbackMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground -ml-1"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4" />
        Назад
      </Button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">AI-анализ симптомов</h1>
          {appointment && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Пациент: <span className="font-medium text-foreground">{appointment.patientName}</span>
              {appointment.startTime && (
                <span className="ml-2 text-xs">· {fmt(appointment.startTime)}</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            Загрузка анализа...
          </CardContent>
        </Card>
      )}

      {/* No AI session */}
      {!isLoading && !sessionId && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-foreground">AI-анализ не прикреплён</p>
            <p className="text-sm text-muted-foreground mt-1">
              Пациент не проходил AI-анализ симптомов перед записью
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {!isLoading && isError && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="font-medium text-red-700 dark:text-red-400">Не удалось загрузить отчёт</p>
            <p className="text-sm text-muted-foreground mt-1">Попробуйте обновить страницу</p>
          </CardContent>
        </Card>
      )}

      {/* AI report */}
      {!isLoading && report && (
        <ReportView report={report} mode="doctor" />
      )}

      {/* ── Feedback section ─────────────────────────────────────── */}
      {!isLoading && report && (
        <Card className={cn(
          "border-2",
          alreadyFeedback
            ? "border-emerald-200 dark:border-emerald-800"
            : "border-primary/20"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {alreadyFeedback
                ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                : <AlertCircle className="w-5 h-5 text-primary" />
              }
              {alreadyFeedback ? "Оценка уже отправлена" : "Оцените точность AI-анализа"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {alreadyFeedback ? (
              <p className="text-sm text-muted-foreground">
                Вы уже оставили обратную связь по этому анализу. Спасибо — ваша оценка помогает улучшать модель.
              </p>
            ) : !canFeedback ? (
              <p className="text-sm text-muted-foreground">
                Оценка будет доступна после завершения приёма.
              </p>
            ) : (
              <>
                {/* Verdict */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Точность диагноза</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {(Object.entries(VERDICT_CONFIG) as [FeedbackVerdict, typeof VERDICT_CONFIG[FeedbackVerdict]][]).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      const isSelected = verdict === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setVerdict(key)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all",
                            isSelected ? cfg.selected : cfg.idle
                          )}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <div>
                            <p className="font-semibold text-sm">{cfg.label}</p>
                            <p className="text-xs opacity-70 mt-0.5">{cfg.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Corrected diagnosis (only for REJECTED) */}
                {verdict === "REJECTED" && (
                  <div className="space-y-1.5 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <Label className="text-sm font-semibold text-red-700 dark:text-red-400">
                      Правильный диагноз <span className="font-normal">(обязательно)</span>
                    </Label>
                    <Textarea
                      placeholder="Укажите ваш диагноз или правильное заключение..."
                      rows={3}
                      value={correctedDiagnosis}
                      onChange={(e) => setCorrectedDiagnosis(e.target.value)}
                      className="resize-none border-red-200 dark:border-red-800"
                    />
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Этот диагноз будет использован для улучшения AI-модели
                    </p>
                  </div>
                )}

                {/* Comment */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">
                    Комментарий <span className="font-normal text-muted-foreground">(обязательно)</span>
                  </Label>
                  <Textarea
                    placeholder="Опишите вашу оценку, уточнения или коррекции к AI-анализу..."
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="resize-none"
                  />
                </div>

                <Button
                  className="w-full rounded-xl h-12 text-base font-semibold"
                  disabled={isSubmitDisabled}
                  onClick={() => feedbackMutation.mutate()}
                >
                  {feedbackMutation.isPending ? "Отправляем..." : "Отправить оценку"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
