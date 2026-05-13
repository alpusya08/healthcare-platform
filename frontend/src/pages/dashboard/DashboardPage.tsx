import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity, Calendar, ArrowRight, Brain, Heart, Stethoscope, Bone,
  Wind, Ear, Scissors, Syringe, Clock, Star, Users, Search,
  ChevronRight, AlertCircle, Pill, Eye,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { useAuthStore } from "@/features/auth/model/authStore";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import { routes } from "@/shared/config/routes";

const SPECIALIZATIONS = [
  { code: "therapy",          label: "Терапия",           icon: Stethoscope, color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/40",     border: "hover:border-teal-300 dark:hover:border-teal-700" },
  { code: "cardiology",       label: "Кардиология",       icon: Heart,       color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/40",      border: "hover:border-rose-300 dark:hover:border-rose-700",   badge: "AI" },
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
    <div className="space-y-10">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 p-8 text-white">
        <div className="relative z-10">
          <p className="text-teal-100 text-sm font-medium mb-1">
            {greeting()}, {user?.fullName.split(" ")[0] ?? "Пациент"}
          </p>
          <h1 className="text-3xl font-bold mb-2">
            Ваше здоровье —<br />наш приоритет
          </h1>
          <p className="text-teal-100 text-sm mb-6 max-w-sm">
            AI-анализ симптомов, запись к специалистам и история визитов в одном месте
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Найти врача или специализацию..."
                className="pl-9 bg-white/20 border-white/30 text-white placeholder:text-teal-200 focus:bg-white/25 focus-visible:ring-white/40"
              />
            </div>
            <Button type="submit" variant="secondary" className="shrink-0 bg-white text-teal-700 hover:bg-teal-50">
              Найти
            </Button>
          </form>
        </div>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -right-4 -bottom-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* ── Next appointment banner ────────────────────────────────── */}
      {nextAppointment && (
        <Card className="border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide">Ближайшая запись</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{nextAppointment.doctorName}</p>
                  <p className="text-xs text-muted-foreground">{nextAppointment.specialization} · {formatDateTime(nextAppointment.startTime)}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400">
                <Link to={routes.patient.appointments}>Перейти</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to={routes.patient.aiAnalysis} className="group">
          <Card className="h-full border-border hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 shrink-0">
                  <Activity className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground">Проверить симптомы</p>
                    <Badge variant="secondary" className="text-xs">AI</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Опишите жалобы — система задаст уточняющие вопросы и порекомендует специалиста
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={routes.patient.doctors} className="group">
          <Card className="h-full border-border hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 shrink-0">
                  <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground mb-1">Запись к врачу</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {allDoctors.length > 0 ? `${allDoctors.length} врачей доступно` : "Найдите специалиста"} — выберите удобное время онлайн
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users,    value: allDoctors.length || "13", label: "Врачей в системе", color: "text-teal-600"   },
          { icon: Star,     value: "4.8",                     label: "Средний рейтинг",  color: "text-amber-500"  },
          { icon: Activity, value: "10",                      label: "Специализаций",    color: "text-violet-600" },
        ].map(({ icon: Icon, value, label, color }) => (
          <Card key={label} className="border-border text-center">
            <CardContent className="pt-4 pb-3">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Specializations grid ──────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Специализации</h2>
          <Link to={routes.patient.doctors} className="text-sm text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
            Все врачи <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {SPECIALIZATIONS.map(({ code, label, icon: Icon, color, bg, border, badge }) => (
            <Link
              key={code}
              to={`${routes.patient.doctors}?specialization=${code}`}
              className={`group flex flex-col items-center gap-2 p-4 rounded-xl border border-border ${border} bg-card hover:shadow-sm transition-all duration-200 text-center`}
            >
              <div className={`p-2.5 rounded-xl ${bg} relative`}>
                <Icon className={`w-5 h-5 ${color}`} />
                {badge && (
                  <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-teal-500 text-white px-1 rounded-full leading-4">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-foreground leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Emergency banner ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/20">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-sm text-red-700 dark:text-red-400">
          <span className="font-semibold">При экстренной ситуации</span> — немедленно звоните{" "}
          <a href="tel:103" className="font-bold underline">103</a> (скорая помощь)
        </p>
      </div>

      {/* ── How it works ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Как это работает</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} className="relative p-4 rounded-xl border border-border bg-card overflow-hidden">
              <span className="text-5xl font-black text-muted-foreground/8 absolute top-2 right-3 select-none leading-none pointer-events-none">
                {step}
              </span>
              <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1.5 uppercase tracking-wider">{step}</p>
              <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground/60 border-t border-border pt-4">
        ⚕️ MedAI предоставляет предварительную оценку симптомов. Результаты не являются медицинским диагнозом и не заменяют консультацию врача.
      </p>
    </div>
  );
}
