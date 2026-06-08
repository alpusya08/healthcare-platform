import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stethoscope, Calendar, Clock, FileText, CheckCheck,
  Star, MessageSquare, UserCog, Phone, Mail,
  AlertCircle, TrendingUp, Users, Banknote, Shield,
  Video, Brain, CheckCircle2, X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/model/authStore";
import { doctorApi, type DoctorAppointment } from "@/features/doctor/api/doctorApi";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";

import { routes } from "@/shared/config/routes";

/* ─── helpers ─────────────────────────────────────────────────── */

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}
function isThisWeek(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return d >= startOfWeek && d <= endOfWeek;
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

/* ─── tabs ────────────────────────────────────────────────────── */

type Tab = "appointments" | "reviews" | "profile";
type DateFilter = "today" | "week" | "all";

const TABS: { id: Tab; label: string; icon: typeof Calendar }[] = [
  { id: "appointments", label: "Записи", icon: Calendar },
  { id: "reviews", label: "Отзывы", icon: Star },
  { id: "profile", label: "Профиль", icon: Users },
];

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
}: {
  appt: DoctorAppointment;
  onOpen: () => void;
  onComplete?: () => void;
  onNoShow?: () => void;
  completing?: boolean;
  noShowing?: boolean;
}) {
  const durationMin = Math.round(
    (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / 60000
  );

  return (
    <Card
      className="shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border-border hover:border-primary/30 rounded-2xl"
      onClick={onOpen}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 font-bold text-white text-sm shadow-md">
            {appt.patientName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xl text-foreground truncate">{appt.patientName}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {fmt(appt.startTime)}
                    <span className="text-muted-foreground/60">({durationMin} мин)</span>
                  </span>
                  {/* Type badge */}
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
                  <div className="mt-2.5 bg-secondary rounded-xl px-3 py-2">
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                      «{appt.complaint}»
                    </p>
                  </div>
                )}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${STATUS_COLORS[appt.status]}`}>
                {STATUS_LABELS[appt.status]}
              </span>
            </div>

            {/* Action buttons column for SCHEDULED */}
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

          {/* Patient */}
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

          {/* Details */}
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Дата и время</p>
                <p className="font-medium">{fmtDate(appt.startTime)}, {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}
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

            {/* AI analysis — redirect to full report page */}
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

          {/* Actions */}
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
                <Button variant="ghost" className="w-full rounded-xl text-muted-foreground hover:text-destructive"
                  onClick={() => { onNoShow(); onClose(); }}>
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
  const [activeTab, setActiveTab] = useState<Tab>("appointments");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedAppt, setSelectedAppt] = useState<DoctorAppointment | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["doctor", "appointments"],
    queryFn: doctorApi.myAppointments,
  });

  const { data: doctorProfile } = useQuery({
    queryKey: ["doctor", "profile"],
    queryFn: doctorApi.getProfile,
    enabled: activeTab === "profile",
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["doctor-reviews", user?.id],
    queryFn: () => appointmentsApi.doctorReviews(user!.id),
    enabled: !!user?.id && activeTab === "reviews",
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

  /* derived */
  const todayAppts = useMemo(
    () => appointments.filter((a) => a.status === "SCHEDULED" && isToday(a.startTime)),
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
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  const initials = user
    ? user.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "Д";

  const todayStr = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-background">

      {/* ── Gradient Header ── */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-primary/70 uppercase tracking-widest mb-1">Кабинет врача</p>
              <h1 className="text-3xl font-bold text-foreground">{user?.fullName}</h1>
              <p className="mt-1 text-muted-foreground">
                Добро пожаловать обратно
              </p>
            </div>
            {/* Stats chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Calendar, label: "Сегодня", value: todayAppts.length, color: "text-primary" },
                { icon: CheckCheck, label: "Завершено", value: totalCompleted, color: "text-success" },
                { icon: Users, label: "Всего", value: appointments.length, color: "text-info" },
                { icon: FileText, label: "AI-анализ", value: withAi, color: "text-warning" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/80 border border-border shadow-sm">
                  <Icon className={cn("w-4 h-4", color)} />
                  <span className="text-sm font-bold text-foreground">{value}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">

        {/* ── Today Banner ── */}
        {todayAppts.length > 0 && activeTab === "appointments" && (
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground capitalize">{todayStr}</p>
                <p className="text-sm text-muted-foreground">
                  Запланировано приёмов сегодня
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold text-primary">{todayAppts.length}</p>
              <p className="text-xs text-muted-foreground">{todayAppts.length === 1 ? "приём" : "приёма"}</p>
            </div>
          </div>
        )}

        {/* ── Custom Tab Buttons ── */}
        <div className="flex gap-2 p-1.5 rounded-2xl bg-secondary/50 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                activeTab === id
                  ? "bg-primary text-white shadow-lg"
                  : "hover:bg-secondary text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === "appointments" && appointments.length > 0 && (
                <span className={cn(
                  "ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold",
                  activeTab === id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                )}>
                  {appointments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Appointments ── */}
        {activeTab === "appointments" && (
          <div className="space-y-6">
            {/* Date filter buttons */}
            <div className="flex items-center gap-2">
              {DATE_FILTERS.map(({ id, label }) => (
                <Button
                  key={id}
                  size="sm"
                  variant={dateFilter === id ? "default" : "outline"}
                  className="rounded-full px-5"
                  onClick={() => setDateFilter(id)}
                >
                  {label}
                </Button>
              ))}
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
                    {dateFilter !== "all" ? "Нет записей за выбранный период" : "Пациенты пока не записывались"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {scheduled.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                      Предстоящие · {scheduled.length}
                    </h2>
                    {scheduled.map((a) => (
                      <AppointmentCard
                        key={a.id}
                        appt={a}
                        onOpen={() => setSelectedAppt(a)}
                        onComplete={() => completeMutation.mutate(a.id)}
                        onNoShow={() => noShowMutation.mutate(a.id)}
                        completing={completeMutation.isPending}
                        noShowing={noShowMutation.isPending}
                      />
                    ))}
                  </div>
                )}
                {past.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
                      История · {past.length}
                    </h2>
                    {past.map((a) => (
                      <AppointmentCard
                        key={a.id}
                        appt={a}
                        onOpen={() => setSelectedAppt(a)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Reviews ── */}
        {activeTab === "reviews" && (
          <div className="space-y-6">
            {/* Centered rating display */}
            {reviews.length > 0 && (
              <Card className="shadow-lg rounded-2xl border-border">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3">
                      <Star className="w-10 h-10 fill-amber-400 text-amber-400" />
                      <span className="text-5xl font-bold text-foreground">{avgRating}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-5 h-5",
                            parseFloat(avgRating) >= i ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      На основе {reviews.length} {reviews.length === 1 ? "отзыва" : "отзывов"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" />
                  Отзывы пациентов
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Загрузка...</p>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="font-semibold text-foreground">Отзывов пока нет</p>
                    <p className="text-sm text-muted-foreground mt-1">Завершите приёмы, чтобы получить отзывы</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {reviews.map((review) => (
                      <div key={review.id} className="py-5 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-sm font-bold text-white shrink-0">
                              {review.patientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{review.patientName}</p>
                              <p className="text-xs text-muted-foreground">{fmtDate(review.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} className={cn("w-4 h-4", i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <div className="mt-3 pl-13 ml-13">
                            <p className="text-sm text-muted-foreground leading-relaxed bg-secondary rounded-xl px-4 py-3 italic">
                              «{review.comment}»
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Tab: Profile ── */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile card */}
            <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
              <CardContent className="pt-8 pb-6">
                <div className="flex flex-col items-center text-center gap-4">
                  {/* Avatar with initials */}
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{user?.fullName}</h2>
                    {/* Badge row */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      {doctorProfile && (
                        <Badge variant="secondary" className="rounded-xl">
                          <Stethoscope className="w-3 h-3 mr-1" />
                          {doctorProfile.specialization}
                        </Badge>
                      )}
                      {doctorProfile?.verified && (
                        <Badge className="rounded-xl bg-info/10 text-info border-info/20">
                          <Shield className="w-3 h-3 mr-1" />
                          Верифицирован
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Separator className="w-full" />
                  <div className="w-full space-y-2.5 text-left">
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 shrink-0 text-primary/60" />
                      <span className="truncate">{user?.email}</span>
                    </div>
                    {doctorProfile?.consultationFee != null && (
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Banknote className="w-4 h-4 shrink-0 text-primary/60" />
                        <span>{doctorProfile.consultationFee.toLocaleString("ru-RU")} ₸</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 w-full pt-1">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl text-sm"
                      onClick={() => navigate("/doctor/profile")}
                    >
                      Редактировать
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl text-sm"
                      onClick={() => navigate("/doctor/schedule")}
                    >
                      <Calendar className="w-3.5 h-3.5 mr-1.5" />
                      Расписание
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info panel */}
            <div className="lg:col-span-2 space-y-5">
              {doctorProfile ? (
                <>
                  {/* 4 stat cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Опыт", value: `${doctorProfile.yearsExperience} лет`, icon: TrendingUp, color: "text-primary" },
                      { label: "Консультаций", value: totalCompleted, icon: Users, color: "text-info" },
                      { label: "Рейтинг", value: doctorProfile.averageRating > 0 ? `★ ${Number(doctorProfile.averageRating).toFixed(1)}` : "—", icon: Star, color: "text-warning" },
                      { label: "Стоимость", value: doctorProfile.consultationFee ? `${Number(doctorProfile.consultationFee).toLocaleString("ru-RU")} ₸` : "—", icon: Banknote, color: "text-success" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <Card key={label} className="shadow-lg hover:shadow-xl transition-all rounded-xl border-border text-center">
                        <CardContent className="pt-4 pb-3">
                          <Icon className={cn("w-5 h-5 mx-auto mb-1.5", color)} />
                          <p className="text-lg font-bold text-foreground">{value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Professional info */}
                  <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Профессиональная информация</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0 text-sm">
                      {[
                        { label: "Специализация", value: doctorProfile.specialization },
                        { label: "Номер лицензии", value: doctorProfile.licenseNumber },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-2.5 border-b border-border last:border-0">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground">{value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Bio section */}
                  {doctorProfile.bio && (
                    <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">О враче</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{doctorProfile.bio}</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <div className="text-center">
                    <UserCog className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
                    <p>Загрузка профиля...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
              if (aiSessionId) {
                navigate(routes.doctor.aiReport.replace(":id", apptId));
              }
            }}
            onNoShow={() => {
              noShowMutation.mutate(selectedAppt.id);
              setSelectedAppt(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
