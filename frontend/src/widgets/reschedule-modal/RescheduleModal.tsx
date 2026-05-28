import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { Appointment, TimeSlot } from "@/features/appointments/types";

function groupSlotsByDate(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const map = new Map<string, TimeSlot[]>();
  for (const slot of slots) {
    const key = new Date(slot.startTime).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(slot);
  }
  return map;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  appointment: Appointment;
  onClose: () => void;
}

export function RescheduleModal({ appointment, onClose }: Props) {
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["slots", appointment.doctorId],
    queryFn: () => appointmentsApi.listSlots(appointment.doctorId),
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => appointmentsApi.reschedule(appointment.id, selectedSlot!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Запись перенесена");
      onClose();
    },
    onError: () => toast.error("Не удалось перенести запись"),
  });

  const grouped = groupSlotsByDate(slots);
  const dates = Array.from(grouped.keys());
  const slotsForDate = selectedDate ? (grouped.get(selectedDate) ?? []) : [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Перенести запись</DialogTitle>
          <DialogDescription>
            Выберите новое время у {appointment.doctorName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Загрузка слотов...</div>
        ) : slots.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Нет доступных слотов для переноса
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Date picker */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                Выберите дату
              </p>
              <div className="grid grid-cols-3 gap-2">
                {dates.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                    className={cn(
                      "py-2.5 px-2 rounded-xl text-xs font-medium border transition-all text-center",
                      selectedDate === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {formatDate(grouped.get(d)![0].startTime)}
                  </button>
                ))}
              </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  Выберите время
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {slotsForDate.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-medium border transition-all",
                        selectedSlot?.id === slot.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      {formatTime(slot.startTime)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedSlot && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">Новое время:</p>
                <p className="text-primary mt-0.5">
                  {formatDate(selectedSlot.startTime)} · {formatTime(selectedSlot.startTime)} — {formatTime(selectedSlot.endTime)}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Отмена
          </Button>
          <Button
            onClick={() => rescheduleMutation.mutate()}
            disabled={!selectedSlot || rescheduleMutation.isPending}
            className="rounded-xl gap-1.5"
          >
            <ChevronRight className="w-4 h-4" />
            {rescheduleMutation.isPending ? "Переносим..." : "Подтвердить перенос"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
