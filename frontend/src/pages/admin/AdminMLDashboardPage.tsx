import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, CheckCircle2, XCircle, AlertTriangle, Cpu, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { adminApi } from "@/features/admin/api/adminApi";

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  bg: string;
};

function StatCard({ icon: Icon, label, value, color, bg }: StatCardProps) {
  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminMLDashboardPage() {
  const queryClient = useQueryClient();
  const [retrainLog, setRetrainLog] = useState<string | null>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "ml-stats"],
    queryFn: adminApi.getMlStats,
  });

  const retrainMutation = useMutation({
    mutationFn: adminApi.triggerRetrain,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ml-stats"] });
      const log = result.deployed
        ? `Модель задеплоена. F1: ${result.old_f1?.toFixed(3)} → ${result.new_f1?.toFixed(3)}`
        : `${result.message}`;
      setRetrainLog(log);
      toast.success("Дообучение завершено");
    },
    onError: () => {
      toast.error("Ошибка запуска дообучения");
    },
  });

  if (isLoading || !stats) {
    return <div className="text-center py-20 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ML-мониторинг</h1>
        <p className="mt-1 text-sm text-muted-foreground">Статистика модели и управление дообучением</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Brain}        label="Всего анализов"      value={stats.total_analyses}      color="text-teal-600"    bg="bg-teal-50 dark:bg-teal-950/40" />
        <StatCard icon={AlertTriangle} label="С фидбэком врача"   value={stats.total_with_feedback} color="text-amber-600"   bg="bg-amber-50 dark:bg-amber-950/40" />
        <StatCard icon={CheckCircle2} label="Одобрено"            value={stats.approved}            color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/40" />
        <StatCard icon={XCircle}      label="Отклонено"           value={stats.rejected}            color="text-rose-600"    bg="bg-rose-50 dark:bg-rose-950/40" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-600" />
              Текущая модель
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Версия</span>
              <span className="font-mono text-foreground">{stats.model_version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ср. уверенность</span>
              <span className="font-semibold text-foreground">
                {(stats.champion_confidence_avg * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Частичное одобрение</span>
              <span className="text-foreground">{stats.partial}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-teal-600" />
              Дообучение
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Запустить дообучение XGBoost на накопленном фидбэке врачей.
              Новая модель задеплоится автоматически, если F1 выше текущего чемпиона.
            </p>
            <Button
              onClick={() => retrainMutation.mutate()}
              disabled={retrainMutation.isPending}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              {retrainMutation.isPending ? "Обучение..." : "Запустить дообучение"}
            </Button>
            {retrainLog && (
              <p className="text-xs text-muted-foreground border border-border rounded p-2 font-mono">
                {retrainLog}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
