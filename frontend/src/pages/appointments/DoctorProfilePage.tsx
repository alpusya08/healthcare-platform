import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Stethoscope,
  Star,
  Clock,
  MessageSquare,
  Calendar,
  BadgeCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { DoctorReview } from "@/features/appointments/types";
import { routes } from "@/shared/config/routes";

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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-xs font-semibold text-teal-700 dark:text-teal-300">
            {review.patientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{review.patientName}</p>
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
        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed pl-10">
          {review.comment}
        </p>
      )}
    </div>
  );
}

function SlotChip({ startTime, endTime }: { startTime: string; endTime: string }) {
  const fmt = (s: string) =>
    new Date(s).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const date = new Date(startTime).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg border border-border text-center min-w-[80px]">
      <span className="text-xs text-muted-foreground">{date}</span>
      <span className="text-sm font-medium text-foreground mt-0.5">
        {fmt(startTime)}–{fmt(endTime)}
      </span>
    </div>
  );
}

export function DoctorProfilePage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-48 text-muted-foreground">
        Загрузка...
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="text-center py-16 text-muted-foreground">Врач не найден</div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <button
        onClick={() => navigate(routes.patient.doctors)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Все врачи
      </button>

      {/* Doctor header card */}
      <Card className="border-border">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center shrink-0">
              <Stethoscope className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{doctor.fullName}</h1>
                  <Badge variant="secondary" className="mt-1">
                    {doctor.specialization}
                  </Badge>
                </div>
                {doctor.consultationFee != null && (
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-foreground">
                      {doctor.consultationFee.toLocaleString("ru-RU")} ₸
                    </p>
                    <p className="text-xs text-muted-foreground">за приём</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {doctor.yearsExperience} лет опыта
                </span>
                {avgRating > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400" />
                    {avgRating.toFixed(1)}
                    <span className="text-xs">({reviews.length} отзывов)</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-teal-500" />
                  Верифицирован
                </span>
              </div>

              {doctor.bio && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {doctor.bio}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available slots */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Ближайшие свободные слоты
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nearestSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет свободных слотов</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {nearestSlots.map((slot) => (
                <SlotChip
                  key={slot.id}
                  startTime={slot.startTime}
                  endTime={slot.endTime}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
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
            <p className="text-sm text-muted-foreground">Отзывов пока нет</p>
          ) : (
            <div className="divide-y divide-border">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Button
        className="w-full"
        onClick={() => navigate(`/book/${doctorId}`)}
      >
        Записаться к врачу
      </Button>
    </div>
  );
}
