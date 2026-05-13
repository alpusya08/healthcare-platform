import { useQuery } from "@tanstack/react-query";
import { Users, Stethoscope, Calendar, CheckCircle2, Clock, UserCircle } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { adminApi } from "@/features/admin/api/adminApi";

type StatCardProps = { icon: React.ElementType; label: string; value: number; color: string; bg: string };

function StatCard({ icon: Icon, label, value, color, bg }: StatCardProps) {
  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.getStats,
  });

  if (isLoading || !stats) {
    return <div className="text-center py-20 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Обзор платформы</h1>
        <p className="mt-1 text-sm text-muted-foreground">Статистика в реальном времени</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users}        label="Всего пользователей"  value={stats.totalUsers}             color="text-teal-600"   bg="bg-teal-50 dark:bg-teal-950/40" />
        <StatCard icon={UserCircle}   label="Пациентов"            value={stats.totalPatients}          color="text-blue-600"   bg="bg-blue-50 dark:bg-blue-950/40" />
        <StatCard icon={Stethoscope}  label="Врачей"               value={stats.totalDoctors}           color="text-violet-600" bg="bg-violet-50 dark:bg-violet-950/40" />
        <StatCard icon={Calendar}     label="Всего записей"        value={stats.totalAppointments}      color="text-amber-600"  bg="bg-amber-50 dark:bg-amber-950/40" />
        <StatCard icon={Clock}        label="Запланировано"        value={stats.scheduledAppointments}  color="text-orange-600" bg="bg-orange-50 dark:bg-orange-950/40" />
        <StatCard icon={CheckCircle2} label="Завершено"            value={stats.completedAppointments}  color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/40" />
      </div>
    </div>
  );
}
