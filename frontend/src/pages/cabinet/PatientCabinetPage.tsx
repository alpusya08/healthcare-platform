import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  User, Calendar, Star, Activity, Clock, CheckCircle2,
  ArrowRight, Heart, Shield, ChevronRight, Phone, Mail, Pencil, X, Check, Video,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { Input } from "@/shared/ui/input";
import { useAuthStore } from "@/features/auth/model/authStore";
import { authApi } from "@/features/auth/api/authApi";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import { routes } from "@/shared/config/routes";
import { AppointmentDetailModal } from "@/widgets/appointment-detail/AppointmentDetailModal";
import type { Appointment } from "@/features/appointments/types";

const STATUS_LABELS = {
  SCHEDULED: "Запланировано",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  NO_SHOW: "Не явился",
} as const;

const STATUS_COLORS = {
  SCHEDULED: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  NO_SHOW: "bg-muted text-muted-foreground",
} as const;

const HEALTH_TIPS = [
  { icon: Heart,  color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/40",    tip: "Пейте 1.5–2 литра воды в день для нормальной работы организма" },
  { icon: Shield, color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/40",    tip: "Регулярные прогулки 30 мин снижают риск сердечно-сосудистых заболеваний" },
  { icon: Clock,  color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/40", tip: "7–9 часов сна в сутки — основа крепкого иммунитета" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function PatientCabinetPage() {
  const { user, updateUser } = useAuthStore();
  const [detailTarget, setDetailTarget] = useState<Appointment | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(user?.fullName ?? "");
  const [editPhone, setEditPhone] = useState(user?.phone ?? "");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: appointmentsApi.myAppointments,
  });

  const updateProfileMutation = useMutation({
    mutationFn: () => authApi.updateProfile({ fullName: editName.trim(), phone: editPhone.trim() || undefined }),
    onSuccess: (updated) => {
      updateUser({ fullName: updated.fullName, phone: updated.phone });
      setEditMode(false);
      toast.success("Профиль обновлён");
    },
    onError: () => toast.error("Не удалось сохранить изменения"),
  });

  const scheduled = appointments.filter((a) => a.status === "SCHEDULED");
  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const withReviews = appointments.filter((a) => a.hasReview);

  const initials = user
    ? user.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "П";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Мой кабинет</h1>
        <p className="mt-1 text-sm text-muted-foreground">Профиль, история визитов и рекомендации</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Profile card */}
          <Card className="border-border">
            <CardContent className="pt-6 pb-5">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-3xl font-bold text-white shadow-md">
                  {initials}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{user?.fullName}</h2>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    <User className="w-3 h-3 mr-1" />
                    Пациент
                  </Badge>
                </div>
                <Separator className="w-full" />
                {editMode ? (
                  <div className="w-full space-y-3 text-left">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Имя</label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Телефон</label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+7 (___) ___-__-__"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => updateProfileMutation.mutate()}
                        disabled={updateProfileMutation.isPending || !editName.trim()}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Сохранить
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditMode(false); setEditName(user?.fullName ?? ""); setEditPhone(user?.phone ?? ""); }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full space-y-2 text-left">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="truncate">{user?.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 shrink-0" />
                      {user?.phone
                        ? <span>{user.phone}</span>
                        : <span className="text-muted-foreground/60 italic">Не указан</span>
                      }
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => { setEditMode(true); setEditName(user?.fullName ?? ""); setEditPhone(user?.phone ?? ""); }}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-2" />
                      Редактировать профиль
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-border text-center">
              <CardContent className="pt-3 pb-3">
                <Calendar className="w-4 h-4 text-teal-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{scheduled.length}</p>
                <p className="text-[10px] text-muted-foreground">Предстоит</p>
              </CardContent>
            </Card>
            <Card className="border-border text-center">
              <CardContent className="pt-3 pb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{completed.length}</p>
                <p className="text-[10px] text-muted-foreground">Завершено</p>
              </CardContent>
            </Card>
            <Card className="border-border text-center">
              <CardContent className="pt-3 pb-3">
                <Star className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{withReviews.length}</p>
                <p className="text-[10px] text-muted-foreground">Отзывов</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <div className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to={routes.patient.aiAnalysis}>
                <Activity className="w-4 h-4 mr-2 text-teal-600" />
                Новый AI-анализ
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to={routes.patient.doctors}>
                <User className="w-4 h-4 mr-2 text-emerald-600" />
                Найти врача
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to={routes.patient.appointments}>
                <Calendar className="w-4 h-4 mr-2 text-violet-600" />
                Мои записи
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
              </Link>
            </Button>
          </div>

          {/* Health tips */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                Советы для здоровья
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {HEALTH_TIPS.map(({ icon: Icon, color, bg, tip }) => (
                <div key={tip} className="flex gap-3 items-start">
                  <div className={`p-1.5 rounded-lg ${bg} shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Upcoming appointments */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Предстоящие визиты
                </CardTitle>
                {scheduled.length > 3 && (
                  <Link to={routes.patient.appointments} className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
                    Все <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {scheduled.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">Нет предстоящих записей</p>
                  <Button asChild size="sm" variant="outline">
                    <Link to={routes.patient.doctors}>Записаться к врачу</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {scheduled.slice(0, 4).map((appt) => (
                    <div key={appt.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
                      <div
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        onClick={() => setDetailTarget(appt)}
                      >
                        <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{appt.doctorName}</p>
                          <p className="text-xs text-muted-foreground">{appt.specialization} · {formatDate(appt.startTime)}, {formatTime(appt.startTime)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {appt.type === "ONLINE" && appt.meetingLink && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white px-2"
                            onClick={() => window.open(appt.meetingLink, "_blank", "noopener,noreferrer")}
                          >
                            <Video className="w-3 h-3 mr-1" />
                            Подключиться
                          </Button>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[appt.status]}`}>
                          {STATUS_LABELS[appt.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visit history */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                История визитов
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Загрузка...</p>
              ) : completed.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Завершённых визитов пока нет</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {completed.map((appt) => (
                    <div key={appt.id} onClick={() => setDetailTarget(appt)} className="py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{appt.doctorName}</p>
                            <p className="text-xs text-muted-foreground">{appt.specialization} · {formatDate(appt.startTime)}</p>
                            {appt.complaint && (
                              <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">«{appt.complaint}»</p>
                            )}
                          </div>
                        </div>
                        {appt.hasReview && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 shrink-0">
                            <Star className="w-3 h-3 fill-current" />
                            Отзыв
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AppointmentDetailModal
        appointment={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </div>
  );
}
