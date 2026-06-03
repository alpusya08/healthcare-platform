import { Navigate, Link } from "react-router-dom";
import {
  Brain, Calendar, BadgeCheck, ArrowRight, CheckCircle2,
  Star, Shield, Clock, Users, MapPin, Stethoscope, ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/model/authStore";
import { Button } from "@/shared/ui/button";
import { routes } from "@/shared/config/routes";

function PublicNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={routes.landing} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">MedAI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Возможности</a>
          <a href="#how" className="hover:text-foreground transition-colors">Как это работает</a>
          <a href="#stats" className="hover:text-foreground transition-colors">О платформе</a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to={routes.login}>Войти</Link>
          </Button>
          <Button size="sm" className="rounded-xl gap-1.5" asChild>
            <Link to={routes.register}>
              Регистрация
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

const FEATURES = [
  {
    icon: Brain,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "AI-анализ симптомов",
    desc: "Опишите симптомы — система проанализирует возможные диагнозы, расскажет о вероятных причинах и методах лечения, а также подберёт профиль нужного специалиста.",
  },
  {
    icon: Calendar,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    title: "Онлайн-запись",
    desc: "Выбирайте удобное время и записывайтесь к врачу онлайн. Поддержка как очных, так и видеоконсультаций.",
  },
  {
    icon: BadgeCheck,
    color: "text-violet-600",
    bg: "bg-violet-50",
    title: "Квалифицированные врачи",
    desc: "Выбирайте среди зарегистрированных специалистов платформы. Читайте отзывы, смотрите рейтинги и записывайтесь с уверенностью.",
  },
];

const STEPS = [
  { num: "01", title: "Зарегистрируйтесь", desc: "Создайте аккаунт — только имя, email и несколько базовых данных." },
  { num: "02", title: "Опишите симптомы", desc: "AI-система проанализирует симптомы, определит возможные диагнозы, предложит рекомендации и подберёт профиль нужного специалиста." },
  { num: "03", title: "Запишитесь к врачу", desc: "Выберите подходящего специалиста и удобный временной слот." },
];

const STATS = [
  { icon: Users, value: "20+", label: "Специалистов" },
  { icon: MapPin, value: "2", label: "Города" },
  { icon: Stethoscope, value: "15+", label: "Специализаций" },
  { icon: Star, value: "4.8", label: "Средний рейтинг" },
];

export function LandingPage() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.role === "DOCTOR") return <Navigate to={routes.doctor.dashboard} replace />;
    if (user?.role === "ADMIN") return <Navigate to={routes.admin.dashboard} replace />;
    return <Navigate to={routes.patient.home} replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute -bottom-20 -left-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-tight mb-6">
            Медицина нового
            <span className="text-primary block sm:inline"> поколения</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            Опишите симптомы — AI-система проанализирует возможные диагнозы, подскажет причины и методы лечения,
            а также поможет выбрать нужного специалиста и записаться онлайн.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="rounded-2xl px-8 h-12 text-base font-semibold gap-2 shadow-lg" asChild>
              <Link to={routes.register}>
                Зарегистрироваться
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-2xl px-8 h-12 text-base font-medium" asChild>
              <Link to={routes.login}>Войти в систему</Link>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            {[
              { icon: Shield, text: "Безопасные данные" },
              { icon: CheckCircle2, text: "Квалифицированные специалисты" },
              { icon: Clock, text: "Запись за 2 минуты" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-primary" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <section id="stats" className="border-y border-border bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="text-center">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-3xl font-extrabold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Всё что нужно для здоровья</h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-xl mx-auto">
              Платформа объединяет AI-технологии и живых врачей в одном месте
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group"
              >
                <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="how" className="py-24 bg-muted/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Как это работает</h2>
            <p className="mt-3 text-muted-foreground text-lg">Три простых шага до консультации с врачом</p>
          </div>

          <div className="space-y-6">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex gap-5 items-start">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shadow-md">
                  {step.num}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="absolute ml-6 mt-14 w-px h-6 bg-border" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button size="lg" className="rounded-2xl px-10 h-12 gap-2 shadow-lg" asChild>
              <Link to={routes.register}>
                Начать работу
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-12">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Brain className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">Готовы начать?</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Зарегистрируйтесь и получите доступ к AI-анализу симптомов и квалифицированным специалистам прямо сейчас.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="rounded-2xl px-8 h-12 gap-2" asChild>
                <Link to={routes.register}>
                  Зарегистрироваться
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-2xl px-8 h-12" asChild>
                <Link to={routes.login}>Уже есть аккаунт</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 bg-muted/20">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">MedAI</span>
            <span>© 2026</span>
          </div>
          <div className="flex gap-5">
            <Link to={routes.login} className="hover:text-foreground transition-colors">Войти</Link>
            <Link to={routes.register} className="hover:text-foreground transition-colors">Регистрация</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
