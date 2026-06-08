import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/model/authStore";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function DoctorReviewsPage() {
  const { user } = useAuthStore();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["doctor-reviews", user?.id],
    queryFn: () => appointmentsApi.doctorReviews(user!.id),
    enabled: !!user?.id,
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">Отзывы пациентов</h1>

      {reviews.length > 0 && (
        <Card className="shadow-lg rounded-2xl border-border">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <Star className="w-10 h-10 fill-amber-400 text-amber-400" />
                <span className="text-5xl font-bold text-foreground">{avgRating}</span>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-5 h-5",
                      parseFloat(avgRating) >= i ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
                    )}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                На основе {reviews.length} {reviews.length === 1 ? "отзыва" : "отзывов"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg hover:shadow-xl transition-all rounded-2xl border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            Все отзывы
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Загрузка...</p>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="font-semibold text-foreground">Отзывов пока нет</p>
              <p className="text-sm text-muted-foreground mt-1">Завершите приёмы, чтобы получить отзывы</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reviews.map((review) => (
                <div key={review.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {review.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{review.patientName}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(review.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className={cn("w-4 h-4", i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <div className="mt-3 ml-13">
                      <p className="text-sm text-muted-foreground leading-relaxed bg-secondary rounded-xl px-4 py-3 italic">
                        «{review.comment}»
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
