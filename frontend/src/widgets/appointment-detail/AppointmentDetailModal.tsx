import {
  Calendar, Clock, Stethoscope, User, FileText,
  Monitor, MapPin, XCircle, Star, CheckCircle2, ChevronRight, Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import type { Appointment, AppointmentStatus, AppointmentType } from "@/features/appointments/types";

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
  onCancel?: (id: string) => void;
  onReview?: (appt: Appointment) => void;
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Запланировано",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  NO_SHOW: "Не явился",
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200",
  NO_SHOW: "bg-muted text-muted-foreground border-border",
};

const TYPE_LABELS: Record<AppointmentType, string> = {
  ONLINE: "Онлайн-консультация",
  OFFLINE: "Офлайн",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function getDoctorInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

export function AppointmentDetailModal({ appointment: appt, onClose, onCancel, onReview }: Props) {
  const navigate = useNavigate();

  if (!appt) return null;

  const startDate = new Date(appt.startTime);
  const endDate = new Date(appt.endTime);
  const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  return (
    <Dialog open={!!appt} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            Карточка записи
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status banner */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${STATUS_COLORS[appt.status]}`}>
            <span className="w-2 h-2 rounded-full bg-current opacity-70" />
            {STATUS_LABELS[appt.status]}
          </div>

          {/* Doctor */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center font-bold text-teal-700 dark:text-teal-300 shrink-0">
              {getDoctorInitials(appt.doctorName)}
            </div>
            <div>
              <p className="font-semibold text-foreground">{appt.doctorName}</p>
              <p className="text-sm text-muted-foreground">{appt.specialization}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => { navigate(`/doctors/${appt.doctorId}`); onClose(); }}
            >
              Профиль
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs">Дата</p>
                <p className="font-medium text-foreground capitalize">{formatDate(appt.startTime)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs">Время</p>
                <p className="font-medium text-foreground">
                  {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
                  <span className="text-muted-foreground font-normal ml-1">({durationMin} мин)</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              {appt.type === "ONLINE"
                ? <Monitor className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                : <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              }
              <div>
                <p className="text-muted-foreground text-xs">Формат</p>
                <p className="font-medium text-foreground">{TYPE_LABELS[appt.type]}</p>
              </div>
            </div>

            {appt.complaint && (
              <div className="flex items-start gap-3">
                <Stethoscope className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">Жалоба</p>
                  <p className="text-foreground leading-relaxed">{appt.complaint}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs">Номер записи</p>
                <p className="font-mono text-xs text-foreground">{appt.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {appt.status === "SCHEDULED" && appt.type === "ONLINE" && appt.meetingLink && (
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => window.open(appt.meetingLink, "_blank", "noopener,noreferrer")}
              >
                <Video className="w-4 h-4 mr-2" />
                Подключиться к видеоконсультации
              </Button>
            )}
            {appt.status === "SCHEDULED" && onCancel && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => { onCancel(appt.id); onClose(); }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Отменить запись
              </Button>
            )}
            {appt.status === "COMPLETED" && !appt.hasReview && onReview && (
              <Button
                className="w-full"
                onClick={() => { onReview(appt); onClose(); }}
              >
                <Star className="w-4 h-4 mr-2" />
                Оставить отзыв
              </Button>
            )}
            {appt.status === "COMPLETED" && appt.hasReview && (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-1">
                <CheckCircle2 className="w-4 h-4" />
                Отзыв уже оставлен
              </div>
            )}
            {(appt.status === "COMPLETED" || appt.status === "CANCELLED") && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { navigate(`/doctors/${appt.doctorId}`); onClose(); }}
              >
                Записаться повторно
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
