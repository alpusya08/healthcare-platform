import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Brain, CheckCircle2, XCircle, AlertTriangle, Cpu, RefreshCw,
  Rocket, Clock, TrendingUp, AlertCircle, Calendar,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { adminApi, type AdminFeedback } from "@/features/admin/api/adminApi";

const VERDICT_CONFIG = {
  APPROVED: { label: "Подтверждено", variant: "success" as const, dot: "#10b981" },
  REJECTED: { label: "Отклонено", variant: "destructive" as const, dot: "#f43f5e" },
  PARTIAL: { label: "Частично", variant: "warning" as const, dot: "#f59e0b" },
};

function FeedbackRow({ fb }: { fb: AdminFeedback }) {
  const cfg = VERDICT_CONFIG[fb.verdict];
  const date = new Date(fb.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-border last:border-0">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-xs font-bold text-white shrink-0">
        {fb.doctorName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{fb.doctorName}</span>
          <Badge variant={cfg.variant} className="text-xs">
            {cfg.label}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto shrink-0 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {date}
          </span>
        </div>
        {fb.comment && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{fb.comment}</p>
        )}
        {fb.correctedDiagnosis && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
            Исправлено: {fb.correctedDiagnosis}
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminMLDashboardPage() {
  const queryClient = useQueryClient();
  const [retrainLog, setRetrainLog] = useState<string | null>(null);
  const [retrainPending, setRetrainPending] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "ml-stats"],
    queryFn: adminApi.getMlStats,
    refetchInterval: 30_000,
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ["admin", "ai-feedbacks"],
    queryFn: adminApi.listFeedbacks,
  });

  const retrainMutation = useMutation({
    mutationFn: adminApi.triggerRetrain,
    onMutate: () => setRetrainPending(true),
    onSuccess: (result) => {
      setRetrainPending(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "ml-stats"] });
      const log = result.deployed
        ? `✓ Модель задеплоена. F1: ${result.old_f1?.toFixed(3)} → ${result.new_f1?.toFixed(3)}`
        : `${result.message}`;
      setRetrainLog(log);
      toast.success("Дообучение завершено");
    },
    onError: () => {
      setRetrainPending(false);
      toast.error("Ошибка запуска дообучения");
    },
  });

  const totalFeedbacks = feedbacks.length;
  const approvedCount = feedbacks.filter((f) => f.verdict === "APPROVED").length;
  const rejectedCount = feedbacks.filter((f) => f.verdict === "REJECTED").length;
  const partialCount = feedbacks.filter((f) => f.verdict === "PARTIAL").length;
  const MIN_FEEDBACKS = 100;
  const approvalRate = totalFeedbacks > 0 ? Math.round((approvedCount / totalFeedbacks) * 100) : 0;

  const pieData = [
    { name: "Подтверждено", value: approvedCount, color: "#10b981" },
    { name: "Отклонено", value: rejectedCount, color: "#f43f5e" },
    { name: "Частично", value: partialCount, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  const mlAccuracy = stats ? Math.round((stats.champion_confidence_avg || 0) * 100) : 0;
  const canRetrain = totalFeedbacks >= MIN_FEEDBACKS;

  if (isLoading) {
    return <div className="text-center py-20 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">ML Мониторинг</h1>
              <p className="mt-1.5 text-muted-foreground">
                Обратная связь врачей и управление дообучением модели
              </p>
            </div>
            {stats && (
              <Badge variant="outline" className="text-xs mt-1 shrink-0 font-mono">
                v{stats.model_version}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">

        {/* Warning banner if accuracy < 80% */}
        {mlAccuracy > 0 && mlAccuracy < 80 && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border bg-gradient-to-r from-warning/10 to-warning/5 border-warning/30 text-sm">
            <AlertCircle className="w-5 h-5 text-warning shrink-0" />
            <span className="text-foreground flex-1">
              Точность модели ниже порогового значения.{" "}
              Текущая достоверность:{" "}
              <span className="font-semibold text-warning">{mlAccuracy}%</span>.{" "}
              Рекомендуется запустить дообучение.
            </span>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 shrink-0">
                  <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-tight">{totalFeedbacks}</p>
                  <p className="text-xs text-muted-foreground">Всего feedback</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-tight">{approvedCount}</p>
                  <p className="text-xs text-muted-foreground">Подтверждено ({approvalRate}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 shrink-0">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-tight">{rejectedCount}</p>
                  <p className="text-xs text-muted-foreground">Отклонено</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-tight">{partialCount}</p>
                  <p className="text-xs text-muted-foreground">Частично</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts + model info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie chart */}
          <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Распределение feedback
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
                <p className="text-sm text-muted-foreground py-8 text-center">Feedback пока нет</p>
              )}
            </CardContent>
          </Card>

          {/* Model info card */}
          <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="w-4 h-4 text-violet-600" />
                Текущая модель
                {stats && (
                  <Badge variant="outline" className="ml-auto text-xs font-mono">v{stats.model_version}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {stats && (
                <>
                  {/* Accuracy with trend */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Средняя достоверность</span>
                      <div className="flex items-center gap-1.5">
                        {mlAccuracy >= 80
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        }
                        <span className={`text-sm font-bold ${mlAccuracy >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                          {mlAccuracy}%
                        </span>
                      </div>
                    </div>
                    <Progress value={mlAccuracy} className="h-2.5 rounded-full" />
                  </div>

                  {/* Feedback progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Накоплено для дообучения</span>
                      <span className={`text-xs font-semibold ${canRetrain ? "text-emerald-600" : "text-amber-600"}`}>
                        {totalFeedbacks} / {MIN_FEEDBACKS}
                        {canRetrain && " ✓"}
                      </span>
                    </div>
                    <Progress value={Math.min((totalFeedbacks / MIN_FEEDBACKS) * 100, 100)} className="h-2.5 rounded-full" />
                  </div>

                  <div className="space-y-2 text-sm border-t border-border pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI-анализов всего</span>
                      <span className="font-semibold text-foreground">{stats.total_analyses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">С feedback врача</span>
                      <span className="font-semibold text-foreground">{stats.total_with_feedback}</span>
                    </div>
                  </div>

                  {/* Retrain button */}
                  <Button
                    onClick={() => retrainMutation.mutate()}
                    disabled={retrainMutation.isPending || retrainPending || !canRetrain}
                    className="w-full rounded-xl"
                  >
                    {retrainMutation.isPending || retrainPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Обучение идёт...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Запустить дообучение
                      </>
                    )}
                  </Button>

                  {!canRetrain && (
                    <p className="text-xs text-muted-foreground text-center">
                      Нужно ещё {MIN_FEEDBACKS - totalFeedbacks} feedback для запуска
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Training log */}
        {retrainLog && (
          <Card className="shadow-lg rounded-2xl border-border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Clock className="w-4 h-4" />
                Результат последнего дообучения
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground bg-muted rounded-xl p-3 font-mono border border-border">
                {retrainLog}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent feedbacks */}
        <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Последние feedback врачей
              </CardTitle>
              <Badge variant="outline" className="text-xs">{feedbacks.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {feedbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Feedback пока не поступал</p>
            ) : (
              <div>
                {feedbacks.slice(0, 10).map((fb) => (
                  <FeedbackRow key={fb.id} fb={fb} />
                ))}
                {feedbacks.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Показано 10 из {feedbacks.length}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
