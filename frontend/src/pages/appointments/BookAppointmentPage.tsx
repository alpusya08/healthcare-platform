import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, ChevronLeft, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { AppointmentType, TimeSlot } from "@/features/appointments/types";
import { routes } from "@/shared/config/routes";

function formatSlotDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatSlotTime(start: string, end: string) {
  const fmt = (s: string) =>
    new Date(s).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function groupSlotsByDate(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const map = new Map<string, TimeSlot[]>();
  for (const slot of slots) {
    const key = new Date(slot.startTime).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(slot);
  }
  return map;
}

export function BookAppointmentPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("OFFLINE");
  const [complaint, setComplaint] = useState("");

  const { data: doctor } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => appointmentsApi.listDoctors(),
    select: (doctors) => doctors.find((d) => d.id === doctorId),
    enabled: !!doctorId,
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", doctorId],
    queryFn: () => appointmentsApi.listSlots(doctorId!),
    enabled: !!doctorId,
  });

  const bookMutation = useMutation({
    mutationFn: appointmentsApi.book,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Запись успешно создана!");
      navigate(routes.patient.appointments);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Не удалось создать запись";
      toast.error(msg);
    },
  });

  const handleBook = () => {
    if (!selectedSlot) {
      toast.error("Выберите время приёма");
      return;
    }
    bookMutation.mutate({
      slotId: selectedSlot.id,
      type: appointmentType,
      complaint: complaint || undefined,
    });
  };

  const grouped = groupSlotsByDate(slots);

  return (
    <div className="space-y-6 max-w-2xl">
      <button
        onClick={() => navigate(routes.patient.doctors)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Назад к выбору врача
      </button>

      {doctor && (
        <Card className="border-border">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/50">
                <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{doctor.fullName}</p>
                <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Выберите время
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slotsLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка слотов...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Нет доступных слотов у этого врача
            </p>
          ) : (
            <div className="space-y-5">
              {Array.from(grouped.entries()).map(([dateKey, daySlots]) => (
                <div key={dateKey}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {formatSlotDate(daySlots[0].startTime)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                          selectedSlot?.id === slot.id
                            ? "bg-teal-600 border-teal-600 text-white"
                            : "border-border text-foreground hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                        )}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {formatSlotTime(slot.startTime, slot.endTime)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Формат приёма</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            {(["OFFLINE", "ONLINE"] as AppointmentType[]).map((t) => (
              <button
                key={t}
                onClick={() => setAppointmentType(t)}
                className={cn(
                  "flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                  appointmentType === t
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "border-border text-foreground hover:border-teal-400"
                )}
              >
                {t === "OFFLINE" ? "Очно" : "Онлайн"}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="complaint" className="text-sm">
              Опишите жалобу (необязательно)
            </Label>
            <Textarea
              id="complaint"
              placeholder="С чем хотите обратиться к врачу?"
              rows={3}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleBook}
        disabled={!selectedSlot || bookMutation.isPending}
      >
        {bookMutation.isPending ? "Записываем..." : "Подтвердить запись"}
      </Button>
    </div>
  );
}
