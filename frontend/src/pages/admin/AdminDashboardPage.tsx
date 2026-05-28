import { useQuery } from "@tanstack/react-query";
import {
  Users, Stethoscope, Calendar, CheckCircle2, Clock,
  UserCircle, TrendingUp, Activity, AlertCircle, Brain,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { adminApi } from "@/features/admin/api/adminApi";

const COLORS = {
  teal: "#0d9488",
  emerald: "#10b981",
  amber: "#f59e0b",
  violet: "#7c3aed",
  rose: "#f43f5e",
  sky: "#0ea5e9",
};

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  bg: string;
  trend?: string;
};

function StatCard({ icon: Icon, label, value, color, bg, trend }: StatCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${bg} shrink-0`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-foreground leading-tight">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
          {trend && (
            <div className="flex items-center gap-1 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{trend}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.getStats,
    refetchInterval: 30_000,
  });

  const { data: mlStats } = useQuery({
    queryKey: ["admin", "ml-stats"],
    queryFn: adminApi.getMlStats,
    refetchInterval: 30_000,
  });

  if (isLoading || !stats) {
    return <div className="text-center py-20 text-muted-foreground">Загрузка...</div>;
  }

  const pieData = [
    { name: "Завершено", value: stats.completedAppointments, color: COLORS.emerald },
    { name: "Запланировано", value: stats.scheduledAppointments, color: COLORS.teal },
    { name: "Отменено", value: Math.max(0, stats.totalAppointments - stats.completedAppointments - stats.scheduledAppointments), color: COLORS.rose },
  ].filter((d) => d.value > 0);

  const feedbackPieData = mlStats
    ? [
        { name: "Подтверждено", value: mlStats.approved, color: COLORS.emerald },
        { name: "Отклонено", value: mlStats.rejected, color: COLORS.rose },
        { name: "Частично", value: mlStats.partial, color: COLORS.amber },
      ].filter((d) => d.value > 0)
    : [];

  const barData = [
    { name: "Пользователи", Всего: stats.totalUsers, fill: COLORS.teal },
    { name: "Пациенты", Всего: stats.totalPatients, fill: COLORS.sky },
    { name: "Врачи", Всего: stats.totalDoctors, fill: COLORS.violet },
    { name: "Записей", Всего: stats.totalAppointments, fill: COLORS.amber },
  ];

  const completionRate = stats.totalAppointments > 0
    ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
    : 0;

  const mlAccuracy = mlStats
    ? Math.round((mlStats.champion_confidence_avg || 0) * 100)
    : null;

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Панель администратора</h1>
              <p className="mt-1.5 text-muted-foreground">
                Обзор платформы · статистика в реальном времени · обновляется каждые 30 сек
              </p>
            </div>
            <Badge variant="outline" className="text-xs mt-1 shrink-0">Live</Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">

        {/* ML accuracy warning banner */}
        {mlAccuracy !== null && mlAccuracy < 80 && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border bg-gradient-to-r from-warning/10 to-warning/5 border-warning/30 text-sm">
            <AlertCircle className="w-5 h-5 text-warning shrink-0" />
            <span className="text-foreground flex-1">
              Точность модели упала ниже 80% (текущая:{" "}
              <span className="font-semibold text-warning">{mlAccuracy}%</span>
              ). Рекомендуется запустить дообучение.
            </span>
            <Link
              to="/admin/ml"
              className="text-xs font-semibold text-warning underline underline-offset-2 shrink-0 hover:text-warning/80 transition-colors"
            >
              Подробнее
            </Link>
          </div>
        )}

        {/* Stat cards — 4 primary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Пользователей"
            value={stats.totalUsers}
            color="text-blue-600 dark:text-blue-400"
            bg="bg-blue-50 dark:bg-blue-950/40"
          />
          <StatCard
            icon={Stethoscope}
            label="Врачей"
            value={stats.totalDoctors}
            color="text-violet-600 dark:text-violet-400"
            bg="bg-violet-50 dark:bg-violet-950/40"
          />
          <StatCard
            icon={UserCircle}
            label="Пациентов"
            value={stats.totalPatients}
            color="text-sky-600 dark:text-sky-400"
            bg="bg-sky-50 dark:bg-sky-950/40"
          />
          <StatCard
            icon={Calendar}
            label="Записей"
            value={stats.totalAppointments}
            color="text-amber-600 dark:text-amber-400"
            bg="bg-amber-50 dark:bg-amber-950/40"
            trend={`${completionRate}%`}
          />
        </div>

        {/* Secondary stat row */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={Clock}
            label="Запланировано"
            value={stats.scheduledAppointments}
            color="text-orange-600 dark:text-orange-400"
            bg="bg-orange-50 dark:bg-orange-950/40"
          />
          <StatCard
            icon={CheckCircle2}
            label="Завершено"
            value={stats.completedAppointments}
            color="text-emerald-600 dark:text-emerald-400"
            bg="bg-emerald-50 dark:bg-emerald-950/40"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Appointments pie */}
          <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Статусы записей
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v}`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2.5 flex-1">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                        <span className="font-semibold text-foreground ml-auto">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">Нет данных</p>
              )}
            </CardContent>
          </Card>

          {/* ML feedback pie */}
          <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-600" />
                Feedback врачей на AI
                {mlStats && (
                  <Badge variant="outline" className="ml-auto text-xs font-normal">
                    v{mlStats.model_version}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackPieData.length > 0 ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={feedbackPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {feedbackPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v}`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2.5 flex-1">
                    {feedbackPieData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                        <span className="font-semibold text-foreground ml-auto">{entry.value}</span>
                      </div>
                    ))}
                    {mlStats && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          Всего анализов:{" "}
                          <span className="font-semibold text-foreground">{mlStats.total_analyses}</span>
                        </p>
                        {mlAccuracy !== null && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Достоверность:{" "}
                            <span className={`font-semibold ${mlAccuracy >= 80 ? "text-emerald-600" : "text-red-600"}`}>
                              {mlAccuracy}%
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {mlStats ? "Feedback пока не поступал" : "Загрузка..."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bar chart */}
        <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Общая статистика платформы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="Всего" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/admin/users" className="group">
            <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border hover:border-primary/30 cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 shrink-0">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Управление пользователями
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Аккаунты и роли</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/ml" className="group">
            <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border hover:border-primary/30 cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 shrink-0">
                    <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      ML Мониторинг
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Модели и обучение</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="shadow-lg rounded-2xl border-border opacity-60">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 shrink-0">
                  <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Системная аналитика</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Скоро</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
