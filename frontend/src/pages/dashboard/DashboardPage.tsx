import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Calendar,
  ArrowRight,
  Stethoscope,
  ShieldCheck,
  ClipboardList,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useAuthStore } from "@/features/auth/model/authStore";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import { routes } from "@/shared/config/routes";

const FEATURES = [
  {
    icon: Stethoscope,
    title: "Кардиологический скрининг",
    description:
      "Оценка риска заболеваний сердца по клиническим показателям на основе данных реальных пациентов",
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/50",
  },
  {
    icon: ShieldCheck,
    title: "Быстрое выявление риска",
    description:
      "Система автоматически определяет тревожные симптомы и сообщает, если нужна срочная помощь",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
  },
  {
    icon: ClipboardList,
    title: "Понятный результат",
    description:
      "Вы получите чёткое объяснение, что означают ваши симптомы и что делать дальше",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
  },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: appointmentsApi.myAppointments,
  });

  const nextAppointment = appointments
    .filter((a) => a.status === "SCHEDULED")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Доброе утро";
    if (h < 17) return "Добрый день";
    return "Добрый вечер";
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting()}, {user?.fullName.split(" ")[0] ?? "Пациент"}
        </h1>
        <p className="mt-1 text-muted-foreground">Чем могу помочь сегодня?</p>
      </div>

      {/* Next appointment banner */}
      {nextAppointment && (
        <Card className="border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide">
                    Ближайшая запись
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {nextAppointment.doctorName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nextAppointment.specialization} · {formatDateTime(nextAppointment.startTime)}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400">
                <Link to={routes.patient.appointments}>Мои записи</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main CTA cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="group border-border hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 w-fit">
                <Activity className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <Badge variant="secondary" className="text-xs">
                AI
              </Badge>
            </div>
            <CardTitle className="text-lg">Проверить симптомы</CardTitle>
            <CardDescription>
              Опишите жалобы — система задаст несколько уточняющих вопросов и оценит риск
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to={routes.patient.aiAnalysis}>
                Начать проверку
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="group border-border hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 w-fit">
                <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <CardTitle className="text-lg">Запись к врачу</CardTitle>
            <CardDescription>
              Найдите специалиста и запишитесь на удобное время онлайн
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              variant="outline"
              className="w-full border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Link to={routes.patient.doctors}>
                Выбрать врача
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Как это работает</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
            <div
              key={title}
              className="flex gap-3 p-4 rounded-xl border border-border bg-card"
            >
              <div className={`p-2 rounded-lg w-fit h-fit shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground/70 border-t border-border pt-4">
        ⚕️ MedAI предоставляет предварительную оценку симптомов. Результаты не являются медицинским
        диагнозом и не заменяют консультацию врача.
      </p>
    </div>
  );
}
