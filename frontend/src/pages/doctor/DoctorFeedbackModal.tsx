import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, CheckCircle, XCircle, AlertCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { doctorApi, type DoctorAppointment, type FeedbackVerdict } from "@/features/doctor/api/doctorApi";
import { useQuery } from "@tanstack/react-query";

const VERDICT_CONFIG: Record<FeedbackVerdict, { label: string; icon: typeof CheckCircle; color: string }> = {
  APPROVED: {
    label: "Подтвердить анализ",
    icon: CheckCircle,
    color: "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400",
  },
  PARTIAL: {
    label: "Частично верно",
    icon: AlertCircle,
    color: "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400",
  },
  REJECTED: {
    label: "Отклонить анализ",
    icon: XCircle,
    color: "bg-red-50 border-red-300 text-red-700 dark:bg-red-950/30 dark:border-red-700 dark:text-red-400",
  },
};

const TRIAGE_LABELS: Record<string, string> = {
  EMERGENCY: "Экстренный",
  URGENT: "Срочный",
  ROUTINE: "Плановый",
  INSUFFICIENT_DATA: "Недостаточно данных",
};

const TRIAGE_COLORS: Record<string, string> = {
  EMERGENCY: "destructive",
  URGENT: "default",
  ROUTINE: "secondary",
  INSUFFICIENT_DATA: "outline",
};

export function DoctorFeedbackModal({
  appointment,
  onClose,
  onSuccess,
}: {
  appointment: DoctorAppointment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [verdict, setVerdict] = useState<FeedbackVerdict | null>(null);
  const [comment, setComment] = useState("");
  const [showReport, setShowReport] = useState(false);

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ["ai-report", appointment.aiSessionId],
    queryFn: () => doctorApi.getAiReport(appointment.aiSessionId!),
    enabled: !!appointment.aiSessionId && showReport,
    retry: false,
  });

  const feedbackMutation = useMutation({
    mutationFn: () =>
      doctorApi.submitFeedback(appointment.id, { verdict: verdict!, comment }),
    onSuccess: () => {
      toast.success("Отзыв отправлен");
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Не удалось отправить отзыв";
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background">
          <div>
            <h2 className="font-semibold text-foreground">Запись пациента</h2>
            <p className="text-sm text-muted-foreground">{appointment.patientName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">Время: </span>
              {new Date(appointment.startTime).toLocaleString("ru-RU", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {appointment.complaint && (
              <p>
                <span className="font-medium text-foreground">Жалоба: </span>
                {appointment.complaint}
              </p>
            )}
          </div>

          {/* AI Report */}
          {appointment.aiSessionId && (
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setShowReport((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  AI-анализ симптомов
                </span>
                {showReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showReport && (
                <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
                  {reportLoading ? (
                    <p className="text-sm text-muted-foreground">Загрузка анализа...</p>
                  ) : report ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant={(TRIAGE_COLORS[report.triage_level] as "default" | "secondary" | "destructive" | "outline") ?? "secondary"}>
                          {TRIAGE_LABELS[report.triage_level] ?? report.triage_level}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Уверенность: {(report.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{report.primary_diagnosis}</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                        {report.explanation}
                      </p>
                      {report.recommendations.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {report.recommendations.map((r, i) => (
                            <li key={i} className="flex gap-1.5">
                              <span className="text-teal-500 shrink-0">•</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Анализ недоступен</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Feedback form */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Оценка AI-анализа</Label>
            <div className="flex flex-col gap-2">
              {(Object.entries(VERDICT_CONFIG) as [FeedbackVerdict, typeof VERDICT_CONFIG[FeedbackVerdict]][]).map(
                ([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setVerdict(key)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left",
                        verdict === key
                          ? cfg.color
                          : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {cfg.label}
                    </button>
                  );
                }
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comment" className="text-sm">Комментарий врача</Label>
              <Textarea
                id="comment"
                placeholder="Опишите вашу оценку, уточнения или коррекции к AI-анализу..."
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Отмена
            </Button>
            <Button
              className="flex-1"
              disabled={!verdict || !comment.trim() || feedbackMutation.isPending}
              onClick={() => feedbackMutation.mutate()}
            >
              {feedbackMutation.isPending ? "Отправляем..." : "Отправить отзыв"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
