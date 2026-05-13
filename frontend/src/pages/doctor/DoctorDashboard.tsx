import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stethoscope, Calendar, Clock, FileText, CheckCheck,
  Star, MessageSquare, LayoutGrid, UserCog, Phone, Mail,
  AlertCircle, TrendingUp, Users, Banknote, Shield,
  ChevronRight, Filter,
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
import { DoctorFeedbackModal } from "./DoctorFeedbackModal";

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
  SCHEDULED: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200",
  NO_SHOW: "bg-muted text-muted-foreground border-border",
} as const;

/* ─── tabs ────────────────────────────────────────────────────── */

type Tab = "appointments" | "reviews" | "profile";
type DateFilter = "today" | "week" | "all";

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "appointments", label: "Записи", icon: LayoutGrid },
  { id: "reviews", label: "Отзывы", icon: MessageSquare },
  { id: "profile", label: "Профиль", icon: UserCog },
];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "today", label: "Сегодня" },
  { id: "week", label: "Эта неделя" },
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
      className="border-border hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm transition-all duration-150 cursor-pointer"
      onClick={onOpen}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center shrink-0 font-bold text-teal-700 dark:text-teal-300 text-sm">
            {appt.patientName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{appt.patientName}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {fmt(appt.startTime)}
                    <span className="text-muted-foreground/60">({durationMin} мин)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" />
                    {appt.type === "ONLINE" ? "Онлайн" : "Очно"}
                  </span>
                  {appt.aiSessionId && (
                    <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium">
                      <FileText className="w-3 h-3" />
                      AI-анализ
                    </span>
                  )}
                </div>
                {appt.complaint && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
                    «{appt.complaint}»
                  </p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${STATUS_COLORS[appt.status]}`}>
                {STATUS_LABELS[appt.status]}
              </span>
            </div>

            {appt.status === "SCHEDULED" && (onComplete || onNoShow) && (
              <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                {onComplete && (
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1 sm:flex-none"
                    onClick={onComplete} disabled={completing}>
                    <CheckCheck className="w-3 h-3 mr-1" />
                    Завершить приём
                  </Button>
                )}
                {onNoShow && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={onNoShow} disabled={noShowing}>
                    <AlertCircle className="w-3 h-3 mr-1" />
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
  onFeedback,
}: {
  appt: DoctorAppointment;
  onClose: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onFeedback: () => void;
}) {
  const durationMin = Math.round(
    (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / 60000
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-foreground">Карточка приёма</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
          </div>

          {/* Patient */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center font-bold text-teal-700 dark:text-teal-300 shrink-0">
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
            {appt.aiSessionId && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-sm text-teal-700 dark:text-teal-300">
                <FileText className="w-4 h-4 shrink-0" />
                У пациента есть AI-анализ симптомов
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {appt.status === "SCHEDULED" && (
              <>
                <Button className="w-full" onClick={() => { onComplete(); onClose(); }}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Завершить приём
                </Button>
                {!appt.hasFeedback && (
                  <Button variant="outline" className="w-full" onClick={() => { onFeedback(); onClose(); }}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Оставить комментарий к AI-отчёту
                  </Button>
                )}
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive"
                  onClick={() => { onNoShow(); onClose(); }}>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Пациент не явился
                </Button>
              </>
            )}
            {appt.status === "COMPLETED" && !appt.hasFeedback && (
              <Button variant="outline" className="w-full" onClick={() => { onFeedback(); onClose(); }}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Оставить комментарий к AI-отчёту
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
  const [activeTab, setActiveTab] = useState<Tab>("appointments");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedAppt, setSelectedAppt] = useState<DoctorAppointment | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<DoctorAppointment | null>(null);
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

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Панель врача</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Добро пожаловать, {user?.fullName?.split(" ")[0]}
          </p>
        </div>
        {todayAppts.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-sm text-teal-700 dark:text-teal-300">
            <Clock className="w-4 h-4 shrink-0" />
            Сегодня: <strong>{todayAppts.length}</strong> {todayAppts.length === 1 ? "приём" : "приёма"}
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Calendar,    label: "Сегодня",         value: todayAppts.length,   color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/40" },
          { icon: CheckCheck,  label: "Завершено",        value: totalCompleted,      color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
          { icon: Users,       label: "Всего записей",   value: appointments.length, color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/40" },
          { icon: FileText,    label: "С AI-анализом",   value: withAi,              color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/40" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label} className="border-border">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg} shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Today's schedule ── */}
      {todayAppts.length > 0 && activeTab === "appointments" && (
        <Card className="border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-teal-700 dark:text-teal-300">
              <Clock className="w-4 h-4" />
              Расписание на сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayAppts.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setSelectedAppt(a)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-teal-300 cursor-pointer transition-colors"
                >
                  <div className="text-sm font-mono font-bold text-teal-700 dark:text-teal-300 shrink-0 w-12 text-center">
                    {fmtTime(a.startTime)}
                  </div>
                  <div className="w-px h-8 bg-teal-200 dark:bg-teal-800 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.type === "ONLINE" ? "Онлайн" : "Очно"}
                      {a.complaint ? ` · ${a.complaint}` : ""}
                    </p>
                  </div>
                  {a.aiSessionId && <FileText className="w-3.5 h-3.5 text-teal-500 shrink-0" />}
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === "appointments" && appointments.length > 0 && (
              <span className="ml-1 text-xs bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 px-1.5 rounded-full">
                {appointments.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Appointments ── */}
      {activeTab === "appointments" && (
        <>
          {/* Date filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex gap-1">
              {DATE_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setDateFilter(id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                    dateFilter === id
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "border-border text-muted-foreground hover:border-teal-400 hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
          ) : filteredAppts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="font-medium text-foreground">Записей нет</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {dateFilter !== "all" ? "Нет записей за выбранный период" : "Пациенты пока не записывались"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {scheduled.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
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
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
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
        </>
      )}

      {/* ── Tab: Reviews ── */}
      {activeTab === "reviews" && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Отзывы пациентов
              {reviews.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5 text-sm font-normal">
                  <div className="flex">
                    {[1,2,3,4,5].map((i) => (
                      <Star key={i} className={cn("w-3.5 h-3.5", parseFloat(avgRating) >= i ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                  <span className="font-bold text-foreground">{avgRating}</span>
                  <span className="text-muted-foreground">({reviews.length})</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Загрузка...</p>
            ) : reviews.length === 0 ? (
              <div className="text-center py-10">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Отзывов пока нет</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {reviews.map((review) => (
                  <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-sm font-bold text-teal-700 dark:text-teal-300">
                          {review.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{review.patientName}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(review.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} className={cn("w-3.5 h-3.5", i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed pl-11 italic">
                        «{review.comment}»
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Profile ── */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Profile card */}
          <Card className="border-border">
            <CardContent className="pt-6 pb-5">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-3xl font-bold text-white shadow-md">
                  {initials}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{user?.fullName}</h2>
                  {doctorProfile && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      <Stethoscope className="w-3 h-3 mr-1" />
                      {doctorProfile.specialization}
                    </Badge>
                  )}
                  {doctorProfile?.verified && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-teal-600 dark:text-teal-400">
                      <Shield className="w-3 h-3" />
                      Верифицирован
                    </div>
                  )}
                </div>
                <Separator className="w-full" />
                <div className="w-full space-y-2 text-left">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{user?.email}</span>
                  </div>
                  {doctorProfile?.consultationFee != null && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Banknote className="w-4 h-4 shrink-0" />
                      <span>{doctorProfile.consultationFee.toLocaleString("ru-RU")} ₸</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info panel */}
          <div className="lg:col-span-2 space-y-4">
            {doctorProfile ? (
              <>
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Профессиональная информация</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {[
                      { label: "Специализация",   value: doctorProfile.specialization },
                      { label: "Опыт работы",      value: `${doctorProfile.yearsExperience} лет` },
                      { label: "Номер лицензии",   value: doctorProfile.licenseNumber },
                      { label: "Рейтинг",          value: doctorProfile.averageRating > 0 ? `★ ${Number(doctorProfile.averageRating).toFixed(1)}` : "Нет оценок" },
                      { label: "Стоимость приёма", value: doctorProfile.consultationFee ? `${Number(doctorProfile.consultationFee).toLocaleString("ru-RU")} ₸` : "Не указана" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {doctorProfile.bio && (
                  <Card className="border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">О враче</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{doctorProfile.bio}</p>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                      Статистика
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { value: appointments.length, label: "Всего записей" },
                        { value: totalCompleted,       label: "Завершено" },
                        { value: reviews.length > 0 ? avgRating : "—", label: "Средний рейтинг" },
                      ].map(({ value, label }) => (
                        <div key={label} className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xl font-bold text-foreground">{value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">Загрузка профиля...</div>
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
            completeMutation.mutate(selectedAppt.id);
            setSelectedAppt(null);
          }}
          onNoShow={() => {
            noShowMutation.mutate(selectedAppt.id);
            setSelectedAppt(null);
          }}
          onFeedback={() => {
            setFeedbackTarget(selectedAppt);
            setSelectedAppt(null);
          }}
        />
      )}

      {/* ── Feedback modal ── */}
      {feedbackTarget && (
        <DoctorFeedbackModal
          appointment={feedbackTarget}
          onClose={() => setFeedbackTarget(null)}
          onSuccess={() => {
            setFeedbackTarget(null);
            queryClient.invalidateQueries({ queryKey: ["doctor", "appointments"] });
          }}
        />
      )}
    </div>
  );
}
