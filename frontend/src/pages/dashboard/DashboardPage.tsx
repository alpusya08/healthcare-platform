import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity, Calendar, ArrowRight, Brain, Heart, Stethoscope, Bone,
  Wind, Ear, Scissors, Syringe, Clock, Search,
  ChevronRight, AlertCircle, Pill, Eye, Shield, Zap,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { useAuthStore } from "@/features/auth/model/authStore";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import { routes } from "@/shared/config/routes";

const SPECIALIZATIONS = [
  { code: "therapy",          label: "Терапия",           icon: Stethoscope, color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/40",     border: "hover:border-blue-300 dark:hover:border-blue-700" },
  { code: "cardiology",       label: "Кардиология",       icon: Heart,       color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/40",      border: "hover:border-rose-300 dark:hover:border-rose-700" },
  { code: "neurology",        label: "Неврология",        icon: Brain,       color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/40",  border: "hover:border-violet-300 dark:hover:border-violet-700" },
  { code: "gastroenterology", label: "Гастроэнтерология", icon: Pill,        color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/40",    border: "hover:border-amber-300 dark:hover:border-amber-700"  },
  { code: "orthopedics",      label: "Ортопедия",         icon: Bone,        color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950/40",  border: "hover:border-orange-300 dark:hover:border-orange-700" },
  { code: "dermatology",      label: "Дерматология",      icon: Eye,         color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/40",      border: "hover:border-pink-300 dark:hover:border-pink-700"    },
  { code: "pulmonology",      label: "Пульмонология",     icon: Wind,        color: "text-sky-600",     bg: "bg-sky-50 dark:bg-sky-950/40",        border: "hover:border-sky-300 dark:hover:border-sky-700"      },
  { code: "endocrinology",    label: "Эндокринология",    icon: Syringe,     color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "hover:border-emerald-300 dark:hover:border-emerald-700" },
  { code: "otolaryngology",   label: "ЛОР",               icon: Ear,         color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-950/40",  border: "hover:border-indigo-300 dark:hover:border-indigo-700" },
  { code: "surgery",          label: "Хирургия",          icon: Scissors,    color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/40",        border: "hover:border-red-300 dark:hover:border-red-700"      },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Опишите симптомы",    desc: "Расскажите своими словами что вас беспокоит" },
  { step: "02", title: "AI задаёт вопросы",   desc: "Система уточняет детали: характер, длительность, сопутствующие симптомы" },
  { step: "03", title: "Получите заключение", desc: "Оценка симптомов, возможные причины и рекомендованный специалист" },
  { step: "04", title: "Запишитесь к врачу",  desc: "Сразу видите свободные слоты подходящих врачей и бронируете онлайн" },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: appointmentsApi.myAppointments,
  });

  const { data: allDoctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => appointmentsApi.listDoctors(),
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`${routes.patient.doctors}?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: Greeting + CTAs + stats */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-primary uppercase tracking-widest">
                  {greeting()}, {user?.fullName.split(" ")[0] ?? "Пациент"} 👋
                </p>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
                  Медицина<br />
                  <span className="text-primary">нового уровня</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                  AI-диагностика симптомов, запись к лучшим специалистам и история визитов — всё в одном месте
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="rounded-xl shadow-lg gap-2 px-6"
                  onClick={() => navigate(routes.patient.aiAnalysis)}
                >
                  <Brain className="w-5 h-5" />
                  AI-Диагностика
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl shadow-lg gap-2 px-6"
                  onClick={() => navigate(routes.patient.doctors)}
                >
                  <Stethoscope className="w-5 h-5" />
                  Найти врача
                </Button>
              </div>

              {/* Mini stats */}
              <div className="flex flex-wrap gap-6 pt-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{allDoctors.length}</p>
                  <p className="text-xs text-muted-foreground">врачей</p>
                </div>
                <div className="w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">4.8★</p>
                  <p className="text-xs text-muted-foreground">Рейтинг</p>
                </div>
                <div className="w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">10</p>
                  <p className="text-xs text-muted-foreground">Специализаций</p>
                </div>
              </div>
            </div>

            {/* Right: Floating cards (hidden on mobile) */}
            <div className="hidden lg:flex flex-col gap-4 relative">
              {/* Appointment card */}
              <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border bg-card">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {nextAppointment ? "Ближайший приём" : "Запись к врачу"}
                      </p>
                      <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                        {nextAppointment ? nextAppointment.doctorName : "Нет предстоящих записей"}
                      </p>
                      {nextAppointment && (
                        <p className="text-xs text-muted-foreground">{formatDateTime(nextAppointment.startTime)}</p>
                      )}
                    </div>
                    {nextAppointment && (
                      <Badge variant="info" className="shrink-0">Скоро</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Health status card */}
              <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border bg-card ml-8">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Статус здоровья</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">AI-мониторинг активен</p>
                    </div>
                    <Badge variant="success" className="ml-auto shrink-0">ОК</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Review quote card */}
              <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border bg-card">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        "Сервис помог быстро найти нужного специалиста. AI-анализ был точным!"
                      </p>
                      <p className="text-xs font-medium text-foreground mt-1.5">— Пациент MedAI</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-16">

        {/* ── Next Appointment Banner ────────────────────────────────── */}
        {nextAppointment && (
          <Card className="shadow-lg rounded-2xl border-primary/20 bg-gradient-to-r from-primary/5 to-accent/10">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Ближайшая запись</p>
                    <p className="text-base font-bold text-foreground mt-0.5">{nextAppointment.doctorName}</p>
                    <p className="text-sm text-muted-foreground">{nextAppointment.specialization} · {formatDateTime(nextAppointment.startTime)}</p>
                  </div>
                </div>
                <Button asChild size="sm" className="rounded-xl shadow-lg">
                  <Link to={routes.patient.appointments}>
                    Перейти <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Features Bento Grid ───────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/20 border-violet-200 dark:border-violet-800 group">
            <CardContent className="pt-6 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-foreground">AI-Диагностика</h3>
                <Badge variant="info" className="text-xs">94%</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Интеллектуальный анализ симптомов с точностью 94% и рекомендацией специалиста
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800 group">
            <CardContent className="pt-6 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-foreground">Безопасность</h3>
                <Badge variant="success" className="text-xs">ISO</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Данные защищены по стандарту ISO 27001. Полная конфиденциальность медицинской информации
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200 dark:border-amber-800 group">
            <CardContent className="pt-6 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-foreground">Быстрая запись</h3>
                <Badge variant="warning" className="text-xs">24/7</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Запишитесь к врачу онлайн в любое время суток без звонков и очередей
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Search Card ───────────────────────────────────────────── */}
        <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border bg-gradient-to-br from-background to-muted/30">
          <CardContent className="pt-8 pb-8">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Найдите своего врача</h2>
                <p className="text-muted-foreground mt-1">Введите имя врача, симптом или специализацию</p>
              </div>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Например: кардиолог, головная боль..."
                    className="pl-12 h-12 rounded-2xl border-2 text-base"
                  />
                </div>
                <Button type="submit" size="lg" className="rounded-xl shadow-lg px-6 shrink-0">
                  Найти
                </Button>
              </form>
              {/* Popular tags */}
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="text-sm text-muted-foreground">Популярные:</span>
                {["Кардиолог", "Терапевт", "Невролог"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => navigate(`${routes.patient.doctors}?q=${encodeURIComponent(tag)}`)}
                    className="px-3 py-1 rounded-full border border-border text-sm text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Specializations Grid ──────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Специализации</h2>
              <p className="text-muted-foreground text-sm mt-1">Выберите нужное направление</p>
            </div>
            <Link
              to={routes.patient.doctors}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Все врачи <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {SPECIALIZATIONS.map(({ code, label, icon: Icon, color, bg, border }, index) => (
              <Link
                key={code}
                to={`${routes.patient.doctors}?specialization=${code}`}
                className={`
                  group flex flex-col items-center gap-3 p-4 rounded-2xl border border-border ${border}
                  bg-card hover:shadow-lg transition-all duration-200 text-center
                  ${index === 0 || index === 4 ? "md:row-span-2 justify-center py-8" : ""}
                `}
              >
                <div className={`p-3 rounded-2xl ${bg} group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <span className="text-sm font-medium text-foreground leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Emergency CTA ─────────────────────────────────────────── */}
        <Card className="shadow-lg rounded-2xl border-0 bg-gradient-to-r from-red-600 to-rose-700 text-white overflow-hidden relative">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Экстренная помощь</h3>
                  <p className="text-red-100 text-sm mt-0.5">При угрозе жизни немедленно звоните в скорую</p>
                </div>
              </div>
              <a
                href="tel:103"
                className="flex items-center gap-2 bg-white text-red-700 font-black text-2xl px-8 py-4 rounded-2xl shadow-xl hover:bg-red-50 transition-colors shrink-0"
              >
                103
              </a>
            </div>
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -left-4 -bottom-12 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          </CardContent>
        </Card>

        {/* ── How it Works ──────────────────────────────────────────── */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Как это работает</h2>
            <p className="text-muted-foreground text-sm mt-1">Четыре простых шага к здоровью</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <Card key={step} className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border bg-card overflow-hidden group relative">
                <CardContent className="pt-6 pb-6">
                  <span className="text-7xl font-black text-muted-foreground/5 absolute -top-2 -right-2 select-none leading-none pointer-events-none">
                    {step}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <span className="text-xs font-black text-primary">{step}</span>
                  </div>
                  <p className="text-sm font-bold text-foreground mb-2">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Footer disclaimer ─────────────────────────────────────── */}
        <div className="border-t border-border pt-6">
          <p className="text-xs text-muted-foreground/60 text-center">
            ⚕️ MedAI предоставляет предварительную оценку симптомов. Результаты не являются медицинским диагнозом и не заменяют консультацию врача.
          </p>
        </div>
      </div>
    </div>
  );
}
