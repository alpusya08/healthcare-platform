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
import { ReviewModal } from "@/widgets/review-modal/ReviewModal";
import type { Appointment } from "@/features/appointments/types";

const HEALTH_TIPS = [
  { icon: Heart,  color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/40",    tip: "Пейте 1.5–2 литра воды в день для нормальной работы организма" },
  { icon: Shield, color: "text-primary",    bg: "bg-blue-50 dark:bg-blue-950/40",    tip: "Регулярные прогулки 30 мин снижают риск сердечно-сосудистых заболеваний" },
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
  const [reviewTarget, setReviewTarget] = useState<Appointment | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(user?.fullName ?? "");
  const [editPhone, setEditPhone] = useState(user?.phone ?? "");
  const [editBirthDate, setEditBirthDate] = useState(user?.birthDate ?? "");
  const [editGender, setEditGender] = useState(user?.gender ?? "");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: appointmentsApi.myAppointments,
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success("Пароль изменён. Войдите заново.");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: () => toast.error("Неверный текущий пароль"),
  });

  const updateProfileMutation = useMutation({
    mutationFn: () => authApi.updateProfile({
      fullName: editName.trim(),
      phone: editPhone.trim() || undefined,
      birthDate: editBirthDate || null,
      gender: editGender || null,
    }),
    onSuccess: (updated) => {
      updateUser({ fullName: updated.fullName, phone: updated.phone, birthDate: updated.birthDate, gender: updated.gender });
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
    <div>
      {/* Gradient header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-foreground">Личный кабинет</h1>
          <p className="mt-2 text-muted-foreground">Профиль, история визитов и рекомендации</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── SIDEBAR (col-1) ─────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Profile card */}
            <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border">
              <CardContent className="pt-8 pb-6">
                <div className="flex flex-col items-center text-center gap-4">
                  {/* Large circular avatar */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-4xl font-bold text-white shadow-md">
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{user?.fullName}</h2>
                    <Badge variant="secondary" className="mt-2 rounded-xl">
                      <User className="w-3 h-3 mr-1" />
                      Пациент
                    </Badge>
                  </div>

                  <Separator className="w-full" />

                  {editMode ? (
                    <div className="w-full space-y-3 text-left">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">Имя</label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9 text-sm rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">Телефон</label>
                        <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+7 (___) ___-__-__" className="h-9 text-sm rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">Дата рождения</label>
                        <Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="h-9 text-sm rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">Пол</label>
                        <select
                          value={editGender}
                          onChange={(e) => setEditGender(e.target.value)}
                          className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Не указан</option>
                          <option value="MALE">Мужской</option>
                          <option value="FEMALE">Женский</option>
                          <option value="OTHER">Другой</option>
                        </select>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 rounded-xl"
                          onClick={() => updateProfileMutation.mutate()}
                          disabled={updateProfileMutation.isPending || !editName.trim()}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Сохранить
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setEditMode(false);
                            setEditName(user?.fullName ?? "");
                            setEditPhone(user?.phone ?? "");
                            setEditBirthDate(user?.birthDate ?? "");
                            setEditGender(user?.gender ?? "");
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-3 text-left">
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 shrink-0 text-primary/70" />
                        <span className="truncate">{user?.email}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 shrink-0 text-primary/70" />
                        {user?.phone
                          ? <span>{user.phone}</span>
                          : <span className="italic opacity-50">Не указан</span>
                        }
                      </div>
                      {user?.birthDate && (
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 shrink-0 text-primary/70" />
                          <span>{new Date(user.birthDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
                        </div>
                      )}
                      {user?.gender && (
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                          <User className="w-4 h-4 shrink-0 text-primary/70" />
                          <span>{{ MALE: "Мужской", FEMALE: "Женский", OTHER: "Другой" }[user.gender]}</span>
                        </div>
                      )}
                      {(!user?.birthDate || !user?.gender) && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2 mt-1 leading-relaxed">
                          Заполните дату рождения и пол — это поможет AI-анализу дать более точный результат
                        </p>
                      )}

                      <div className="pt-1 space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full rounded-xl"
                          onClick={() => {
                            setEditMode(true);
                            setEditName(user?.fullName ?? "");
                            setEditPhone(user?.phone ?? "");
                            setEditBirthDate(user?.birthDate ?? "");
                            setEditGender(user?.gender ?? "");
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" />
                          Редактировать профиль
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full rounded-xl text-muted-foreground"
                          onClick={() => setShowPasswordForm((v) => !v)}
                        >
                          <Shield className="w-3.5 h-3.5 mr-2" />
                          Сменить пароль
                        </Button>
                      </div>

                      {showPasswordForm && (
                        <div className="mt-2 space-y-2 p-4 border border-border rounded-xl bg-muted/30">
                          <Input
                            type="password"
                            placeholder="Текущий пароль"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="h-9 text-sm rounded-xl"
                          />
                          <Input
                            type="password"
                            placeholder="Новый пароль (мин. 8 символов)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="h-9 text-sm rounded-xl"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 rounded-xl"
                              disabled={!currentPassword || newPassword.length < 8 || changePasswordMutation.isPending}
                              onClick={() => changePasswordMutation.mutate()}
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              {changePasswordMutation.isPending ? "..." : "Сохранить"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPassword(""); }}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats card */}
            <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Предстоящих</p>
                      <p className="text-xl font-bold text-foreground">{scheduled.length}</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Завершено</p>
                      <p className="text-xl font-bold text-foreground">{completed.length}</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                      <Star className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Отзывов</p>
                      <p className="text-xl font-bold text-foreground">{withReviews.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <div className="space-y-2">
              <Button asChild className="w-full justify-start rounded-xl" variant="outline">
                <Link to={routes.patient.aiAnalysis}>
                  <Activity className="w-4 h-4 mr-2 text-primary" />
                  Новый AI-анализ
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
                </Link>
              </Button>
              <Button asChild className="w-full justify-start rounded-xl" variant="outline">
                <Link to={routes.patient.doctors}>
                  <User className="w-4 h-4 mr-2 text-emerald-600" />
                  Найти врача
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
                </Link>
              </Button>
              <Button asChild className="w-full justify-start rounded-xl" variant="outline">
                <Link to={routes.patient.appointments}>
                  <Calendar className="w-4 h-4 mr-2 text-violet-600" />
                  Мои записи
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
                </Link>
              </Button>
            </div>

            {/* Health tips card */}
            <Card className="shadow-lg hover:shadow-xl rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  Советы для здоровья
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {HEALTH_TIPS.map(({ icon: Icon, color, bg, tip }) => (
                  <div key={tip} className="flex gap-3 items-start">
                    <div className={`p-2 rounded-xl ${bg} shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── MAIN (col-span-2) ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Upcoming appointments */}
            <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Ближайшие приёмы
                  </CardTitle>
                  {scheduled.length > 3 && (
                    <Link
                      to={routes.patient.appointments}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Все <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {scheduled.length === 0 ? (
                  <div className="text-center py-10">
                    <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">Нет предстоящих записей</p>
                    <Button asChild size="sm" variant="outline" className="rounded-xl">
                      <Link to={routes.patient.doctors}>Записаться к врачу</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {scheduled.slice(0, 4).map((appt) => (
                      <div
                        key={appt.id}
                        className="p-4 rounded-2xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all cursor-pointer"
                        onClick={() => setDetailTarget(appt)}
                      >
                        {/* Type badge */}
                        <div className="flex items-center justify-between mb-3">
                          <Badge
                            variant={appt.type === "ONLINE" ? "info" : "secondary"}
                            className="rounded-xl text-xs"
                          >
                            {appt.type === "ONLINE" ? "Онлайн" : "Офлайн"}
                          </Badge>
                          {appt.type === "ONLINE" && appt.meetingLink && (
                            <Button
                              size="sm"
                              className="h-7 text-xs rounded-xl gap-1 bg-primary/90 hover:bg-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(appt.meetingLink, "_blank", "noopener,noreferrer");
                              }}
                            >
                              <Video className="w-3 h-3" />
                              Войти
                            </Button>
                          )}
                        </div>
                        <p className="font-medium text-sm text-foreground truncate">{appt.doctorName}</p>
                        <p className="text-xs text-muted-foreground truncate">{appt.specialization}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{formatDate(appt.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{formatTime(appt.startTime)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Visit history */}
            <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  История приёмов
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Загрузка...</p>
                ) : completed.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Завершённых визитов пока нет</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {completed.map((appt) => (
                      <div key={appt.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setDetailTarget(appt)}
                          >
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{appt.doctorName}</p>
                              <p className="text-xs text-muted-foreground">{appt.specialization}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(appt.startTime)}</p>
                              {appt.complaint && (
                                <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">«{appt.complaint}»</p>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {appt.hasReview ? (
                              <Badge variant="warning" className="rounded-xl gap-1 text-xs">
                                <Star className="w-3 h-3 fill-current" />
                                Оценено
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs rounded-xl border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 gap-1"
                                onClick={() => setReviewTarget(appt)}
                              >
                                <Star className="w-3 h-3" />
                                Оценить
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AppointmentDetailModal
        appointment={detailTarget}
        onClose={() => setDetailTarget(null)}
      />

      {reviewTarget && (
        <ReviewModal
          appointmentId={reviewTarget.id}
          doctorName={reviewTarget.doctorName}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
}
