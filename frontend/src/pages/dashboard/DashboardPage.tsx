import { Link } from "react-router-dom";
import { Activity, Calendar, ArrowRight, Stethoscope, Brain, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useAuthStore } from "@/features/auth/model/authStore";
import { routes } from "@/shared/config/routes";

const FEATURES = [
  {
    icon: Brain,
    title: "AI Диагностика",
    description: "Умный анализ симптомов на основе XGBoost-модели, обученной на клинических данных",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/50",
  },
  {
    icon: Stethoscope,
    title: "Кардиология",
    description: "Оценка сердечно-сосудистых рисков по 13 клиническим признакам UCI Heart Disease",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
  },
  {
    icon: Shield,
    title: "Быстрый триаж",
    description: "Автоматическое определение экстренных ситуаций с рекомендацией вызвать скорую",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
  },
];

export function DashboardPage() {
  const { user } = useAuthStore();

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
          {greeting()}, {user?.fullName.split(" ")[0] ?? "Пациент"} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Чем могу помочь сегодня?
        </p>
      </div>

      {/* Main CTA cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Analysis */}
        <Card className="group border-border hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 w-fit">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge variant="secondary" className="text-xs">AI</Badge>
            </div>
            <CardTitle className="text-lg">AI Анализ симптомов</CardTitle>
            <CardDescription>
              Опишите жалобы — система задаст уточняющие вопросы и выдаст предварительный анализ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full group-hover:bg-blue-700">
              <Link to={routes.patient.aiAnalysis}>
                Начать анализ
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Appointments */}
        <Card className="group border-border hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 w-fit">
                <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Badge variant="secondary" className="text-xs">Скоро</Badge>
            </div>
            <CardTitle className="text-lg">Запись к врачу</CardTitle>
            <CardDescription>
              Найдите специалиста и запишитесь на удобное время онлайн
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
              disabled
            >
              В разработке
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Возможности платформы</h2>
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
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground/70 border-t border-border pt-4">
        ⚕️ MedAI предоставляет информацию в образовательных целях. Результаты AI-анализа не являются
        медицинским диагнозом и не заменяют консультацию врача.
      </p>
    </div>
  );
}
