import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, addDays, addWeeks, isSameDay, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Calendar, ChevronLeft, ChevronRight, Settings, Zap,
  Lock, Unlock, Trash2, CheckCircle2, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
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

const SLOT_TYPE_COLOR: Record<string, string> = {
  ONLINE_ONLY: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  OFFLINE_ONLY: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  BOTH: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
};

function SlotCard({
  slot,
  onBlock,
  onUnblock,
  onDelete,
}: {
  slot: DoctorSlot;
  onBlock: () => void;
  onUnblock: () => void;
  onDelete: () => void;
}) {
  const start = parseISO(slot.startTime);
  const end = parseISO(slot.endTime);

  return (
    <div
      className={cn(
        "relative rounded-md px-2.5 py-2 text-xs border transition-colors group",
        slot.booked
          ? "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800"
          : slot.blocked
          ? "bg-gray-100 border-gray-300 dark:bg-gray-800/40 dark:border-gray-700 opacity-60"
          : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
      )}
    >
      <div className="font-semibold text-foreground">
        {format(start, "HH:mm")}–{format(end, "HH:mm")}
      </div>
      <div className="mt-0.5">
        {slot.booked ? (
          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3" /> Занято
          </span>
        ) : slot.blocked ? (
          <span className="text-gray-500 flex items-center gap-0.5">
            <Lock className="w-3 h-3" /> Заблокировано
          </span>
        ) : (
          <span className={cn("rounded px-1 py-0.5 text-[10px] font-medium", SLOT_TYPE_COLOR[slot.appointmentType])}>
            {SLOT_TYPE_LABEL[slot.appointmentType] ?? slot.appointmentType}
          </span>
        )}
      </div>
      {!slot.booked && (
        <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
          {slot.blocked ? (
            <button
              onClick={onUnblock}
              title="Разблокировать"
              className="p-0.5 rounded bg-white dark:bg-gray-700 hover:bg-teal-50 text-muted-foreground hover:text-teal-600 transition-colors"
            >
              <Unlock className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={onBlock}
              title="Заблокировать"
              className="p-0.5 rounded bg-white dark:bg-gray-700 hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors"
            >
              <Lock className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={onDelete}
            title="Удалить"
            className="p-0.5 rounded bg-white dark:bg-gray-700 hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function DoctorSchedulePage() {
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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

  const slotsForDay = (date: Date) =>
    slots.filter((s) => isSameDay(parseISO(s.startTime), date));

  const totalFree = slots.filter((s) => !s.booked && !s.blocked).length;
  const totalBooked = slots.filter((s) => s.booked).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Расписание</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Управляйте своими слотами и шаблоном рабочей недели
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Шаблон недели
          </Button>
          <Button
            onClick={() => generateMutation.mutate(4)}
            disabled={generateMutation.isPending}
          >
            <Zap className="w-4 h-4 mr-2" />
            {generateMutation.isPending ? "Генерация..." : "Сгенерировать на 4 недели"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalFree}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Свободных слотов</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalBooked}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Занятых слотов</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-foreground">{slots.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Всего слотов</p>
          </CardContent>
        </Card>
      </div>

      {/* Week calendar */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-teal-600" />
              {format(weekStart, "d MMMM", { locale: ru })} –{" "}
              {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: ru })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekOffset(0)}
                className="text-xs"
              >
                Сегодня
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Загрузка расписания...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const daySlots = slotsForDay(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()}>
                    <div
                      className={cn(
                        "text-center pb-2 mb-2 border-b border-border",
                        isToday && "text-teal-600 dark:text-teal-400 font-bold"
                      )}
                    >
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {format(day, "EEE", { locale: ru })}
                      </p>
                      <p className={cn("text-sm font-medium mt-0.5", isToday && "text-teal-600 dark:text-teal-400")}>
                        {format(day, "d")}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {daySlots.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground/50 text-center py-2">—</p>
                      ) : (
                        daySlots.map((slot) => (
                          <SlotCard
                            key={slot.id}
                            slot={slot}
                            onBlock={() => blockMutation.mutate(slot.id)}
                            onUnblock={() => unblockMutation.mutate(slot.id)}
                            onDelete={() => deleteMutation.mutate(slot.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200" />
          Свободно
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-rose-100 border border-rose-200" />
          Занято
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300" />
          Заблокировано
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Наведите на слот для действий
        </span>
      </div>

      <TemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onGenerate={(weeks) => generateMutation.mutate(weeks)}
      />
    </div>
  );
}
