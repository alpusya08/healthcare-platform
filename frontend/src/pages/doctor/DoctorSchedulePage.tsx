import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Calendar, Settings, Zap,
  Lock, Unlock, Trash2, CheckCircle2, Clock, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { apiClient } from "@/shared/api/axios";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";
import { TemplateModal } from "./TemplateModal";

interface DoctorSlot {
  id: string;
  startTime: string;
  endTime: string;
  booked: boolean;
  blocked: boolean;
  appointmentType: string;
}

const SLOT_TYPE_LABEL: Record<string, string> = {
  ONLINE_ONLY: "Онлайн",
  OFFLINE_ONLY: "Офлайн",
  BOTH: "Онлайн/Офлайн",
};

export function DoctorSchedulePage() {
  const queryClient = useQueryClient();
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Generate slots date range state
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    return d.toISOString().split("T")[0];
  });

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["doctor-slots"],
    queryFn: () => apiClient.get<DoctorSlot[]>("/doctor/slots").then((r) => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: (weeksAhead: number) =>
      apiClient.post<{ created: number }>("/doctor/schedule/generate", { weeksAhead }).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-slots"] });
      toast.success(`Создано ${data.created} слотов`);
    },
    onError: () => toast.error("Ошибка генерации слотов"),
  });

  const blockMutation = useMutation({
    mutationFn: (slotId: string) => apiClient.patch(`/doctor/slots/${slotId}/block`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctor-slots"] }),
    onError: () => toast.error("Не удалось заблокировать слот"),
  });

  const unblockMutation = useMutation({
    mutationFn: (slotId: string) => apiClient.patch(`/doctor/slots/${slotId}/unblock`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctor-slots"] }),
    onError: () => toast.error("Не удалось разблокировать слот"),
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => apiClient.delete(`/doctor/slots/${slotId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctor-slots"] }),
    onError: () => toast.error("Не удалось удалить слот"),
  });

  const totalFree = slots.filter((s) => !s.booked && !s.blocked).length;
  const totalBooked = slots.filter((s) => s.booked).length;
  const totalBlocked = slots.filter((s) => s.blocked).length;

  // Compute weeks ahead from date range
  const weeksAhead = Math.max(
    1,
    Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (7 * 24 * 60 * 60 * 1000))
  );

  // Group slots by date for the list view
  const slotsByDate = slots.reduce<Record<string, DoctorSlot[]>>((acc, slot) => {
    const dateKey = slot.startTime.split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});
  const sortedDates = Object.keys(slotsByDate).sort();

  return (
    <div className="min-h-screen bg-background">

      {/* ── Gradient Header ── */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-primary/70 uppercase tracking-widest mb-1">Врач</p>
              <h1 className="text-3xl font-bold text-foreground">Управление расписанием</h1>
              <p className="mt-1 text-muted-foreground">
                Настройте шаблон рабочей недели и управляйте слотами
              </p>
            </div>
            {/* Stat chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Свободно", value: totalFree, color: "text-success" },
                { label: "Занято", value: totalBooked, color: "text-destructive" },
                { label: "Заблокировано", value: totalBlocked, color: "text-muted-foreground" },
                { label: "Всего", value: slots.length, color: "text-primary" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/80 border border-border shadow-sm">
                  <span className={cn("text-sm font-bold", color)}>{value}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left Column ── */}
          <div className="space-y-6">

            {/* Schedule Template Card */}
            <Card className="shadow-xl rounded-2xl border-border hover:shadow-2xl transition-all">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-primary" />
                  </div>
                  Шаблон недели
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Настройте рабочие дни, время и продолжительность приёмов. Шаблон используется при генерации слотов.
                </p>
                <Button
                  className="w-full rounded-xl"
                  onClick={() => setShowTemplateModal(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Открыть редактор шаблона
                </Button>
              </CardContent>
            </Card>

            {/* Generate Slots Card */}
            <Card className="shadow-xl rounded-2xl border-primary/30 hover:shadow-2xl transition-all bg-gradient-to-br from-primary/3 to-background">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  Генерация слотов
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date range inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">С даты</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">По дату</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                </div>

                {/* Info note */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-info/5 border border-info/20">
                  <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Будет создано ~{weeksAhead} {weeksAhead === 1 ? "неделя" : weeksAhead < 5 ? "недели" : "недель"} слотов по шаблону рабочей недели. Уже существующие слоты не будут затронуты.
                  </p>
                </div>

                <Button
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md"
                  onClick={() => generateMutation.mutate(weeksAhead)}
                  disabled={generateMutation.isPending}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {generateMutation.isPending ? "Генерация..." : `Сгенерировать на ${weeksAhead} нед.`}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── Right Column: Slots List ── */}
          <Card className="shadow-xl rounded-2xl border-border hover:shadow-2xl transition-all">
            <CardHeader className="pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  Все слоты
                </CardTitle>
                <span className="text-sm font-bold text-muted-foreground">{slots.length} всего</span>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
                  Свободно
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block" />
                  Занято
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block" />
                  Заблокировано
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <Clock className="w-8 h-8 animate-pulse text-primary/30" />
                  <p className="text-sm">Загрузка расписания...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <Calendar className="w-12 h-12 text-muted-foreground/20" />
                  <p className="font-semibold text-foreground">Слотов нет</p>
                  <p className="text-sm text-center">Сгенерируйте слоты по шаблону рабочей недели</p>
                </div>
              ) : (
                <div className="space-y-5 max-h-[600px] overflow-y-auto pr-1">
                  {sortedDates.map((dateKey) => {
                    const daySlots = slotsByDate[dateKey];
                    const dateObj = parseISO(dateKey + "T00:00:00");
                    const isToday = isSameDay(dateObj, new Date());
                    return (
                      <div key={dateKey}>
                        {/* Date header */}
                        <div className={cn(
                          "flex items-center gap-2 mb-2 pb-1.5 border-b border-border",
                          isToday && "border-primary/30"
                        )}>
                          <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold",
                            isToday ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                          )}>
                            {format(dateObj, "d")}
                          </div>
                          <p className={cn(
                            "text-xs font-semibold uppercase tracking-wide",
                            isToday ? "text-primary" : "text-muted-foreground"
                          )}>
                            {format(dateObj, "EEEE, d MMMM", { locale: ru })}
                            {isToday && <span className="ml-2 normal-case font-normal">· Сегодня</span>}
                          </p>
                        </div>
                        {/* Slot cards */}
                        <div className="space-y-2">
                          {daySlots.map((slot) => {
                            const start = parseISO(slot.startTime);
                            const end = parseISO(slot.endTime);
                            return (
                              <div
                                key={slot.id}
                                className={cn(
                                  "flex items-center justify-between gap-3 rounded-xl px-4 py-3 border transition-all group",
                                  slot.booked
                                    ? "bg-destructive/5 border-destructive/20"
                                    : slot.blocked
                                    ? "bg-muted border-border opacity-60"
                                    : "bg-success/5 border-success/20 hover:border-success/40"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Time */}
                                  <div className="shrink-0">
                                    <p className="text-sm font-bold text-foreground font-mono">
                                      {format(start, "HH:mm")}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                      {format(end, "HH:mm")}
                                    </p>
                                  </div>
                                  {/* Status badge */}
                                  {slot.booked ? (
                                    <Badge className="text-[10px] px-2 py-0.5 bg-destructive/10 text-destructive border-destructive/20 rounded-lg shrink-0">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Занято
                                    </Badge>
                                  ) : slot.blocked ? (
                                    <Badge className="text-[10px] px-2 py-0.5 bg-secondary text-muted-foreground border-border rounded-lg shrink-0">
                                      <Lock className="w-3 h-3 mr-1" />
                                      Заблокировано
                                    </Badge>
                                  ) : (
                                    <Badge className="text-[10px] px-2 py-0.5 bg-success/10 text-success border-success/20 rounded-lg shrink-0">
                                      {SLOT_TYPE_LABEL[slot.appointmentType] ?? slot.appointmentType}
                                    </Badge>
                                  )}
                                </div>

                                {/* Actions for non-booked */}
                                {!slot.booked && (
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    {slot.blocked ? (
                                      <button
                                        onClick={() => unblockMutation.mutate(slot.id)}
                                        title="Разблокировать"
                                        className="p-1.5 rounded-lg hover:bg-info/10 text-muted-foreground hover:text-info transition-colors"
                                      >
                                        <Unlock className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => blockMutation.mutate(slot.id)}
                                        title="Заблокировать"
                                        className="p-1.5 rounded-lg hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors"
                                      >
                                        <Lock className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteMutation.mutate(slot.id)}
                                      title="Удалить"
                                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onGenerate={(weeks) => generateMutation.mutate(weeks)}
      />
    </div>
  );
}
