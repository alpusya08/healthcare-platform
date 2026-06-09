import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Video,
  MapPin, CheckCircle2, User, Clock, Calendar,
  Building2, Star, CreditCard, FileText,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { AppointmentType, TimeSlot } from "@/features/appointments/types";
import { routes } from "@/shared/config/routes";
import { PaymentModal } from "@/widgets/payment-modal/PaymentModal";
import type { Appointment } from "@/features/appointments/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", weekday: "short",
  });
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

// ── mini-calendar ─────────────────────────────────────────────────────────────

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function MiniCalendar({
  slots,
  selectedDay,
  onSelect,
}: {
  slots: TimeSlot[];
  selectedDay: string | null;
  onSelect: (day: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // set of days that have slots
  const slotDays = useMemo(() => {
    const s = new Set<string>();
    for (const sl of slots) s.add(isoDay(new Date(sl.startTime)));
    return s;
  }, [slots]);

  // auto-advance to month with first available slot
  useEffect(() => {
    if (slots.length === 0) return;
    const first = new Date(slots[0].startTime);
    setViewYear(first.getFullYear());
    setViewMonth(first.getMonth());
  }, [slots]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("ru-RU", {
    month: "long", year: "numeric",
  });

  const prevMonth = () => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };
  const nextMonth = () => {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  // build grid cells
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  // Monday=0 offset
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(viewYear, viewMonth, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const canPrev = new Date(viewYear, viewMonth, 1) > today;

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={!canPrev}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold capitalize">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const key = isoDay(date);
          const isToday = date.getTime() === today.getTime();
          const isPast = date < today;
          const hasSlot = slotDays.has(key);
          const isSelected = selectedDay === key;
          const isDisabled = isPast || !hasSlot;

          return (
            <button
              key={key}
              disabled={isDisabled}
              onClick={() => onSelect(key)}
              className={cn(
                "relative flex flex-col items-center justify-center h-10 rounded-xl text-sm transition-all",
                isSelected && "bg-primary text-primary-foreground shadow-md font-bold",
                !isSelected && isToday && !isDisabled && "border border-primary text-primary font-semibold",
                !isSelected && !isDisabled && "hover:bg-primary/10 hover:text-primary font-medium",
                isDisabled && "text-muted-foreground/40 cursor-not-allowed",
              )}
            >
              {date.getDate()}
              {hasSlot && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export function BookAppointmentPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const presetSlotId = searchParams.get("slotId");
  const aiSessionId = searchParams.get("aiSessionId");

  const presetApplied = useRef(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("OFFLINE");
  const [complaint, setComplaint] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);

  const { data: doctor } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => appointmentsApi.listDoctors(),
    select: (doctors) => doctors.find((d) => d.id === doctorId),
    enabled: !!doctorId,
  });

  const { data: rawSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", doctorId],
    queryFn: () => appointmentsApi.listSlots(doctorId!),
    enabled: !!doctorId,
  });

  const slots = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 60);
    return rawSlots
      .filter((s) => new Date(s.startTime) > new Date() && new Date(s.startTime) <= cutoff)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [rawSlots]);

  // Apply preset slot
  useEffect(() => {
    if (presetSlotId && slots.length > 0 && !presetApplied.current) {
      const match = slots.find((s) => s.id === presetSlotId);
      if (match) {
        setSelectedDay(isoDay(new Date(match.startTime)));
        setSelectedSlot(match);
        presetApplied.current = true;
      }
    }
  }, [presetSlotId, slots]);

  const daySlots = useMemo(() => {
    if (!selectedDay) return [];
    return slots.filter((s) => isoDay(new Date(s.startTime)) === selectedDay);
  }, [slots, selectedDay]);

  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
    setSelectedSlot(null);
  };

  const bookMutation = useMutation({
    mutationFn: appointmentsApi.book,
    onSuccess: (appt) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setConfirmOpen(false);
      if (appt.paymentAmount != null) {
        setBookedAppointment(appt);
      } else {
        toast.success("Запись создана", {
          description: `${appt.doctorName} · ${fmtDateShort(appt.startTime)}, ${fmtTime(appt.startTime)}–${fmtTime(appt.endTime)}`,
          duration: 6000,
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          action: {
            label: "Мои записи",
            onClick: () => navigate(routes.patient.appointments),
          },
        });
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
    setConfirmOpen(true);
  };

  const doBook = () => {
    if (!selectedSlot) return;
    bookMutation.mutate({
      slotId: selectedSlot.id,
      type: appointmentType,
      complaint: complaint || undefined,
      aiSessionId: aiSessionId || undefined,
    });
  };

  const doctorInitials = doctor
    ? doctor.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "";

  const DoctorAvatar = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
    const sizeClass = size === "sm" ? "w-9 h-9 text-xs rounded-xl" : size === "lg" ? "w-16 h-16 text-base rounded-2xl" : "w-12 h-12 text-sm rounded-2xl";
    const photoUrl = doctor?.photoUrl;
    return (
      <div className={`relative ${sizeClass} shrink-0`}>
        {photoUrl && (
          <img
            src={photoUrl}
            alt={doctor!.fullName}
            className={`${sizeClass} object-cover shadow absolute inset-0`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
            }}
          />
        )}
        <div
          className={`${sizeClass} bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold items-center justify-center shadow absolute inset-0`}
          style={{ display: photoUrl ? "none" : "flex" }}
        >
          {doctorInitials}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-base font-semibold text-foreground">Запись на приём</h1>
          {doctor && (
            <span className="text-sm text-muted-foreground hidden sm:block">
              · {doctor.fullName}
            </span>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-5xl mx-auto">

          {/* ── LEFT: form ────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Step 1: Format */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <p className="font-semibold text-sm text-foreground">Формат приёма</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["OFFLINE", "ONLINE"] as AppointmentType[]).map((t) => {
                  const isSelected = appointmentType === t;
                  const Icon = t === "ONLINE" ? Video : MapPin;
                  return (
                    <button
                      key={t}
                      onClick={() => setAppointmentType(t)}
                      className={cn(
                        "relative flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40 hover:bg-muted/20"
                      )}
                    >
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={cn("font-semibold text-sm", isSelected ? "text-primary" : "text-foreground")}>
                          {t === "OFFLINE" ? "Офлайн" : "Онлайн"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t === "OFFLINE" ? "Очный визит" : "Видеоконсультация"}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-primary absolute top-3 right-3" />
                      )}
                    </button>
                  );
                })}
              </div>
              {appointmentType === "OFFLINE" && doctor?.clinicName && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border text-sm">
                  <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{doctor.clinicName}</p>
                    {doctor.clinicAddress && (
                      <p className="text-xs text-muted-foreground mt-0.5">{doctor.clinicAddress}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Date */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <p className="font-semibold text-sm text-foreground">Выберите дату</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                {slotsLoading ? (
                  <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                    Загрузка расписания...
                  </div>
                ) : slots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-2">
                    <Calendar className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Нет доступных дат</p>
                  </div>
                ) : (
                  <MiniCalendar
                    slots={slots}
                    selectedDay={selectedDay}
                    onSelect={handleDaySelect}
                  />
                )}
              </div>
            </div>

            {/* Step 3: Time */}
            {selectedDay && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <p className="font-semibold text-sm text-foreground">
                    Выберите время
                    <span className="ml-2 text-muted-foreground font-normal capitalize">
                      — {new Date(selectedDay).toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" })}
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  {daySlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Нет слотов на выбранную дату
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {daySlots.map((slot) => {
                        const isSelected = selectedSlot?.id === slot.id;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "py-2.5 rounded-xl border text-sm font-medium transition-all",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground shadow-md"
                                : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                            )}
                          >
                            {fmtTime(slot.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Complaint */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0",
                  selectedDay ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {selectedDay ? "4" : "3"}
                </span>
                <p className="font-semibold text-sm text-foreground">
                  Опишите жалобу
                  <span className="ml-1.5 text-muted-foreground font-normal text-xs">(необязательно)</span>
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
                <Textarea
                  placeholder="С чем хотите обратиться к врачу? Опишите симптомы, длительность и характер жалоб..."
                  rows={4}
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value.slice(0, 500))}
                  className="resize-none rounded-xl border-border focus:ring-primary"
                />
                <div className="flex justify-end">
                  <span className="text-xs text-muted-foreground">{complaint.length}/500</span>
                </div>
              </div>
            </div>

            {/* Book button */}
            <Button
              className="w-full rounded-2xl h-14 text-base font-semibold shadow-md"
              size="lg"
              onClick={handleBook}
              disabled={!selectedSlot || bookMutation.isPending}
            >
              {bookMutation.isPending ? "Оформляем запись..." : "Записаться на приём"}
            </Button>
          </div>

          {/* ── RIGHT: doctor card + summary ──────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="sticky top-20 space-y-4">

              {/* Doctor card */}
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 border-b border-border">
                  {doctor ? (
                    <div className="flex items-center gap-3">
                      <DoctorAvatar size="md" />
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{doctor.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{doctor.specialization}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          {doctor.averageRating > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              {doctor.averageRating.toFixed(1)}
                            </span>
                          )}
                          {doctor.yearsExperience > 0 && (
                            <span>{doctor.yearsExperience} лет опыта</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="p-5 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Детали записи</p>
                  <div className="space-y-3">
                    <SummaryRow
                      icon={<Calendar className="w-4 h-4" />}
                      label="Дата"
                      value={selectedDay
                        ? new Date(selectedDay).toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" })
                        : undefined}
                    />
                    <SummaryRow
                      icon={<Clock className="w-4 h-4" />}
                      label="Время"
                      value={selectedSlot
                        ? `${fmtTime(selectedSlot.startTime)} – ${fmtTime(selectedSlot.endTime)}`
                        : undefined}
                    />
                    <SummaryRow
                      icon={appointmentType === "ONLINE" ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                      label="Формат"
                      value={appointmentType === "ONLINE" ? "Онлайн" : "Офлайн"}
                      badge
                    />
                    {appointmentType === "OFFLINE" && doctor?.clinicAddress && (
                      <SummaryRow
                        icon={<Building2 className="w-4 h-4" />}
                        label="Адрес"
                        value={doctor.clinicAddress}
                        small
                      />
                    )}
                  </div>

                  {/* Price */}
                  <div className="border-t border-border pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="w-4 h-4" />
                      Стоимость
                    </div>
                    <span className="text-xl font-bold text-primary">
                      {doctor?.consultationFee != null
                        ? `${doctor.consultationFee.toLocaleString("ru-RU")} ₸`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment modal */}
      {bookedAppointment && (
        <PaymentModal
          appointment={bookedAppointment}
          onClose={() => { setBookedAppointment(null); navigate(routes.patient.appointments); }}
          onSuccess={() => navigate(routes.patient.appointments)}
        />
      )}

      {/* Confirm modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Подтвердите запись</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Doctor */}
            {doctor && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/40 border border-border">
                <DoctorAvatar size="sm" />
                <div>
                  <p className="font-semibold text-foreground">{doctor.fullName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{doctor.specialization}</p>
                </div>
              </div>
            )}

            {/* Appointment details */}
            {selectedSlot && (
              <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
                <ConfirmRow icon={<Calendar className="w-4 h-4 text-primary" />} label="Дата">
                  <span className="capitalize font-medium text-sm">{fmtDateLong(selectedSlot.startTime)}</span>
                </ConfirmRow>
                <ConfirmRow icon={<Clock className="w-4 h-4 text-primary" />} label="Время">
                  <span className="font-medium text-sm">{fmtTime(selectedSlot.startTime)} – {fmtTime(selectedSlot.endTime)}</span>
                </ConfirmRow>
                <ConfirmRow
                  icon={appointmentType === "ONLINE" ? <Video className="w-4 h-4 text-primary" /> : <MapPin className="w-4 h-4 text-primary" />}
                  label="Формат"
                >
                  <Badge variant={appointmentType === "ONLINE" ? "info" : "secondary"} className="rounded-lg text-xs">
                    {appointmentType === "ONLINE" ? "Онлайн" : "Офлайн"}
                  </Badge>
                </ConfirmRow>
                {appointmentType === "OFFLINE" && doctor?.clinicName && (
                  <ConfirmRow icon={<Building2 className="w-4 h-4 text-primary" />} label="Клиника">
                    <div className="text-right">
                      <p className="text-sm font-medium">{doctor.clinicName}</p>
                      {doctor.clinicAddress && (
                        <p className="text-xs text-muted-foreground mt-0.5">{doctor.clinicAddress}</p>
                      )}
                    </div>
                  </ConfirmRow>
                )}
                {complaint && (
                  <ConfirmRow icon={<FileText className="w-4 h-4 text-primary" />} label="Жалоба">
                    <p className="text-sm text-right text-muted-foreground max-w-[180px] line-clamp-2">{complaint}</p>
                  </ConfirmRow>
                )}
              </div>
            )}

            {/* Price */}
            {doctor?.consultationFee != null && (
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Итого к оплате
                </div>
                <span className="text-xl font-bold text-primary">{doctor.consultationFee.toLocaleString("ru-RU")} ₸</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="flex-1 rounded-xl">
              Отмена
            </Button>
            <Button onClick={doBook} disabled={bookMutation.isPending} className="flex-1 rounded-xl">
              {bookMutation.isPending ? "Записываем..." : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── small helpers ─────────────────────────────────────────────────────────────

function SummaryRow({
  icon, label, value, badge, small,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  badge?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        {icon}
        {label}
      </span>
      {value ? (
        badge ? (
          <Badge variant="secondary" className="rounded-lg text-xs">{value}</Badge>
        ) : (
          <span className={cn(
            "font-medium text-foreground text-right",
            small ? "text-xs text-muted-foreground" : "text-sm"
          )}>
            {value}
          </span>
        )
      ) : (
        <span className="text-muted-foreground/50 text-xs">—</span>
      )}
    </div>
  );
}

function ConfirmRow({
  icon, label, children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        {icon}
        {label}
      </span>
      <div className="flex-1 flex justify-end">
        {children}
      </div>
    </div>
  );
}
