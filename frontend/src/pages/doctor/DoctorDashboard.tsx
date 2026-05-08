import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stethoscope,
  Calendar,
  Clock,
  FileText,
  User,
  CheckCheck,
  Star,
  LayoutGrid,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/model/authStore";
import { doctorApi, type DoctorAppointment } from "@/features/doctor/api/doctorApi";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
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

type Tab = "appointments" | "reviews" | "profile";

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "appointments", label: "Записи", icon: LayoutGrid },
  { id: "reviews", label: "Отзывы", icon: MessageSquare },
  { id: "profile", label: "Профиль", icon: User },
];

export function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("appointments");
  const [selectedAppt, setSelectedAppt] = useState<DoctorAppointment | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ["doctor", "appointments"],
    queryFn: doctorApi.myAppointments,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["doctor-reviews", user?.id],
    queryFn: () => appointmentsApi.doctorReviews(user!.id),
    enabled: !!user?.id && activeTab === "reviews",
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

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const initials = user
    ? user.fullName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "Д";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Панель врача</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Управление записями и просмотр AI-анализов пациентов
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold text-foreground">{upcoming.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Предстоящих</p>
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Appointments */}
      {activeTab === "appointments" && (
        <>
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
        </>
      )}

      {/* Tab: Reviews */}
      {activeTab === "reviews" && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Отзывы пациентов
              {avgRating > 0 && (
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  Средний рейтинг: <strong className="text-foreground">{avgRating.toFixed(1)}</strong>
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Отзывов пока нет</p>
            ) : (
              <div className="divide-y divide-border">
                {reviews.map((review) => (
                  <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-xs font-semibold text-teal-700 dark:text-teal-300">
                          {review.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {review.patientName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i <= review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed pl-10">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Profile */}
      {activeTab === "profile" && (
        <Card className="border-border">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-2xl font-bold text-teal-700 dark:text-teal-300 shrink-0">
                {initials}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{user?.fullName}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  <Stethoscope className="w-3 h-3 mr-1" />
                  Врач
                </Badge>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">ФИО</span>
                <span className="text-foreground font-medium">{user?.fullName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Роль</span>
                <span className="text-foreground font-medium">Врач</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Всего приёмов</span>
                <span className="text-foreground font-medium">{appointments.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
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
    <Card className="border-border hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm transition-all">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3 min-w-0 cursor-pointer flex-1" onClick={onOpen}>
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
