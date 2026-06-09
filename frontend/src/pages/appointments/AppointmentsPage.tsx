import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Clock, XCircle, Plus, Star, CheckCircle2,
  FileText, CalendarX, Video, MessageCircle, CreditCard, AlertTriangle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/ui/dialog";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { Appointment, AppointmentStatus } from "@/features/appointments/types";
import { chatApi } from "@/features/chat/api/chatApi";
import { routes } from "@/shared/config/routes";
import { ReviewModal } from "@/widgets/review-modal/ReviewModal";
import { AppointmentDetailModal } from "@/widgets/appointment-detail/AppointmentDetailModal";
import { PaymentModal } from "@/widgets/payment-modal/PaymentModal";
import { Skeleton } from "@/shared/ui/skeleton";

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

function getDisplayStatus(appt: Appointment): { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" } {
  if (appt.status === "SCHEDULED" && new Date(appt.startTime) <= new Date()) {
    return { label: "Прошедший", variant: "secondary" };
  }
  return { label: STATUS_LABELS[appt.status], variant: STATUS_VARIANTS[appt.status] };
}

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

function DoctorAvatar({ name, photoUrl, muted = false }: { name: string; photoUrl?: string | null; muted?: boolean }) {
  const initials = getInitials(name);
  const fallbackClass = `w-12 h-12 rounded-2xl font-bold items-center justify-center text-sm shrink-0 ${muted ? "bg-muted text-muted-foreground" : "bg-gradient-to-br from-primary to-primary/70 text-white"}`;
  return (
    <div className="relative w-12 h-12 shrink-0">
      {photoUrl && (
        <img
          src={photoUrl}
          alt={name}
          className="w-12 h-12 rounded-2xl object-cover absolute inset-0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
            (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
          }}
        />
      )}
      <div
        className={`${fallbackClass} absolute inset-0`}
        style={{ display: photoUrl ? "none" : "flex" }}
      >
        {initials}
      </div>
    </div>
  );
}

function UpcomingAppointmentCard({
  appt,
  onCancel,
  onOpen,
  onChat,
  onPay,
  unreadCount = 0,
}: {
  appt: Appointment;
  onCancel: (appt: Appointment) => void;
  onOpen: (appt: Appointment) => void;
  onChat: (appt: Appointment) => void;
  onPay: (appt: Appointment) => void;
  unreadCount?: number;
}) {
  return (
    <Card
      className="shadow-lg hover:shadow-xl rounded-2xl border-border transition-all duration-200 cursor-pointer"
      onClick={() => onOpen(appt)}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <DoctorAvatar name={appt.doctorName} photoUrl={appt.doctorPhotoUrl} />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate text-base">{appt.doctorName}</p>
                <p className="text-sm text-muted-foreground">{appt.specialization}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {unreadCount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onChat(appt); }}
                    className="relative flex items-center justify-center"
                    title={`${unreadCount} новых сообщений`}
                  >
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </button>
                )}
                <Badge variant={getDisplayStatus(appt).variant}>
                  {getDisplayStatus(appt).label}
                </Badge>
              </div>
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
                variant={unreadCount > 0 ? "default" : "outline"}
                className="rounded-xl h-8 text-xs gap-1.5 relative"
                onClick={(e) => { e.stopPropagation(); onChat(appt); }}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {unreadCount > 0 ? `Чат (${unreadCount})` : "Чат с врачом"}
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
                onClick={(e) => { e.stopPropagation(); onCancel(appt); }}
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
  onChat,
  unreadCount = 0,
}: {
  appt: Appointment;
  onReview: (appt: Appointment) => void;
  onOpen: (appt: Appointment) => void;
  onChat: (appt: Appointment) => void;
  unreadCount?: number;
}) {
  return (
    <Card
      className="shadow-lg hover:shadow-xl rounded-2xl border-border transition-all duration-200 cursor-pointer opacity-90"
      onClick={() => onOpen(appt)}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-4">
          <DoctorAvatar name={appt.doctorName} photoUrl={appt.doctorPhotoUrl} muted={!appt.doctorPhotoUrl} />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{appt.doctorName}</p>
                <p className="text-sm text-muted-foreground">{appt.specialization}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {unreadCount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onChat(appt); }}
                    className="relative flex items-center justify-center"
                    title={`${unreadCount} новых сообщений`}
                  >
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </button>
                )}
                <Badge variant={getDisplayStatus(appt).variant}>
                  {getDisplayStatus(appt).label}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {formatDateTime(appt.startTime)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              {(appt.status === "COMPLETED" || (appt.status === "SCHEDULED" && new Date(appt.startTime) <= new Date())) && (
                appt.hasReview ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Отзыв оставлен
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-8 text-xs gap-1.5 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
                    onClick={(e) => { e.stopPropagation(); onReview(appt); }}
                  >
                    <Star className="w-3.5 h-3.5" />
                    Оставить отзыв
                  </Button>
                )
              )}
              <Button
                size="sm"
                variant={unreadCount > 0 ? "default" : "outline"}
                className="rounded-xl h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                onClick={(e) => { e.stopPropagation(); onChat(appt); }}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {unreadCount > 0 ? `Чат (${unreadCount})` : "Чат"}
              </Button>
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reviewTarget, setReviewTarget] = useState<Appointment | null>(null);
  const [detailTarget, setDetailTarget] = useState<Appointment | null>(null);
  const [payTarget, setPayTarget] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: appointmentsApi.myAppointments,
    staleTime: 0,
  });

  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["chat", "unread"],
    queryFn: chatApi.getUnreadCounts,
    refetchInterval: 10000,
  });

  const cancelMutation = useMutation({
    mutationFn: appointmentsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Запись отменена");
    },
    onError: () => toast.error("Не удалось отменить запись"),
  });

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => a.status === "SCHEDULED" && new Date(a.startTime) > now,
  );
  const completed = appointments
    .filter((a) => a.status === "COMPLETED")
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  const other = appointments
    .filter((a) => a.status === "CANCELLED" || a.status === "NO_SHOW" || (a.status === "SCHEDULED" && new Date(a.startTime) <= now))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

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
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl border-border">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-56 mt-3" />
                      <div className="flex gap-2 mt-4">
                        <Skeleton className="h-8 w-24 rounded-xl" />
                        <Skeleton className="h-8 w-24 rounded-xl" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                      onCancel={(appt) => setCancelTarget(appt)}
                      onOpen={setDetailTarget}
                      onChat={(appt) => navigate(routes.patient.chat.replace(":appointmentId", appt.id))}
                      onPay={setPayTarget}
                      unreadCount={unreadCounts[a.id] ?? 0}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed section */}
            {completed.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-semibold text-foreground">Завершённые приёмы</h2>
                  <Badge variant="success" className="rounded-xl px-2.5">{completed.length}</Badge>
                </div>
                <div className="space-y-4">
                  {completed.map((a) => (
                    <CompletedAppointmentCard
                      key={a.id}
                      appt={a}
                      onReview={setReviewTarget}
                      onOpen={setDetailTarget}
                      onChat={(appt) => navigate(routes.patient.chat.replace(":appointmentId", appt.id))}
                      unreadCount={unreadCounts[a.id] ?? 0}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Cancelled / no-show / past-scheduled section */}
            {other.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">История</h2>
                  <Badge variant="secondary" className="rounded-xl px-2.5">{other.length}</Badge>
                </div>
                <div className="space-y-4">
                  {other.map((a) => (
                    <CompletedAppointmentCard
                      key={a.id}
                      appt={a}
                      onReview={setReviewTarget}
                      onOpen={setDetailTarget}
                      onChat={(appt) => navigate(routes.patient.chat.replace(":appointmentId", appt.id))}
                      unreadCount={unreadCounts[a.id] ?? 0}
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
        onCancel={(id) => { setCancelTarget(appointments.find(a => a.id === id) ?? null); setDetailTarget(null); }}
        onReview={(appt) => { setReviewTarget(appt); setDetailTarget(null); }}
      />

      {payTarget && (
        <PaymentModal
          appointment={payTarget}
          onClose={() => setPayTarget(null)}
        />
      )}

      {/* Cancel confirmation dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Отменить запись?
            </DialogTitle>
            <DialogDescription>
              {cancelTarget && (
                <>
                  <span className="font-medium text-foreground">{cancelTarget.doctorName}</span>
                  {" · "}
                  {new Date(cancelTarget.startTime).toLocaleString("ru-RU", {
                    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                  })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)} className="flex-1 rounded-xl">
              Оставить
            </Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-xl"
              disabled={cancelMutation.isPending}
              onClick={() => {
                if (cancelTarget) {
                  cancelMutation.mutate(cancelTarget.id);
                  setCancelTarget(null);
                }
              }}
            >
              Да, отменить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
