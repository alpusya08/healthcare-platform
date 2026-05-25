import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain, Calendar, Clock, CheckCheck, AlertCircle, MessageSquare,
  FileText, User, ChevronRight, AlertTriangle, CheckCircle2, Info,
  ListOrdered, ShieldAlert, Video, Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/lib/utils";
import { doctorApi, type DoctorAppointment } from "@/features/doctor/api/doctorApi";
import { DoctorFeedbackModal } from "./DoctorFeedbackModal";

/* ─── helpers ──────────────────────────────────────────────────── */

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    weekday: "short", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtFull(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABELS = {
  SCHEDULED: "Запланировано",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  NO_SHOW: "Не явился",
} as const;

const STATUS_COLORS = {
  SCHEDULED: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200",
  NO_SHOW: "bg-muted text-muted-foreground border-border",
} as const;

const TRIAGE_CONFIG = {
  EMERGENCY: {
    label: "Экстренный",
    icon: AlertTriangle,
    iconClass: "text-red-600",
    badgeClass: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-700",
    bgClass: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
  },
  URGENT: {
    label: "Срочный",
    icon: Clock,
    iconClass: "text-amber-600",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700",
    bgClass: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
  },
  ROUTINE: {
    label: "Плановый",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700",
    bgClass: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800",
  },
  INSUFFICIENT_DATA: {
    label: "Недостаточно данных",
    icon: Info,
    iconClass: "text-slate-500",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700",
    bgClass: "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700",
  },
} as const;

/* ─── appointment list item ─────────────────────────────────────── */

function AppointmentListItem({
  appt,
  selected,
  onClick,
}: {
  appt: DoctorAppointment;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
        selected
          ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
          : "border-border hover:border-blue-300 hover:bg-muted/30"
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0 font-bold text-blue-700 dark:text-blue-300 text-sm">
        {appt.patientName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm text-foreground truncate">{appt.patientName}</p>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full border font-medium shrink-0",
            STATUS_COLORS[appt.status]
          )}>
            {STATUS_LABELS[appt.status]}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{fmt(appt.startTime)}</span>
          {appt.type === "ONLINE" && (
            <span className="flex items-center gap-0.5 text-blue-500">
              <Video className="w-3 h-3" />
              Онлайн
            </span>
          )}
        </div>
        {appt.complaint && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">«{appt.complaint}»</p>
        )}
      </div>
      <ChevronRight className={cn("w-4 h-4 shrink-0 mt-1 transition-colors", selected ? "text-blue-500" : "text-muted-foreground")} />
    </div>
  );
}

/* ─── AI report panel ───────────────────────────────────────────── */

function AiReportPanel({ appt }: { appt: DoctorAppointment }) {
  const queryClient = useQueryClient();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["ai-report", appt.aiSessionId],
    queryFn: () => doctorApi.getAiReport(appt.aiSessionId!),
    enabled: !!appt.aiSessionId,
    retry: false,
  });

  const completeMutation = useMutation({
    mutationFn: () => doctorApi.markCompleted(appt.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor", "appointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctor", "ai-appointments"] });
      toast.success("Приём завершён");
    },
    onError: () => toast.error("Не удалось завершить приём"),
  });

  const noShowMutation = useMutation({
    mutationFn: () => doctorApi.markNoShow(appt.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor", "appointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctor", "ai-appointments"] });
      toast.success("Отмечено: не явился");
    },
    onError: () => toast.error("Не удалось обновить статус"),
  });

  const triage = report
    ? (TRIAGE_CONFIG[report.triage_level as keyof typeof TRIAGE_CONFIG] ?? TRIAGE_CONFIG.INSUFFICIENT_DATA)
    : null;
  const TriageIcon = triage?.icon;

  return (
    <div className="space-y-4">
      {/* Patient header */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-700 dark:text-blue-300 shrink-0">
              {appt.patientName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground">{appt.patientName}</p>
                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", STATUS_COLORS[appt.status])}>
                  {STATUS_LABELS[appt.status]}
                </span>
              </div>
              <div className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>{fmtFull(appt.startTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                  <span>{appt.type === "ONLINE" ? "Онлайн-консультация" : "Очный приём"}</span>
                </div>
                {appt.patientPhone && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <a href={`tel:${appt.patientPhone}`} className="hover:underline">{appt.patientPhone}</a>
                  </div>
                )}
              </div>
              {appt.complaint && (
                <div className="mt-2 p-2 rounded-lg bg-muted/50 text-sm italic text-muted-foreground">
                  «{appt.complaint}»
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Online meeting link */}
      {appt.status === "SCHEDULED" && appt.type === "ONLINE" && appt.meetingLink && (
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" asChild>
          <a href={appt.meetingLink} target="_blank" rel="noopener noreferrer">
            <Video className="w-4 h-4 mr-2" />
            Подключиться к онлайн-консультации
          </a>
        </Button>
      )}

      {/* AI Report section */}
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-foreground">AI-анализ симптомов</h3>
      </div>

      {!appt.aiSessionId && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Пациент не проходил AI-анализ перед записью</p>
          </CardContent>
        </Card>
      )}

      {appt.aiSessionId && isLoading && (
        <Card className="border-border">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Загрузка AI-анализа...
          </CardContent>
        </Card>
      )}

      {appt.aiSessionId && isError && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-700 dark:text-red-400">Не удалось загрузить AI-анализ</p>
          </CardContent>
        </Card>
      )}

      {report && triage && TriageIcon && (
        <>
          {/* Triage */}
          <div className={cn("flex items-center gap-3 p-3.5 rounded-xl border", triage.bgClass)}>
            <TriageIcon className={cn("w-5 h-5 shrink-0", triage.iconClass)} />
            <div>
              <p className="text-xs text-muted-foreground">Уровень срочности</p>
              <p className={cn("font-bold", triage.iconClass)}>{triage.label}</p>
            </div>
            <span className={cn("ml-auto text-xs px-2 py-0.5 rounded-full border font-semibold", triage.badgeClass)}>
              {triage.label}
            </span>
          </div>

          {/* Diagnosis */}
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                Предварительный диагноз
              </p>
              <p className="font-semibold text-foreground">{report.primary_diagnosis}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 rounded-full bg-blue-100 dark:bg-blue-900">
                  <div
                    className="h-1.5 rounded-full bg-blue-500"
                    style={{ width: `${Math.round(report.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-blue-700 dark:text-blue-400 shrink-0">
                  {Math.round(report.confidence * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Explanation */}
          {report.explanation && (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Info className="w-3.5 h-3.5" />
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
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <ListOrdered className="w-3.5 h-3.5" />
                  Рекомендации AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
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
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Brain className="w-3.5 h-3.5" />
                  Возможные причины
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {report.possible_causes.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-blue-400 shrink-0">·</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Red flags */}
          {report.red_flags && report.red_flags.length > 0 && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
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

          <p className="text-xs text-muted-foreground/60 text-center">
            AI-анализ создан: {fmtFull(report.created_at)}
            {report.model_version && <span className="ml-2">· Модель: {report.model_version}</span>}
          </p>
        </>
      )}

      <Separator />

      {/* Action buttons */}
      <div className="space-y-2">
        {appt.status === "SCHEDULED" && (
          <>
            <Button
              className="w-full"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              {completeMutation.isPending ? "Завершаем..." : "Завершить приём"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-destructive"
              onClick={() => noShowMutation.mutate()}
              disabled={noShowMutation.isPending}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Пациент не явился
            </Button>
          </>
        )}

        {appt.status === "COMPLETED" && !appt.hasFeedback && (
          <Button
            variant="outline"
            className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
            onClick={() => setFeedbackOpen(true)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Оставить обратную связь по AI-анализу
          </Button>
        )}

        {appt.status === "COMPLETED" && appt.hasFeedback && (
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-2">
            <CheckCircle2 className="w-4 h-4" />
            Обратная связь по AI-анализу оставлена
          </div>
        )}

        {(appt.status === "CANCELLED" || appt.status === "NO_SHOW") && (
          <p className="text-center text-sm text-muted-foreground py-2">
            Приём {appt.status === "CANCELLED" ? "отменён" : "не состоялся"}
          </p>
        )}
      </div>

      {feedbackOpen && (
        <DoctorFeedbackModal
          appointment={appt}
          onClose={() => setFeedbackOpen(false)}
          onSuccess={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────────────── */

export function DoctorAIAppointmentsPage() {
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["doctor", "ai-appointments"],
    queryFn: doctorApi.myAppointments,
    select: (data) => data.filter((a) => a.aiSessionId),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = appointments.find((a) => a.id === selectedId) ?? appointments[0] ?? null;

  if (!selectedId && appointments.length > 0 && !selectedId) {
    // auto-select first on load
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Записи с AI-анализом</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Пациенты, прошедшие AI-анализ симптомов перед приёмом
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : appointments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <Brain className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-foreground">Нет записей с AI-анализом</p>
            <p className="text-sm text-muted-foreground mt-1">
              Когда пациенты будут проходить AI-анализ перед записью, они появятся здесь
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 items-start">
          {/* Left: list */}
          <div className="space-y-2">
            {appointments.map((appt) => (
              <AppointmentListItem
                key={appt.id}
                appt={appt}
                selected={(selectedId ?? appointments[0]?.id) === appt.id}
                onClick={() => setSelectedId(appt.id)}
              />
            ))}
          </div>

          {/* Right: detail */}
          {(selected ?? appointments[0]) && (
            <AiReportPanel appt={selected ?? appointments[0]} />
          )}
        </div>
      )}
    </div>
  );
}
