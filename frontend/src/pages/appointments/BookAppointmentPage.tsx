import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Clock, ChevronLeft, Stethoscope, Video,
  MapPin, AlertTriangle, CheckCircle2, User,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
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

function formatSlotTimeShort(start: string) {
  return new Date(start).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
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
  const [searchParams] = useSearchParams();
  const presetSlotId = searchParams.get("slotId");
  const aiSessionId = searchParams.get("aiSessionId");

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

  useEffect(() => {
    if (presetSlotId && slots.length > 0 && !selectedSlot) {
      const match = slots.find((s) => s.id === presetSlotId);
      if (match) setSelectedSlot(match);
    }
  }, [presetSlotId, slots, selectedSlot]);

  const bookMutation = useMutation({
    mutationFn: appointmentsApi.book,
    onSuccess: (appt) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Запись успешно создана!");
      if (appt.type === "ONLINE" && appt.meetingLink) {
        toast(
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm">
              Ссылка на онлайн-консультацию:{" "}
              <a
                href={appt.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Подключиться
              </a>
            </span>
          </div>,
          { duration: 10000 }
        );
      }
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
      aiSessionId: aiSessionId || undefined,
    });
  };

  const grouped = groupSlotsByDate(slots);

  const selectedDateLabel = selectedSlot
    ? formatSlotDate(selectedSlot.startTime)
    : null;
  const selectedTimeLabel = selectedSlot
    ? formatSlotTime(selectedSlot.startTime, selectedSlot.endTime)
    : null;

  return (
    <div>
      {/* Gradient header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate(routes.patient.doctors)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад к профилю врача
          </button>
          <h1 className="text-3xl font-bold text-foreground">Запись на приём</h1>
          {doctor && (
            <p className="mt-1 text-muted-foreground">
              {doctor.fullName} · {doctor.specialization}
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── BOOKING FORM (col-span-2) ───────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Date selection */}
            <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Выберите дату
                </CardTitle>
              </CardHeader>
              <CardContent>
                {slotsLoading ? (
                  <p className="text-sm text-muted-foreground py-4">Загрузка слотов...</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Нет доступных слотов у этого врача
                  </p>
                ) : (
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from(grouped.entries()).map(([dateKey, daySlots]) => {
                      const date = new Date(daySlots[0].startTime);
                      const isSelected = selectedSlot
                        ? new Date(selectedSlot.startTime).toDateString() === dateKey
                        : false;
                      const dayNum = date.toLocaleDateString("ru-RU", { day: "numeric" });
                      const dayName = date.toLocaleDateString("ru-RU", { weekday: "short" });
                      return (
                        <button
                          key={dateKey}
                          onClick={() => {
                            // Select first slot of that day if no slot of that day currently selected
                            const sameDay = selectedSlot
                              ? new Date(selectedSlot.startTime).toDateString() === dateKey
                              : false;
                            if (!sameDay) setSelectedSlot(daySlots[0]);
                          }}
                          className={cn(
                            "flex flex-col items-center py-2.5 px-1 rounded-2xl border text-xs font-medium transition-all",
                            isSelected
                              ? "bg-primary border-primary text-white shadow-md"
                              : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                          )}
                        >
                          <span className="text-[10px] opacity-70 mb-0.5">{dayName}</span>
                          <span className="text-base font-bold">{dayNum}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time slots */}
            {selectedSlot && (
              <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Выберите время
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const selectedDateKey = new Date(selectedSlot.startTime).toDateString();
                    const daySlots = grouped.get(selectedDateKey) ?? [];
                    return (
                      <div className="grid grid-cols-4 gap-2">
                        {daySlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "py-2.5 rounded-xl border text-sm font-medium transition-all",
                              selectedSlot?.id === slot.id
                                ? "bg-primary border-primary text-white shadow-md"
                                : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                            )}
                          >
                            {formatSlotTimeShort(slot.startTime)}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Appointment type */}
            <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  Формат приёма
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {(["OFFLINE", "ONLINE"] as AppointmentType[]).map((t) => {
                    const isSelected = appointmentType === t;
                    const Icon = t === "ONLINE" ? Video : MapPin;
                    return (
                      <button
                        key={t}
                        onClick={() => setAppointmentType(t)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className={cn(
                            "font-semibold text-sm",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {t === "OFFLINE" ? "Офлайн" : "Онлайн"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t === "OFFLINE" ? "Очный визит" : "Видеоконсультация"}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Complaint */}
            <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border">
              <CardContent className="pt-6 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="complaint" className="text-sm font-semibold flex items-center justify-between">
                    <span>Опишите жалобу</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {complaint.length}/500
                    </span>
                  </Label>
                  <Textarea
                    id="complaint"
                    placeholder="С чем хотите обратиться к врачу? (необязательно)"
                    rows={4}
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    maxLength={500}
                    className="resize-none rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Warning card */}
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-warning/30 bg-warning/5">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Бесплатная отмена доступна не менее чем за 2 часа до начала приёма. Поздняя отмена может повлечь штраф.
              </p>
            </div>

            {/* Submit button */}
            <Button
              className="w-full rounded-xl h-12 text-base font-semibold"
              onClick={handleBook}
              disabled={!selectedSlot || bookMutation.isPending}
            >
              {bookMutation.isPending ? "Записываем..." : "Подтвердить запись"}
            </Button>
          </div>

          {/* ── SUMMARY SIDEBAR (col-1) ─────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <Card className="shadow-lg rounded-2xl border-border overflow-hidden">
                {/* Sidebar gradient header */}
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 pt-5 pb-4 border-b border-border">
                  <h3 className="font-bold text-foreground">Ваша запись</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Сводка выбранных параметров</p>
                </div>
                <CardContent className="pt-5 pb-5 space-y-4">
                  {/* Doctor */}
                  {doctor ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {doctor.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{doctor.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{doctor.specialization}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Врач не выбран</p>
                    </div>
                  )}

                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Дата
                      </span>
                      <span className="font-medium text-foreground text-right max-w-[140px] capitalize">
                        {selectedDateLabel ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Время
                      </span>
                      <span className="font-medium text-foreground">
                        {selectedTimeLabel ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {appointmentType === "ONLINE"
                          ? <Video className="w-4 h-4" />
                          : <MapPin className="w-4 h-4" />
                        }
                        Формат
                      </span>
                      <Badge
                        variant={appointmentType === "ONLINE" ? "info" : "secondary"}
                        className="rounded-xl text-xs"
                      >
                        {appointmentType === "ONLINE" ? "Онлайн" : "Офлайн"}
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Итого</span>
                      <span className="text-lg font-bold text-primary">
                        {doctor?.consultationFee != null ? `${doctor.consultationFee} ₸` : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Оплата при визите или через платформу
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
