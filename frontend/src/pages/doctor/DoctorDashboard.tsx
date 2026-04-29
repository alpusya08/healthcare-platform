import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stethoscope, Calendar, Clock, FileText, User, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { doctorApi, type DoctorAppointment } from "@/features/doctor/api/doctorApi";
import { DoctorFeedbackModal } from "./DoctorFeedbackModal";

const STATUS_LABELS = {
  SCHEDULED: "Запланировано",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  NO_SHOW: "Не явился",
} as const;

const STATUS_VARIANTS = {
  SCHEDULED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "outline",
} as const;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DoctorDashboard() {
  const [selectedAppt, setSelectedAppt] = useState<DoctorAppointment | null>(null);
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ["doctor", "appointments"],
    queryFn: doctorApi.myAppointments,
  });

  const completeMutation = useMutation({
    mutationFn: doctorApi.markCompleted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor", "appointments"] });
      toast.success("Приём отмечен как завершённый");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Не удалось завершить приём";
      toast.error(msg);
    },
  });

  const upcoming = appointments.filter((a) => a.status === "SCHEDULED");
  const past = appointments.filter((a) => a.status !== "SCHEDULED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Панель врача</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Управление записями и просмотр AI-анализов пациентов
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-foreground">{upcoming.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Предстоящих записей</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-foreground">{past.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Завершено</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-foreground">
              {appointments.filter((a) => a.aiSessionId).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">С AI-анализом</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : appointments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="font-medium text-foreground">Записей пока нет</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Section title="Предстоящие">
              {upcoming.map((a) => (
                <AppointmentRow
                  key={a.id}
                  appt={a}
                  onOpen={() => setSelectedAppt(a)}
                  onComplete={() => completeMutation.mutate(a.id)}
                  completing={completeMutation.isPending}
                />
              ))}
            </Section>
          )}
          {past.length > 0 && (
            <Section title="История">
              {past.map((a) => (
                <AppointmentRow
                  key={a.id}
                  appt={a}
                  onOpen={() => setSelectedAppt(a)}
                />
              ))}
            </Section>
          )}
        </>
      )}

      {selectedAppt && (
        <DoctorFeedbackModal
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onSuccess={() => {
            setSelectedAppt(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </div>
  );
}

function AppointmentRow({
  appt,
  onOpen,
  onComplete,
  completing,
}: {
  appt: DoctorAppointment;
  onOpen: () => void;
  onComplete?: () => void;
  completing?: boolean;
}) {
  return (
    <Card
      className={cn(
        "border-border hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm transition-all"
      )}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div
            className="flex gap-3 min-w-0 cursor-pointer flex-1"
            onClick={onOpen}
          >
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 shrink-0">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{appt.patientName}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(appt.startTime)}
                </span>
                <span className="flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" />
                  {appt.type === "ONLINE" ? "Онлайн" : "Очно"}
                </span>
                {appt.aiSessionId && (
                  <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                    <FileText className="w-3 h-3" />
                    AI-анализ
                  </span>
                )}
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
            {onComplete && appt.status === "SCHEDULED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete();
                }}
                disabled={completing}
                className="h-7 text-xs"
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Завершить приём
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
