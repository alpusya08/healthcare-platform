import { useState, useEffect, useMemo } from "react";
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
import type { Appointment, AppointmentType, TimeSlot } from "@/features/appointments/types";
import { routes } from "@/shared/config/routes";
import { PaymentModal } from "@/widgets/payment-modal/PaymentModal";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

type MonthMap = Map<string, Map<string, TimeSlot[]>>;

function buildMonthMap(slots: TimeSlot[]): MonthMap {
  const map: MonthMap = new Map();
  for (const slot of slots) {
    const mk = monthKey(slot.startTime);
    const dk = dayKey(slot.startTime);
    if (!map.has(mk)) map.set(mk, new Map());
    const dayMap = map.get(mk)!;
    if (!dayMap.has(dk)) dayMap.set(dk, []);
    dayMap.get(dk)!.push(slot);
  }
  return map;
}

function monthLabel(mk: string) {
  const [year, month] = mk.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

export function BookAppointmentPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const presetSlotId = searchParams.get("slotId");
  const aiSessionId = searchParams.get("aiSessionId");

  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("OFFLINE");
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);
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

  const monthMap = useMemo(() => buildMonthMap(slots), [slots]);
  const monthKeys = useMemo(() => Array.from(monthMap.keys()).sort(), [monthMap]);

  // Init selected month once slots load
  useEffect(() => {
    if (monthKeys.length > 0 && !selectedMonthKey) {
      setSelectedMonthKey(monthKeys[0]);
    }
  }, [monthKeys, selectedMonthKey]);

  // When month changes, reset day and slot (unless preset)
  const handleMonthChange = (mk: string) => {
    setSelectedMonthKey(mk);
    setSelectedDayKey(null);
    setSelectedSlot(null);
  };

  // When day changes, reset slot
  const handleDayChange = (dk: string) => {
    setSelectedDayKey(dk);
    setSelectedSlot(null);
  };

  // Apply preset slotId after slots load
  useEffect(() => {
    if (presetSlotId && slots.length > 0 && !selectedSlot) {
      const match = slots.find((s) => s.id === presetSlotId);
      if (match) {
        const mk = monthKey(match.startTime);
        const dk = dayKey(match.startTime);
        setSelectedMonthKey(mk);
        setSelectedDayKey(dk);
        setSelectedSlot(match);
      }
    }
  }, [presetSlotId, slots, selectedSlot]);

  const dayMap: Map<string, TimeSlot[]> = selectedMonthKey ? (monthMap.get(selectedMonthKey) ?? new Map<string, TimeSlot[]>()) : new Map<string, TimeSlot[]>();
  const dayKeys = Array.from(dayMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const timeSlots = selectedDayKey ? (dayMap.get(selectedDayKey) ?? []) : [];

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
              <a href={appt.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Подключиться
              </a>
            </span>
          </div>,
          { duration: 10000 }
        );
      }
      if (appt.paymentAmount != null) {
        setBookedAppointment(appt);
      } else {
        navigate(routes.patient.appointments);
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Не удалось создать запись";
      toast.error(msg);
    },
  });

  const handleBook = () => {
    if (!selectedSlot) { toast.error("Выберите время приёма"); return; }
    bookMutation.mutate({
      slotId: selectedSlot.id,
      type: appointmentType,
      complaint: complaint || undefined,
      aiSessionId: aiSessionId || undefined,
    });
  };

  return (
    <div>
      {/* Gradient header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
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

          {/* ── BOOKING FORM ──────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Step 1: Month tabs */}
            <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-5 h-5 text-primary" />
                  Выберите дату
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {slotsLoading ? (
                  <p className="text-sm text-muted-foreground py-4">Загрузка слотов...</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Нет доступных слотов у этого врача</p>
                ) : (
                  <>
                    {/* Month tabs */}
                    <div className="flex gap-2 flex-wrap">
                      {monthKeys.map((mk) => (
                        <button
                          key={mk}
                          onClick={() => handleMonthChange(mk)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize",
                            selectedMonthKey === mk
                              ? "bg-primary border-primary text-primary-foreground shadow-sm"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          )}
                        >
                          {monthLabel(mk)}
                        </button>
                      ))}
                    </div>

                    {/* Day chips */}
                    {selectedMonthKey && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {dayKeys.map((dk) => {
                          const d = new Date(dk);
                          const dayNum = d.toLocaleDateString("ru-RU", { day: "numeric" });
                          const dayName = d.toLocaleDateString("ru-RU", { weekday: "short" });
                          const isSelected = selectedDayKey === dk;
                          const count = dayMap.get(dk)?.length ?? 0;
                          return (
                            <button
                              key={dk}
                              onClick={() => handleDayChange(dk)}
                              className={cn(
                                "flex flex-col items-center px-3 py-2 rounded-2xl border text-center min-w-[60px] transition-all",
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground shadow-md"
                                  : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                              )}
                            >
                              <span className={cn("text-[10px] capitalize", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                {dayName}
                              </span>
                              <span className="text-base font-bold leading-tight">{dayNum}</span>
                              <span className={cn("text-[10px] mt-0.5", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                {count} сл.
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Time slots */}
            {selectedDayKey && timeSlots.length > 0 && (
              <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="w-5 h-5 text-primary" />
                    Выберите время
                    <span className="text-sm font-normal text-muted-foreground capitalize ml-1">
                      — {new Date(selectedDayKey).toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" })}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          "py-2.5 rounded-xl border text-sm font-medium transition-all",
                          selectedSlot?.id === slot.id
                            ? "bg-primary border-primary text-primary-foreground shadow-md"
                            : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        {fmtTime(slot.startTime)}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appointment type */}
            <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
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
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className={cn("font-semibold text-sm", isSelected ? "text-primary" : "text-foreground")}>
                            {t === "OFFLINE" ? "Офлайн" : "Онлайн"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t === "OFFLINE" ? "Очный визит" : "Видеоконсультация"}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
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
                    <span className="text-xs text-muted-foreground font-normal">{complaint.length}/500</span>
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

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-warning/30 bg-warning/5">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Бесплатная отмена доступна не менее чем за 2 часа до начала приёма. Поздняя отмена может повлечь штраф.
              </p>
            </div>

            <Button
              className="w-full rounded-xl h-12 text-base font-semibold"
              onClick={handleBook}
              disabled={!selectedSlot || bookMutation.isPending}
            >
              {bookMutation.isPending ? "Записываем..." : "Подтвердить запись"}
            </Button>
          </div>

          {/* ── SUMMARY SIDEBAR ─────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <Card className="shadow-lg rounded-2xl border-border overflow-hidden">
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 pt-5 pb-4 border-b border-border">
                  <h3 className="font-bold text-foreground">Ваша запись</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Сводка выбранных параметров</p>
                </div>
                <CardContent className="pt-5 pb-5 space-y-4">
                  {doctor ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold flex items-center justify-center text-xs shrink-0">
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
                      <span className="font-medium text-foreground text-right max-w-[140px] capitalize text-xs">
                        {selectedSlot ? fmtDateLong(selectedSlot.startTime) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Время
                      </span>
                      <span className="font-medium text-foreground">
                        {selectedSlot ? `${fmtTime(selectedSlot.startTime)} – ${fmtTime(selectedSlot.endTime)}` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {appointmentType === "ONLINE" ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                        Формат
                      </span>
                      <Badge variant={appointmentType === "ONLINE" ? "info" : "secondary"} className="rounded-xl text-xs">
                        {appointmentType === "ONLINE" ? "Онлайн" : "Офлайн"}
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Итого</span>
                      <span className="text-lg font-bold text-primary">
                        {doctor?.consultationFee != null ? `${doctor.consultationFee.toLocaleString("ru-RU")} ₸` : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Оплата при визите или через платформу</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {bookedAppointment && (
        <PaymentModal
          appointment={bookedAppointment}
          onClose={() => { setBookedAppointment(null); navigate(routes.patient.appointments); }}
          onSuccess={() => navigate(routes.patient.appointments)}
        />
      )}
    </div>
  );
}
