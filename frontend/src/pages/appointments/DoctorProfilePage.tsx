import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Star,
  Clock,
  MessageSquare,
  Calendar,
  BadgeCheck,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { DoctorReview, TimeSlot } from "@/features/appointments/types";
import { cn } from "@/shared/lib/utils";
import { routes } from "@/shared/config/routes";
import { BookConfirmModal } from "@/widgets/book-confirm-modal/BookConfirmModal";

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: DoctorReview }) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {review.patientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{review.patientName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <StarRating value={review.rating} />
      </div>
      {review.comment && (
        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed pl-12">
          {review.comment}
        </p>
      )}
    </div>
  );
}

function SlotChip({
  slot,
  selected,
  onClick,
}: {
  slot: TimeSlot;
  selected: boolean;
  onClick: () => void;
}) {
  const fmt = (s: string) =>
    new Date(s).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const date = new Date(slot.startTime).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center px-3 py-2.5 rounded-xl border text-center min-w-[88px] transition-all shadow-sm hover:shadow-md",
        selected
          ? "bg-primary border-primary text-primary-foreground shadow-lg"
          : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
      )}
    >
      <span className={cn("text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>{date}</span>
      <span className="text-sm font-semibold mt-0.5">
        {fmt(slot.startTime)}–{fmt(slot.endTime)}
      </span>
    </button>
  );
}

// Group slots by date string
function groupSlotsByDate(slots: TimeSlot[]): Record<string, TimeSlot[]> {
  return slots.reduce<Record<string, TimeSlot[]>>((acc, slot) => {
    const dateKey = new Date(slot.startTime).toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});
}

export function DoctorProfilePage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [confirmSlot, setConfirmSlot] = useState<TimeSlot | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => appointmentsApi.listDoctors(),
  });

  const doctor = doctors.find((d) => d.id === doctorId);

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["doctor-reviews", doctorId],
    queryFn: () => appointmentsApi.doctorReviews(doctorId!),
    enabled: !!doctorId,
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", doctorId],
    queryFn: () => appointmentsApi.listSlots(doctorId!),
    enabled: !!doctorId,
  });

  const isLoading = doctorsLoading || reviewsLoading || slotsLoading;

  const nearestSlots = slots.slice(0, 6);
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : doctor?.averageRating ?? 0;

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const slotsByDate = groupSlotsByDate(nearestSlots);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
          <div className="container mx-auto px-4 py-12">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 bg-muted rounded-xl" />
              <div className="h-24 w-full max-w-lg bg-muted rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center py-16">
          <p className="text-2xl font-bold text-foreground">Врач не найден</p>
          <p className="text-muted-foreground mt-2">Возможно, профиль был удалён или ссылка неверна</p>
          <Button className="mt-6 rounded-xl" onClick={() => navigate(routes.patient.doctors)}>
            Вернуться к списку
          </Button>
        </div>
      </div>
    );
  }

  const initials = doctor.fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero Header ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
        <div className="container mx-auto px-4 py-12">
          {/* Back button */}
          <button
            onClick={() => navigate(routes.patient.doctors)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Все врачи
          </button>

          {/* Doctor hero */}
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Large avatar */}
            {doctor.photoUrl ? (
              <img
                src={doctor.photoUrl}
                alt={doctor.fullName}
                className="w-24 h-24 rounded-2xl object-cover shrink-0 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-white font-bold text-3xl flex items-center justify-center shrink-0 shadow-lg">
                {initials}
              </div>
            )}

            {/* Name, specialty, badges */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-foreground">{doctor.fullName}</h1>
                  <Badge variant="success" className="flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Верифицирован
                  </Badge>
                </div>
                <Badge variant="info" className="mt-2 text-sm px-3 py-1">
                  {doctor.specialization}
                </Badge>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-6 text-sm">
                {avgRating > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map((i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-foreground">{avgRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({reviews.length} отзывов)</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold text-foreground">{doctor.yearsExperience}</span> лет опыта
                </div>
                {doctor.consultationFee != null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-bold text-foreground">
                      {doctor.consultationFee.toLocaleString("ru-RU")} ₸
                    </span>
                    <span className="text-muted-foreground text-xs">за приём</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action button */}
            <div className="shrink-0">
              <Button
                size="lg"
                className="rounded-xl shadow-lg px-8 gap-2"
                onClick={() =>
                  selectedSlot
                    ? setConfirmSlot(selectedSlot)
                    : navigate(`/book/${doctorId}`)
                }
              >
                <Calendar className="w-5 h-5" />
                Записаться
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column: About + Reviews */}
          <div className="lg:col-span-2 space-y-6">

            {/* About card */}
            {doctor.bio && (
              <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold">О враче</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{doctor.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Reviews card */}
            <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Отзывы пациентов
                  {reviews.length > 0 && (
                    <Badge variant="outline" className="ml-auto text-xs font-normal">
                      {reviews.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Отзывов пока нет</p>
                    <p className="text-xs text-muted-foreground mt-1">Будьте первым, кто оставит отзыв</p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-border">
                      {displayedReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                    {reviews.length > 3 && (
                      <button
                        className="mt-4 text-sm font-medium text-primary hover:underline flex items-center gap-1"
                        onClick={() => setShowAllReviews((v) => !v)}
                      >
                        {showAllReviews
                          ? "Скрыть отзывы"
                          : `Показать все ${reviews.length} отзыва`}
                      </button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">

            {/* Available Slots card */}
            <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Свободные слоты
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {nearestSlots.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Нет свободных слотов</p>
                  </div>
                ) : (
                  <>
                    {Object.entries(slotsByDate).map(([dateLabel, dateSlots]) => (
                      <div key={dateLabel}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 capitalize">
                          {dateLabel}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {dateSlots.map((slot) => (
                            <SlotChip
                              key={slot.id}
                              slot={slot}
                              selected={selectedSlot?.id === slot.id}
                              onClick={() =>
                                setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    {slots.length > nearestSlots.length && (
                      <button
                        className="text-xs font-medium text-primary hover:underline mt-1"
                        onClick={() => navigate(`/book/${doctorId}`)}
                      >
                        Показать все слоты →
                      </button>
                    )}
                  </>
                )}

                <Separator />

                {/* Book button */}
                {selectedSlot ? (
                  <Button
                    className="w-full rounded-xl shadow-lg gap-2"
                    onClick={() => setConfirmSlot(selectedSlot)}
                  >
                    <Calendar className="w-4 h-4" />
                    Записаться на{" "}
                    {new Date(selectedSlot.startTime).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                    })}
                    ,{" "}
                    {new Date(selectedSlot.startTime).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => navigate(`/book/${doctorId}`)}
                  >
                    Выбрать время
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Contact card */}
            <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border bg-gradient-to-br from-primary/5 to-accent/10">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">MedAI Клиника</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Онлайн и офлайн консультации</p>
                    <Badge variant="success" className="mt-2 text-xs">Доступен для записи</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {confirmSlot && (
        <BookConfirmModal
          doctorId={doctorId!}
          doctorName={doctor.fullName}
          specialization={doctor.specialization}
          consultationFee={doctor.consultationFee ?? null}
          slot={confirmSlot}
          onClose={() => setConfirmSlot(null)}
        />
      )}
    </div>
  );
}
