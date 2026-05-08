import { useQuery } from "@tanstack/react-query";
import { User, Calendar, Star, Activity, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { useAuthStore } from "@/features/auth/model/authStore";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import { routes } from "@/shared/config/routes";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PatientCabinetPage() {
  const { user } = useAuthStore();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: appointmentsApi.myAppointments,
  });

  const scheduled = appointments.filter((a) => a.status === "SCHEDULED");
  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const withReviews = appointments.filter((a) => a.hasReview);

  const initials = user
    ? user.fullName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "П";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Мой кабинет</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ваш профиль и история активности</p>
      </div>

      {/* Profile card */}
      <Card className="border-border">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-2xl font-bold text-teal-700 dark:text-teal-300 shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">{user?.fullName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-2 text-xs">
                <User className="w-3 h-3 mr-1" />
                Пациент
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border text-center">
          <CardContent className="pt-4 pb-3">
            <div className="flex justify-center mb-1">
              <Calendar className="w-5 h-5 text-teal-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{scheduled.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Предстоит</p>
          </CardContent>
        </Card>
        <Card className="border-border text-center">
          <CardContent className="pt-4 pb-3">
            <div className="flex justify-center mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{completed.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Завершено</p>
          </CardContent>
        </Card>
        <Card className="border-border text-center">
          <CardContent className="pt-4 pb-3">
            <div className="flex justify-center mb-1">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{withReviews.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Отзывов</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming appointments */}
      {scheduled.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Предстоящие визиты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduled.slice(0, 3).map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {appt.doctorName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {appt.specialization} · {formatDate(appt.startTime)},{" "}
                      {formatTime(appt.startTime)}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[appt.status]}`}
                  >
                    {STATUS_LABELS[appt.status]}
                  </span>
                </div>
              ))}
            </div>
            {scheduled.length > 3 && (
              <Button asChild variant="ghost" size="sm" className="w-full mt-3">
                <Link to={routes.patient.appointments}>Все записи →</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            История визитов
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : completed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Завершённых визитов пока нет</p>
          ) : (
            <div className="divide-y divide-border">
              {completed.map((appt) => (
                <div key={appt.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{appt.doctorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {appt.specialization} · {formatDate(appt.startTime)}
                      </p>
                      {appt.complaint && (
                        <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                          {appt.complaint}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {appt.hasReview && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <Star className="w-3 h-3" />
                          Отзыв оставлен
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-3">
        <Button asChild variant="outline" className="flex-1">
          <Link to={routes.patient.aiAnalysis}>
            <Activity className="w-4 h-4 mr-2" />
            Новый AI-анализ
          </Link>
        </Button>
        <Button asChild className="flex-1">
          <Link to={routes.patient.appointments}>
            <Calendar className="w-4 h-4 mr-2" />
            Мои записи
          </Link>
        </Button>
      </div>
    </div>
  );
}
