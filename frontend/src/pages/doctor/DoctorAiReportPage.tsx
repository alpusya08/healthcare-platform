import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, FileText, AlertTriangle, CheckCircle2, Clock,
  ListOrdered, Brain, ShieldAlert, Info,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";
import { doctorApi } from "@/features/doctor/api/doctorApi";

/* ─── triage config ────────────────────────────────────────────── */

const TRIAGE_CONFIG = {
  EMERGENCY: {
    label: "Экстренный",
    badgeClass: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-700",
    icon: AlertTriangle,
    iconClass: "text-red-600",
    bgClass: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
  },
  URGENT: {
    label: "Срочный",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700",
    icon: Clock,
    iconClass: "text-amber-600",
    bgClass: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
  },
  ROUTINE: {
    label: "Плановый",
    badgeClass: "bg-green-100 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-400 dark:border-green-700",
    icon: CheckCircle2,
    iconClass: "text-green-600",
    bgClass: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
  },
  INSUFFICIENT_DATA: {
    label: "Недостаточно данных",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700",
    icon: Info,
    iconClass: "text-slate-500",
    bgClass: "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700",
  },
} as const;

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── page ─────────────────────────────────────────────────────── */

export function DoctorAiReportPage() {
  const { id: appointmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  /* fetch all appointments to find the one with this id */
  const { data: appointments = [], isLoading: apptLoading } = useQuery({
    queryKey: ["doctor", "appointments"],
    queryFn: doctorApi.myAppointments,
  });

  const appointment = appointments.find((a) => a.id === appointmentId);
  const sessionId = appointment?.aiSessionId ?? null;

  const {
    data: report,
    isLoading: reportLoading,
    isError,
  } = useQuery({
    queryKey: ["ai-report", sessionId],
    queryFn: () => doctorApi.getAiReport(sessionId!),
    enabled: !!sessionId,
    retry: false,
  });

  const isLoading = apptLoading || (!!sessionId && reportLoading);
  const triage = report ? (TRIAGE_CONFIG[report.triage_level] ?? TRIAGE_CONFIG.INSUFFICIENT_DATA) : null;
  const TriageIcon = triage?.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      {/* Back button */}
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
        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 shrink-0">
          <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
        <Card className="border-border">
          <CardContent className="py-16 text-center text-muted-foreground">
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

      {/* Report */}
      {!isLoading && report && triage && TriageIcon && (
        <div className="space-y-4">

          {/* Triage banner */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${triage.bgClass}`}>
            <TriageIcon className={`w-6 h-6 shrink-0 ${triage.iconClass}`} />
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Уровень срочности</p>
              <p className={`text-lg font-bold ${triage.iconClass}`}>{triage.label}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${triage.badgeClass}`}>
              {triage.label}
            </span>
          </div>

          {/* Primary diagnosis */}
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                Основной диагноз
              </p>
              <p className="text-base font-semibold text-foreground">{report.primary_diagnosis}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-blue-100 dark:bg-blue-900">
                  <div
                    className="h-1.5 rounded-full bg-blue-500"
                    style={{ width: `${Math.round(report.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400 shrink-0">
                  {Math.round(report.confidence * 100)}% уверенность
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Explanation */}
          {report.explanation && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Info className="w-4 h-4" />
                  Объяснение
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {report.explanation}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <ListOrdered className="w-4 h-4" />
                  Рекомендации
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Possible causes */}
          {report.possible_causes && report.possible_causes.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Brain className="w-4 h-4" />
                  Возможные причины
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {report.possible_causes.map((cause, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-blue-400 shrink-0 mt-0.5">·</span>
                      {cause}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Red flags */}
          {report.red_flags && report.red_flags.length > 0 && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
                  <ShieldAlert className="w-4 h-4" />
                  Тревожные симптомы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {report.red_flags.map((flag, i) => (
                    <li key={i} className="flex gap-2 text-sm text-red-700 dark:text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center pb-2">
            Создан: {fmt(report.created_at)}
            {report.model_version && (
              <span className="ml-3 text-muted-foreground/60">Модель: {report.model_version}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
