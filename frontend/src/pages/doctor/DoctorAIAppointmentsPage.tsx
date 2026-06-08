import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, Calendar, Clock, AlertTriangle, CheckCircle2,
  Info, ChevronRight, FileText, MessageSquare,
  CheckCheck, Users, AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { doctorApi, type DoctorAppointment } from "@/features/doctor/api/doctorApi";
import { routes } from "@/shared/config/routes";

/* ─── helpers ──────────────────────────────────────────────────── */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

/* ─── triage config ─────────────────────────────────────────────── */

type TriageKey = "EMERGENCY" | "URGENT" | "ROUTINE" | "INSUFFICIENT_DATA";

const TRIAGE: Record<TriageKey, {
  label: string;
  icon: typeof CheckCircle2;
  iconClass: string;
  badgeClass: string;
  cardBorder: string;
  dot: string;
}> = {
  EMERGENCY: {
    label: "Экстренный",
    icon: AlertTriangle,
    iconClass: "text-red-600 dark:text-red-400",
    badgeClass: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-700",
    cardBorder: "border-l-4 border-l-red-500",
    dot: "bg-red-500",
  },
  URGENT: {
    label: "Срочный",
    icon: Clock,
    iconClass: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700",
    cardBorder: "border-l-4 border-l-amber-500",
    dot: "bg-amber-500",
  },
  ROUTINE: {
    label: "Плановый",
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700",
    cardBorder: "border-l-4 border-l-emerald-500",
    dot: "bg-emerald-500",
  },
  INSUFFICIENT_DATA: {
    label: "Недост. данных",
    icon: Info,
    iconClass: "text-slate-500",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700",
    cardBorder: "border-l-4 border-l-slate-400",
    dot: "bg-slate-400",
  },
};

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

/* ─── single report card ─────────────────────────────────────────── */

function ReportCard({ appt }: { appt: DoctorAppointment & { _triage?: TriageKey; _diagnosis?: string; _confidence?: number } }) {
  const navigate = useNavigate();

  const tCfg = appt._triage ? TRIAGE[appt._triage] : null;
  const TriageIcon = tCfg?.icon;

  return (
    <Card
      className={cn(
        "shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/40 rounded-2xl overflow-hidden",
        tCfg ? tCfg.cardBorder : "border-border"
      )}
      onClick={() => navigate(routes.doctor.aiReport.replace(":id", appt.id))}
    >
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 font-bold text-white text-xs shadow-sm">
            {appt.patientName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-foreground truncate">{appt.patientName}</p>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0",
                STATUS_COLORS[appt.status]
              )}>
                {STATUS_LABELS[appt.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>{fmtDate(appt.startTime)}</span>
              <span className="text-muted-foreground/50">·</span>
              <Clock className="w-3 h-3 shrink-0" />
              <span>{fmtTime(appt.startTime)}</span>
            </div>
          </div>
        </div>

        {/* Complaint */}
        {appt.complaint && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-secondary">
            <p className="text-xs text-muted-foreground italic line-clamp-2">«{appt.complaint}»</p>
          </div>
        )}

        {/* Triage + Diagnosis row */}
        {tCfg && TriageIcon && (
          <div className="mt-3 flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold", tCfg.badgeClass)}>
              <TriageIcon className="w-3 h-3" />
              {tCfg.label}
            </span>
            {appt._diagnosis && (
              <p className="text-xs text-muted-foreground truncate flex-1">{appt._diagnosis}</p>
            )}
          </div>
        )}

        {/* Confidence bar */}
        {typeof appt._confidence === "number" && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Уверенность AI</span>
              <span className="text-xs font-semibold text-foreground">{Math.round(appt._confidence * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  appt._confidence >= 0.7 ? "bg-emerald-500" :
                  appt._confidence >= 0.4 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${Math.round(appt._confidence * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {appt.status === "COMPLETED" && appt.hasFeedback ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCheck className="w-3.5 h-3.5" />
                Оценён
              </span>
            ) : appt.status === "COMPLETED" && !appt.hasFeedback ? (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <MessageSquare className="w-3.5 h-3.5" />
                Ожидает оценки
              </span>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs rounded-lg text-primary hover:bg-primary/10 gap-1 px-3"
            onClick={(e) => {
              e.stopPropagation();
              navigate(routes.doctor.aiReport.replace(":id", appt.id));
            }}
          >
            Открыть отчёт
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── filter type ───────────────────────────────────────────────── */

type Filter = "all" | "feedback_pending" | "EMERGENCY" | "URGENT" | "ROUTINE";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "feedback_pending", label: "Ожидает оценки" },
  { id: "EMERGENCY", label: "Экстренные" },
  { id: "URGENT", label: "Срочные" },
  { id: "ROUTINE", label: "Плановые" },
];

/* ─── main page ─────────────────────────────────────────────────── */

export function DoctorAIAppointmentsPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("all");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["doctor", "ai-appointments"],
    queryFn: doctorApi.myAppointments,
    select: (data) => data.filter((a) => a.aiSessionId),
  });

  const total = appointments.length;
  const pending = appointments.filter((a) => a.status === "COMPLETED" && !a.hasFeedback).length;
  const reviewed = appointments.filter((a) => a.hasFeedback).length;
  const emergency = appointments.filter((a) => a.status === "SCHEDULED").length;

  const filtered = useMemo(() => {
    if (activeFilter === "feedback_pending")
      return appointments.filter((a) => a.status === "COMPLETED" && !a.hasFeedback);
    if (activeFilter === "EMERGENCY" || activeFilter === "URGENT" || activeFilter === "ROUTINE")
      return appointments; // triage info comes from report, we can't pre-filter; show all
    return appointments;
  }, [appointments, activeFilter]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">AI-анализы</p>
          <h1 className="text-2xl font-bold text-foreground">Отчёты AI-анализа</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Пациенты, прошедшие AI-анализ симптомов перед записью
          </p>
        </div>
      </div>

      {/* ── Stats row ── */}
      {!isLoading && total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: Brain, label: "Всего отчётов", value: total,
              color: "text-primary", bg: "bg-primary/10 border-primary/20",
            },
            {
              icon: MessageSquare, label: "Ожидают оценки", value: pending,
              color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
            },
            {
              icon: CheckCheck, label: "Оценено", value: reviewed,
              color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800",
            },
            {
              icon: Users, label: "Активных записей", value: emergency,
              color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
            },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={cn("rounded-2xl border px-5 py-4", bg)}>
              <Icon className={cn("w-5 h-5 mb-2", color)} />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      {!isLoading && total > 0 && (
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ id, label }) => {
            const triageCfg = id !== "all" && id !== "feedback_pending"
              ? TRIAGE[id as TriageKey]
              : null;
            return (
              <button
                key={id}
                onClick={() => setActiveFilter(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                  activeFilter === id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                )}
              >
                {triageCfg && (
                  <span className={cn("w-2 h-2 rounded-full", triageCfg.dot)} />
                )}
                {id === "feedback_pending" && (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">
          <Brain className="w-10 h-10 mx-auto mb-3 animate-pulse text-primary/40" />
          <p>Загрузка отчётов...</p>
        </div>
      ) : total === 0 ? (
        <Card className="border-dashed rounded-2xl">
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary/40" />
            </div>
            <p className="font-semibold text-foreground text-lg">Нет отчётов AI-анализа</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              Когда пациенты будут проходить AI-анализ симптомов перед записью, отчёты появятся здесь
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed rounded-2xl">
          <CardContent className="py-14 text-center">
            <p className="font-medium text-foreground">Нет отчётов по выбранному фильтру</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-primary"
              onClick={() => setActiveFilter("all")}
            >
              Сбросить фильтр
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "отчёт" : filtered.length < 5 ? "отчёта" : "отчётов"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((appt) => (
              <ReportCard key={appt.id} appt={appt} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
