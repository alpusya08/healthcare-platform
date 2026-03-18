import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Stethoscope, XCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { Appointment, AppointmentStatus } from "@/features/appointments/types";
import { routes } from "@/shared/config/routes";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Запланировано",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  NO_SHOW: "Не явился",
};

const STATUS_VARIANTS: Record<AppointmentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  SCHEDULED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "outline",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AppointmentCard({ appt, onCancel }: { appt: Appointment; onCancel: (id: string) => void }) {
  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 shrink-0">
              <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{appt.doctorName}</p>
              <p className="text-sm text-muted-foreground">{appt.specialization}</p>
              <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{formatDateTime(appt.startTime)}</span>
                <Clock className="w-3.5 h-3.5 shrink-0 ml-1" />
                <span>
                  {new Date(appt.startTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {new Date(appt.endTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {appt.complaint && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Жалоба: {appt.complaint}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant={STATUS_VARIANTS[appt.status]}>{STATUS_LABELS[appt.status]}</Badge>
            {appt.status === "SCHEDULED" && (
              <button
                onClick={() => onCancel(appt.id)}
                className="flex items-center gap-1 text-xs text-destructive hover:underline"
              >
                <XCircle className="w-3.5 h-3.5" />
                Отменить
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AppointmentsPage() {
  const queryClient = useQueryClient();

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Мои записи</h1>
          <p className="mt-1 text-muted-foreground text-sm">Управление записями к врачам</p>
        </div>
        <Button asChild>
          <Link to={routes.patient.doctors}>
            <Plus className="w-4 h-4 mr-2" />
            Записаться
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : appointments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="font-medium text-foreground">Записей пока нет</p>
            <p className="text-sm text-muted-foreground mt-1">
              Выберите врача и удобное время для визита
            </p>
            <Button asChild className="mt-4">
              <Link to={routes.patient.doctors}>Найти врача</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Предстоящие
              </h2>
              {upcoming.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appt={a}
                  onCancel={(id) => cancelMutation.mutate(id)}
                />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                История
              </h2>
              {past.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appt={a}
                  onCancel={(id) => cancelMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
