import { useQuery } from "@tanstack/react-query";
import {
  Users, Stethoscope, Calendar, CheckCircle2, Clock,
  UserCircle, TrendingUp, Activity, AlertCircle, Brain,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
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
    <Card className="border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
          {trend && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">{trend}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertBanner({ level, text }: { level: "red" | "yellow"; text: string }) {
  const styles = {
    red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
    yellow: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400",
  };
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm ${styles[level]}`}>
      <AlertCircle className="w-4 h-4 shrink-0" />
      {text}
    </div>
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Обзор платформы</h1>
        <p className="mt-1 text-sm text-muted-foreground">Статистика в реальном времени · обновляется каждые 30 сек</p>
      </div>

      {/* Alerts */}
      {mlAccuracy !== null && mlAccuracy < 80 && (
        <AlertBanner level="red" text={`Точность модели упала ниже 80% (текущая: ${mlAccuracy}%)`} />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users}        label="Пользователей"  value={stats.totalUsers}             color="text-teal-600"    bg="bg-teal-50 dark:bg-teal-950/40" />
        <StatCard icon={Stethoscope}  label="Врачей"         value={stats.totalDoctors}           color="text-violet-600"  bg="bg-violet-50 dark:bg-violet-950/40" />
        <StatCard icon={UserCircle}   label="Пациентов"      value={stats.totalPatients}          color="text-sky-600"     bg="bg-sky-50 dark:bg-sky-950/40" />
        <StatCard icon={Calendar}     label="Всего записей"  value={stats.totalAppointments}      color="text-amber-600"   bg="bg-amber-50 dark:bg-amber-950/40" />
        <StatCard icon={Clock}        label="Запланировано"  value={stats.scheduledAppointments}  color="text-orange-600"  bg="bg-orange-50 dark:bg-orange-950/40" />
        <StatCard icon={CheckCircle2} label="Завершено"      value={stats.completedAppointments}  color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/40" trend={`${completionRate}%`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appointments pie */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Статусы записей
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
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
                <div className="space-y-2">
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
        <Card className="border-border">
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
              <div className="flex items-center gap-4">
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
                <div className="space-y-2">
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
                        Всего анализов: <span className="font-semibold text-foreground">{mlStats.total_analyses}</span>
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
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
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
              <Bar dataKey="Всего" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Управление пользователями", href: "/admin/users", icon: Users, color: "text-teal-600" },
          { label: "ML Мониторинг", href: "/admin/ml", icon: Brain, color: "text-violet-600" },
          { label: "Системная статистика", href: "#", icon: Activity, color: "text-amber-600" },
        ].map(({ label, href, icon: Icon, color }) => (
          <a key={label} href={href} className="group">
            <Card className="border-border hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${color} shrink-0`} />
                  <span className="text-sm font-medium text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{label}</span>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
