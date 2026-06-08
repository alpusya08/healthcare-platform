import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stethoscope, Calendar, Clock, FileText, CheckCheck,
  MessageSquare, Phone,
  AlertCircle, Users,
  Video, Brain, CheckCircle2, X as XIcon,
  ArrowRight, ChevronRight, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/model/authStore";
import { doctorApi, type DoctorAppointment } from "@/features/doctor/api/doctorApi";
import { chatApi } from "@/features/chat/api/chatApi";
import { routes } from "@/shared/config/routes";

/* ─── helpers ─────────────────────────────────────────────────── */

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
function isThisWeek(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Доброе утро";
  if (h < 17) return "Добрый день";
  return "Добрый вечер";
}

/* ─── status config ───────────────────────────────────────────── */

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

/* ─── date filter ─────────────────────────────────────────────── */

type DateFilter = "today" | "week" | "all";

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "today", label: "Сегодня" },
  { id: "week", label: "Неделя" },
  { id: "all", label: "Все" },
];

/* ─── appointment card ─────────────────────────────────────────── */

function AppointmentCard({
  appt,
  onOpen,
  onComplete,
  onNoShow,
  completing,
  noShowing,
  unreadCount = 0,
  onChat,
}: {
  appt: DoctorAppointment;
  onOpen: () => void;
  onComplete?: () => void;
  onNoShow?: () => void;
  completing?: boolean;
  noShowing?: boolean;
  unreadCount?: number;
  onChat?: () => void;
}) {
  const durationMin = Math.round(
    (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / 60000
  );

  return (
    <Card
      className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-border hover:border-primary/30 rounded-2xl"
      onClick={onOpen}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 font-bold text-white text-sm shadow-sm">
            {appt.patientName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base text-foreground truncate">{appt.patientName}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {fmt(appt.startTime)}
                    <span className="text-muted-foreground/60">({durationMin} мин)</span>
                  </span>
                  {appt.type === "ONLINE" ? (
                    <Badge className="text-[10px] px-2 py-0.5 bg-success/10 text-success border-success/20 rounded-full">
                      Онлайн
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] px-2 py-0.5 bg-info/10 text-info border-info/20 rounded-full">
                      Офлайн
                    </Badge>
                  )}
                  {appt.aiSessionId && (
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <FileText className="w-3 h-3" />
                      AI-анализ
                    </span>
                  )}
                </div>
                {appt.complaint && (
                  <div className="mt-2 bg-secondary rounded-xl px-3 py-2">
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                      «{appt.complaint}»
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {unreadCount > 0 && onChat && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onChat(); }}
                    className="relative flex items-center justify-center"
                    title={`${unreadCount} новых сообщений`}
                  >
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </button>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[appt.status]}`}>
                  {STATUS_LABELS[appt.status]}
                </span>
              </div>
            </div>

            {appt.status === "SCHEDULED" && (onComplete || onNoShow) && (
              <div className="flex flex-col gap-1.5 mt-3 w-fit" onClick={(e) => e.stopPropagation()}>
                {appt.type === "ONLINE" && appt.meetingLink && (
                  <Button
                    size="sm"
                    className="h-8 text-xs rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm"
                    onClick={() => window.open(appt.meetingLink, "_blank", "noopener,noreferrer")}
                  >
                    <Video className="w-3.5 h-3.5 mr-1.5" />
                    Подключиться
                  </Button>
                )}
                {onComplete && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs rounded-xl hover:text-safe hover:border-safe/40"
                    onClick={onComplete}
                    disabled={completing}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Завершить
                  </Button>
                )}
                {onNoShow && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                    onClick={onNoShow}
                    disabled={noShowing}
                  >
                    <XIcon className="w-3.5 h-3.5 mr-1.5" />
                    Не явился
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── patient detail modal ─────────────────────────────────────── */

function PatientDetailModal({
  appt,
  onClose,
  onComplete,
  onNoShow,
}: {
  appt: DoctorAppointment;
  onClose: () => void;
  onComplete: () => void;
  onNoShow: () => void;
}) {
  const navigate = useNavigate();
  const durationMin = Math.round(
    (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / 60000
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-foreground">Карточка приёма</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-bold text-white shrink-0">
              {appt.patientName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{appt.patientName}</p>
              {appt.patientPhone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" /> {appt.patientPhone}
                </p>
              )}
            </div>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[appt.status]}`}>
              {STATUS_LABELS[appt.status]}
            </span>
          </div>

          <Separator />

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Дата и время</p>
                <p className="font-medium">
                  {fmtDate(appt.startTime)}, {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}
                  <span className="text-muted-foreground font-normal ml-1">({durationMin} мин)</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Stethoscope className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Формат</p>
                <p className="font-medium">{appt.type === "ONLINE" ? "Онлайн-консультация" : "Очный приём"}</p>
              </div>
            </div>
            {appt.complaint && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Жалоба пациента</p>
                  <p className="text-foreground leading-relaxed">{appt.complaint}</p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => { navigate(routes.doctor.chat.replace(":appointmentId", appt.id)); onClose(); }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Написать пациенту
            </Button>

            {appt.aiSessionId && (
              <Button
                variant="outline"
                className="w-full rounded-xl border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                onClick={() => { navigate(routes.doctor.aiReport.replace(":id", appt.id)); onClose(); }}
              >
                <Brain className="w-4 h-4 mr-2" />
                Открыть AI-анализ пациента
              </Button>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            {appt.status === "SCHEDULED" && appt.type === "ONLINE" && appt.meetingLink && (
              <Button
                className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white"
                onClick={() => window.open(appt.meetingLink, "_blank", "noopener,noreferrer")}
              >
                <Video className="w-4 h-4 mr-2" />
                Подключиться к консультации
              </Button>
            )}
            {appt.status === "SCHEDULED" && (
              <>
                <Button className="w-full rounded-xl" onClick={() => { onComplete(); onClose(); }}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  {appt.aiSessionId ? "Завершить и оценить AI-анализ" : "Завершить приём"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full rounded-xl text-muted-foreground hover:text-destructive"
                  onClick={() => { onNoShow(); onClose(); }}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Пациент не явился
                </Button>
              </>
            )}
            {appt.status === "COMPLETED" && appt.aiSessionId && !appt.hasFeedback && (
              <Button
                variant="outline"
                className="w-full rounded-xl border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                onClick={() => { navigate(routes.doctor.aiReport.replace(":id", appt.id)); onClose(); }}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Оценить AI-анализ
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── main component ───────────────────────────────────────────── */

export function DoctorDashboard() {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedAppt, setSelectedAppt] = useState<DoctorAppointment | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["doctor", "appointments"],
    queryFn: doctorApi.myAppointments,
  });

  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["chat", "unread"],
    queryFn: chatApi.getUnreadCounts,
    refetchInterval: 10000,
  });

  const completeMutation = useMutation({
    mutationFn: doctorApi.markCompleted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor", "appointments"] });
      toast.success("Приём завершён");
    },
    onError: () => toast.error("Не удалось завершить приём"),
  });

  const noShowMutation = useMutation({
    mutationFn: doctorApi.markNoShow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor", "appointments"] });
      toast.success("Отмечено: пациент не явился");
    },
    onError: () => toast.error("Не удалось изменить статус"),
  });

  const now = new Date();

  const todayAppts = useMemo(
    () => appointments.filter((a) => a.status === "SCHEDULED" && isToday(a.startTime)),
    [appointments]
  );

  const nextAppt = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "SCHEDULED" && new Date(a.startTime) > now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] ?? null,
    [appointments]
  );

  const filteredAppts = useMemo(() => {
    let list = appointments;
    if (dateFilter === "today") list = list.filter((a) => isToday(a.startTime));
    if (dateFilter === "week") list = list.filter((a) => isThisWeek(a.startTime));
    return list;
  }, [appointments, dateFilter]);

  const scheduled = filteredAppts.filter((a) => a.status === "SCHEDULED");
  const past = filteredAppts.filter((a) => a.status !== "SCHEDULED");

  const totalCompleted = appointments.filter((a) => a.status === "COMPLETED").length;
  const withAi = appointments.filter((a) => a.aiSessionId).length;
  const pendingFeedback = appointments.filter((a) => a.status === "COMPLETED" && a.aiSessionId && !a.hasFeedback).length;

  const firstName = user?.fullName.split(" ")[1] ?? user?.fullName.split(" ")[0] ?? "Доктор";

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {greeting()}, {firstName} 👋
                </p>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
                  Кабинет<br />
                  <span className="text-primary">врача</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                  Управляйте записями пациентов, просматривайте AI-анализы и отслеживайте расписание в одном месте
                </p>
              </div>

              {/* Quick action buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="rounded-xl shadow-lg gap-2 px-6"
                  onClick={() => navigate(routes.doctor.schedule)}
                >
                  <Calendar className="w-5 h-5" />
                  Расписание
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl shadow-lg gap-2 px-6"
                  onClick={() => navigate("/doctor/ai-reports")}
                >
                  <Brain className="w-5 h-5" />
                  AI Отчёты
                  {withAi > 0 && (
                    <span className="ml-1 bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                      {withAi}
                    </span>
                  )}
                </Button>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-6 pt-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{todayAppts.length}</p>
                  <p className="text-xs text-muted-foreground">Сегодня</p>
                </div>
                <div className="w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{totalCompleted}</p>
                  <p className="text-xs text-muted-foreground">Завершено</p>
                </div>
                <div className="w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{appointments.length}</p>
                  <p className="text-xs text-muted-foreground">Всего записей</p>
                </div>
                {pendingFeedback > 0 && (
                  <>
                    <div className="w-px bg-border" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-500">{pendingFeedback}</p>
                      <p className="text-xs text-muted-foreground">Ждут оценки</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: floating cards */}
            <div className="hidden lg:flex flex-col gap-4">
              {/* Next appointment */}
              <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border bg-card">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {nextAppt ? "Следующий приём" : "Расписание"}
                      </p>
                      <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                        {nextAppt ? nextAppt.patientName : "Нет предстоящих записей"}
                      </p>
                      {nextAppt && (
                        <p className="text-xs text-muted-foreground">{fmt(nextAppt.startTime)}</p>
                      )}
                    </div>
                    {nextAppt && (
                      <Badge className="shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                        Скоро
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AI feedback pending */}
              <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border bg-card ml-8">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                      pendingFeedback > 0
                        ? "bg-gradient-to-br from-amber-500 to-amber-600"
                        : "bg-gradient-to-br from-emerald-500 to-emerald-600"
                    )}>
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Отчёты</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {pendingFeedback > 0
                          ? `${pendingFeedback} ждут вашей оценки`
                          : "Все отчёты оценены"}
                      </p>
                    </div>
                    <Badge className={cn("ml-auto shrink-0", pendingFeedback > 0
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
                    )}>
                      {pendingFeedback > 0 ? `${pendingFeedback}` : "✓"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Today stats */}
              <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border bg-card">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Сегодня</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {todayAppts.length > 0
                          ? `${todayAppts.length} ${todayAppts.length === 1 ? "запись" : "записей"} запланировано`
                          : "Записей на сегодня нет"}
                      </p>
                    </div>
                    <Badge className="ml-auto shrink-0 bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-200">
                      {todayAppts.length}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="container mx-auto px-4 py-12 space-y-10">

        {/* Next appointment banner */}
        {nextAppt && (
          <Card className="shadow-lg rounded-2xl border-primary/20 bg-gradient-to-r from-primary/5 to-accent/10">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Следующий приём</p>
                    <p className="text-base font-bold text-foreground mt-0.5">{nextAppt.patientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {nextAppt.type === "ONLINE" ? "Онлайн" : "Офлайн"} · {fmt(nextAppt.startTime)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl shadow-lg"
                  onClick={() => setSelectedAppt(nextAppt)}
                >
                  Открыть <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending AI feedback banner */}
        {pendingFeedback > 0 && (
          <Card className="shadow-lg rounded-2xl border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-amber-50/30 dark:from-amber-950/30 dark:to-transparent">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">AI-анализы</p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {pendingFeedback} {pendingFeedback === 1 ? "отчёт ожидает" : "отчёта ожидают"} вашей оценки
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Оценка AI помогает улучшать точность модели
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  onClick={() => navigate("/doctor/ai-reports")}
                >
                  Перейти <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appointments section */}
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-foreground">Записи пациентов</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {appointments.length > 0
                  ? `Всего ${appointments.length} записей`
                  : "Пациенты пока не записывались"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {DATE_FILTERS.map(({ id, label }) => (
                <Button
                  key={id}
                  size="sm"
                  variant={dateFilter === id ? "default" : "outline"}
                  className="rounded-full px-4 h-8 text-xs"
                  onClick={() => setDateFilter(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-3 animate-pulse text-primary/40" />
              Загрузка...
            </div>
          ) : filteredAppts.length === 0 ? (
            <Card className="border-dashed rounded-2xl">
              <CardContent className="py-16 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-semibold text-foreground text-lg">Записей нет</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {dateFilter !== "all"
                    ? "Нет записей за выбранный период"
                    : "Пациенты пока не записывались"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {scheduled.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                    Предстоящие · {scheduled.length}
                  </h3>
                  {scheduled.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appt={a}
                      onOpen={() => setSelectedAppt(a)}
                      onComplete={() => completeMutation.mutate(a.id)}
                      onNoShow={() => noShowMutation.mutate(a.id)}
                      completing={completeMutation.isPending}
                      noShowing={noShowMutation.isPending}
                      unreadCount={unreadCounts[a.id] ?? 0}
                      onChat={() => navigate(routes.doctor.chat.replace(":appointmentId", a.id))}
                    />
                  ))}
                </div>
              )}
              {past.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
                    История · {past.length}
                  </h3>
                  {past.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appt={a}
                      onOpen={() => setSelectedAppt(a)}
                      unreadCount={unreadCounts[a.id] ?? 0}
                      onChat={() => navigate(routes.doctor.chat.replace(":appointmentId", a.id))}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Patient detail modal ── */}
      {selectedAppt && (
        <PatientDetailModal
          appt={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onComplete={() => {
            const apptId = selectedAppt.id;
            const aiSessionId = selectedAppt.aiSessionId;
            completeMutation.mutate(apptId);
            setSelectedAppt(null);
            if (aiSessionId) navigate(routes.doctor.aiReport.replace(":id", apptId));
          }}
          onNoShow={() => {
            noShowMutation.mutate(selectedAppt.id);
            setSelectedAppt(null);
          }}
        />
      )}
    </div>
  );
}
