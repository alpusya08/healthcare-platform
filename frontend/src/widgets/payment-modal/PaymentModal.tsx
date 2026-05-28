import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Lock, CheckCircle2, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { Appointment } from "@/features/appointments/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCard(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaymentModal({ appointment, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [paid, setPaid] = useState(false);

  const payMutation = useMutation({
    mutationFn: () => appointmentsApi.pay(appointment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setPaid(true);
      toast.success("Оплата прошла успешно!");
      setTimeout(() => { onSuccess?.(); onClose(); }, 1800);
    },
    onError: () => toast.error("Ошибка оплаты. Попробуйте снова."),
  });

  const isFormValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiry.length === 5 &&
    cvv.length >= 3 &&
    cardName.trim().length >= 3;

  if (paid) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-safe/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-safe" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Оплачено!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {appointment.paymentAmount ?? appointment.paymentAmount} ₸ списано успешно
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Оплата приёма
          </DialogTitle>
          <DialogDescription>
            Демо-оплата через платформу MedAI
          </DialogDescription>
        </DialogHeader>

        {/* Appointment summary */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{appointment.doctorName}</span>
            <Badge variant="info" className="text-xs">{appointment.specialization}</Badge>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDateTime(appointment.startTime)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {appointment.type === "ONLINE" ? "Онлайн" : "Офлайн"}
            </span>
          </div>
          <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">К оплате</span>
            <span className="text-lg font-bold text-primary">
              {appointment.paymentAmount != null ? `${appointment.paymentAmount} ₸` : "—"}
            </span>
          </div>
        </div>

        {/* Card form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cardName" className="text-sm">Имя на карте</Label>
            <Input
              id="cardName"
              placeholder="IVAN PETROV"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              className="rounded-xl h-11 font-mono"
              maxLength={26}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cardNumber" className="text-sm">Номер карты</Label>
            <Input
              id="cardNumber"
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCard(e.target.value))}
              className="rounded-xl h-11 font-mono tracking-widest"
              maxLength={19}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expiry" className="text-sm">Срок действия</Label>
              <Input
                id="expiry"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                className="rounded-xl h-11 font-mono"
                maxLength={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cvv" className="text-sm">CVV</Label>
              <Input
                id="cvv"
                placeholder="•••"
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="rounded-xl h-11 font-mono"
                maxLength={4}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 text-safe" />
          Демо-режим. Реальные средства не списываются.
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Отмена
          </Button>
          <Button
            onClick={() => payMutation.mutate()}
            disabled={!isFormValid || payMutation.isPending}
            className="flex-1 rounded-xl gap-1.5"
          >
            <CreditCard className="w-4 h-4" />
            {payMutation.isPending ? "Обрабатываем..." : "Оплатить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
