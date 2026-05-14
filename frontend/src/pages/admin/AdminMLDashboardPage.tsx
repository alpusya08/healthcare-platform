import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Brain, CheckCircle2, XCircle, AlertTriangle, Cpu, RefreshCw,
  Rocket, Clock, TrendingUp,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { adminApi, type AdminFeedback } from "@/features/admin/api/adminApi";

const VERDICT_CONFIG = {
  APPROVED: { label: "Подтверждено", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", dot: "#10b981" },
  REJECTED: { label: "Отклонено", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300", dot: "#f43f5e" },
  PARTIAL: { label: "Частично", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", dot: "#f59e0b" },
};

function FeedbackRow({ fb }: { fb: AdminFeedback }) {
  const cfg = VERDICT_CONFIG[fb.verdict];
  const date = new Date(fb.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-xs font-semibold text-teal-700 dark:text-teal-300 shrink-0">
        {fb.doctorName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{fb.doctorName}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
            {cfg.label}
          </span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">{date}</span>
        </div>
        {fb.comment && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{fb.comment}</p>
        )}
        {fb.correctedDiagnosis && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
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

  if (isLoading) {
    return <div className="text-center py-20 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ML Feedback Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">Обратная связь врачей и управление дообучением модели</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Brain, label: "Всего feedback", value: totalFeedbacks, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/40" },
          { icon: CheckCircle2, label: `Подтверждено (${approvalRate}%)`, value: approvedCount, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
          { icon: XCircle, label: "Отклонено", value: rejectedCount, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/40" },
          { icon: AlertTriangle, label: "Частично", value: partialCount, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label} className="border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts + model info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie chart */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Распределение feedback
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
              <p className="text-sm text-muted-foreground py-8 text-center">Feedback пока нет</p>
            )}
          </CardContent>
        </Card>

        {/* Model info */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-600" />
              Текущая модель
              {stats && (
                <Badge variant="outline" className="ml-auto text-xs">v{stats.model_version}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">Средняя достоверность</span>
                    <span className={`text-sm font-semibold ${mlAccuracy >= 80 ? "text-emerald-600" : "text-red-600"}`}>
                      {mlAccuracy}%
                    </span>
                  </div>
                  <Progress value={mlAccuracy} className="h-2" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI-анализов всего</span>
                    <span className="font-semibold text-foreground">{stats.total_analyses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">С feedback врача</span>
                    <span className="font-semibold text-foreground">{stats.total_with_feedback}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Retrain block */}
      <Card className="border-border border-teal-200 dark:border-teal-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Запуск дообучения
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Накоплено feedback</span>
              <span className={`font-semibold ${totalFeedbacks >= MIN_FEEDBACKS ? "text-emerald-600" : "text-amber-600"}`}>
                {totalFeedbacks} / {MIN_FEEDBACKS} минимум
                {totalFeedbacks >= MIN_FEEDBACKS && " ✓"}
              </span>
            </div>
            <Progress value={Math.min((totalFeedbacks / MIN_FEEDBACKS) * 100, 100)} className="h-2" />
          </div>

          {stats && (
            <div className="text-sm text-muted-foreground">
              Текущая модель: <span className="font-mono text-foreground">cardiology_v{stats.model_version}</span>
            </div>
          )}

          <Button
            onClick={() => retrainMutation.mutate()}
            disabled={retrainMutation.isPending || retrainPending}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
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

          {retrainLog && (
            <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3 font-mono border border-border">
              <Clock className="w-3 h-3 inline mr-1" />
              {retrainLog}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback list */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-teal-600 dark:text-teal-400" />
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
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Показано 10 из {feedbacks.length}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
