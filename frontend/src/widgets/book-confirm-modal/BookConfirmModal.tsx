import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Video, MapPin, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { AppointmentType, TimeSlot } from "@/features/appointments/types";
import { routes } from "@/shared/config/routes";
import { PaymentModal } from "@/widgets/payment-modal/PaymentModal";

interface Props {
  doctorId: string;
  doctorName: string;
  specialization: string;
  consultationFee: number | null;
  slot: TimeSlot;
  aiSessionId?: string | null;
  onClose: () => void;
}

export function BookConfirmModal({
  doctorId: _doctorId,
  doctorName,
  specialization,
  consultationFee,
  slot,
  aiSessionId,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [type, setType] = useState<AppointmentType>("OFFLINE");
  const [complaint, setComplaint] = useState("");
  const [bookedAppointment, setBookedAppointment] = useState<import("@/features/appointments/types").Appointment | null>(null);

  const bookMutation = useMutation({
    mutationFn: appointmentsApi.book,
    onSuccess: (appt) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      if (appt.paymentAmount != null) {
        setBookedAppointment(appt);
      } else {
        toast.success("Запись создана!");
        onClose();
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

  const dateLabel = new Date(slot.startTime).toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  });
  const timeLabel = new Date(slot.startTime).toLocaleTimeString("ru-RU", {
    hour: "2-digit", minute: "2-digit",
  }) + " – " + new Date(slot.endTime).toLocaleTimeString("ru-RU", {
    hour: "2-digit", minute: "2-digit",
  });

  if (bookedAppointment) {
    return (
      <PaymentModal
        appointment={bookedAppointment}
        onClose={() => { onClose(); navigate(routes.patient.appointments); }}
        onSuccess={() => { onClose(); navigate(routes.patient.appointments); }}
      />
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Подтверждение записи
          </DialogTitle>
          <DialogDescription>Проверьте данные перед записью</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Doctor + slot summary */}
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground text-sm">{doctorName}</p>
                <p className="text-xs text-muted-foreground">{specialization}</p>
              </div>
              {consultationFee != null && (
                <p className="text-base font-bold text-primary shrink-0">
                  {consultationFee.toLocaleString("ru-RU")} ₸
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1 border-t border-primary/10">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span className="capitalize">{dateLabel}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {timeLabel}
              </span>
            </div>
          </div>

          {/* Appointment type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Формат приёма</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["OFFLINE", "ONLINE"] as AppointmentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                    type === t
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  {t === "ONLINE" ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  {t === "ONLINE" ? "Онлайн" : "Офлайн"}
                </button>
              ))}
            </div>
          </div>

          {/* Complaint */}
          <div className="space-y-2">
            <Label htmlFor="complaint" className="text-sm font-medium">
              Жалоба <span className="text-muted-foreground font-normal">(необязательно)</span>
            </Label>
            <Textarea
              id="complaint"
              placeholder="Кратко опишите причину обращения..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className="rounded-xl resize-none text-sm"
              rows={3}
              maxLength={500}
            />
          </div>

          {consultationFee != null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              После записи будет предложена онлайн-оплата {consultationFee.toLocaleString("ru-RU")} ₸
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl flex-1">
            Отмена
          </Button>
          <Button
            onClick={() =>
              bookMutation.mutate({
                slotId: slot.id,
                type,
                complaint: complaint.trim() || undefined,
                aiSessionId: aiSessionId || undefined,
              })
            }
            disabled={bookMutation.isPending}
            className="rounded-xl flex-1 gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {bookMutation.isPending ? "Записываем..." : "Подтвердить запись"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
