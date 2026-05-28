import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Clock, XCircle, Plus, Star, CheckCircle2,
  FileText, CalendarX, Video, ArrowLeftRight, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { Appointment, AppointmentStatus } from "@/features/appointments/types";
import { routes } from "@/shared/config/routes";
import { ReviewModal } from "@/widgets/review-modal/ReviewModal";
import { AppointmentDetailModal } from "@/widgets/appointment-detail/AppointmentDetailModal";
import { RescheduleModal } from "@/widgets/reschedule-modal/RescheduleModal";
import { PaymentModal } from "@/widgets/payment-modal/PaymentModal";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Запланировано",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  NO_SHOW: "Не явился",
};

const STATUS_VARIANTS: Record<AppointmentStatus, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  SCHEDULED: "info",
  COMPLETED: "success",
  CANCELLED: "destructive",
  NO_SHOW: "warning",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function UpcomingAppointmentCard({
  appt,
  onCancel,
  onOpen,
  onReschedule,
  onPay,
}: {
  appt: Appointment;
  onCancel: (id: string) => void;
  onOpen: (appt: Appointment) => void;
  onReschedule: (appt: Appointment) => void;
  onPay: (appt: Appointment) => void;
}) {
  return (
    <Card
      className="shadow-lg hover:shadow-xl rounded-2xl border-border transition-all duration-200 cursor-pointer"
      onClick={() => onOpen(appt)}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-white font-bold flex items-center justify-center text-sm shrink-0">
            {getInitials(appt.doctorName)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate text-base">{appt.doctorName}</p>
                <p className="text-sm text-muted-foreground">{appt.specialization}</p>
              </div>
              <Badge variant={STATUS_VARIANTS[appt.status]} className="shrink-0">
                {STATUS_LABELS[appt.status]}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                {formatDateTime(appt.startTime)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                {new Date(appt.startTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {new Date(appt.endTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {appt.type && (
                <Badge variant="outline" className="text-xs font-normal">
                  {appt.type === "ONLINE" ? "Онлайн" : "Офлайн"}
                </Badge>
              )}
            </div>

            {appt.complaint && (
              <p className="text-xs text-muted-foreground mt-2 truncate">
                Жалоба: {appt.complaint}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {appt.type === "ONLINE" && appt.meetingLink && (
                <Button
                  size="sm"
                  className="rounded-xl h-8 text-xs gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(appt.meetingLink, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Video className="w-3.5 h-3.5" />
                  Подключиться
                </Button>
              )}
              {appt.paymentStatus === "PENDING" && appt.paymentAmount != null && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                  onClick={(e) => { e.stopPropagation(); onPay(appt); }}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Оплатить {appt.paymentAmount} ₸
                </Button>
              )}
              {appt.paymentStatus === "PAID" && (
                <Badge variant="success" className="gap-1.5 text-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  Оплачено
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-8 text-xs gap-1.5"
                onClick={(e) => { e.stopPropagation(); onReschedule(appt); }}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Перенести
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl h-8 text-xs gap-1.5"
                onClick={(e) => { e.stopPropagation(); onOpen(appt); }}
              >
                <FileText className="w-3.5 h-3.5" />
                Детали
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                onClick={(e) => { e.stopPropagation(); onCancel(appt.id); }}
              >
                <XCircle className="w-3.5 h-3.5" />
                Отменить
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompletedAppointmentCard({
  appt,
  onReview,
  onOpen,
}: {
  appt: Appointment;
  onReview: (appt: Appointment) => void;
  onOpen: (appt: Appointment) => void;
}) {
  return (
    <Card
      className="shadow-lg hover:shadow-xl rounded-2xl border-border transition-all duration-200 cursor-pointer opacity-90"
      onClick={() => onOpen(appt)}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-4">
          {/* Muted avatar for completed */}
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm shrink-0">
            {getInitials(appt.doctorName)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{appt.doctorName}</p>
                <p className="text-sm text-muted-foreground">{appt.specialization}</p>
              </div>
              <Badge variant={STATUS_VARIANTS[appt.status]} className="shrink-0">
                {STATUS_LABELS[appt.status]}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {formatDateTime(appt.startTime)}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-4">
              {appt.status === "COMPLETED" && !appt.hasReview ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-8 text-xs gap-1.5 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
                  onClick={(e) => { e.stopPropagation(); onReview(appt); }}
                >
                  <Star className="w-3.5 h-3.5" />
                  Оставить отзыв
                </Button>
              ) : appt.status === "COMPLETED" && appt.hasReview ? (
                <Badge variant="success" className="gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Отзыв оставлен
                </Badge>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl h-8 text-xs gap-1.5 ml-auto"
                onClick={(e) => { e.stopPropagation(); onOpen(appt); }}
              >
                <FileText className="w-3.5 h-3.5" />
                Детали
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [reviewTarget, setReviewTarget] = useState<Appointment | null>(null);
  const [detailTarget, setDetailTarget] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [payTarget, setPayTarget] = useState<Appointment | null>(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", "my"],
    queryFn: appointmentsApi.myAppointments,
  });

  const cancelMutation = useMutation({
    mutationFn: appointmentsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Запись отменена");
    },
    onError: () => toast.error("Не удалось отменить запись"),
  });

  const upcoming = appointments.filter((a) => a.status === "SCHEDULED");
  const past = appointments.filter((a) => a.status !== "SCHEDULED");

  return (
    <div>
      {/* Gradient header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Мои записи</h1>
              <p className="mt-2 text-muted-foreground">Управляйте вашими консультациями</p>
            </div>
            <Button asChild className="rounded-xl gap-2">
              <Link to={routes.patient.doctors}>
                <Plus className="w-4 h-4" />
                Записаться
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Загрузка...</div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
              <CalendarX className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Записей пока нет</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Выберите врача и удобное время для визита
            </p>
            <Button asChild className="rounded-xl">
              <Link to={routes.patient.doctors}>Найти врача</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Upcoming section */}
            {upcoming.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Предстоящие приёмы</h2>
                  <Badge variant="info" className="rounded-xl px-2.5">
                    {upcoming.length}
                  </Badge>
                </div>
                <div className="space-y-4">
                  {upcoming.map((a) => (
                    <UpcomingAppointmentCard
                      key={a.id}
                      appt={a}
                      onCancel={(id) => cancelMutation.mutate(id)}
                      onOpen={setDetailTarget}
                      onReschedule={setRescheduleTarget}
                      onPay={setPayTarget}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed section */}
            {past.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">Завершённые приёмы</h2>
                </div>
                <div className="space-y-4">
                  {past.map((a) => (
                    <CompletedAppointmentCard
                      key={a.id}
                      appt={a}
                      onReview={setReviewTarget}
                      onOpen={setDetailTarget}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {reviewTarget && (
        <ReviewModal
          appointmentId={reviewTarget.id}
          doctorName={reviewTarget.doctorName}
          onClose={() => setReviewTarget(null)}
        />
      )}

      <AppointmentDetailModal
        appointment={detailTarget}
        onClose={() => setDetailTarget(null)}
        onCancel={(id) => { cancelMutation.mutate(id); setDetailTarget(null); }}
        onReview={(appt) => { setReviewTarget(appt); setDetailTarget(null); }}
      />

      {rescheduleTarget && (
        <RescheduleModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
        />
      )}

      {payTarget && (
        <PaymentModal
          appointment={payTarget}
          onClose={() => setPayTarget(null)}
        />
      )}
    </div>
  );
}
