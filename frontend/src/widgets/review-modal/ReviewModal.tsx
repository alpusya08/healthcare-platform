import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Star, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";

interface Props {
  appointmentId: string;
  doctorName: string;
  onClose: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Очень плохо",
  2: "Плохо",
  3: "Нормально",
  4: "Хорошо",
  5: "Отлично",
};

export function ReviewModal({ appointmentId, doctorName, onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () =>
      appointmentsApi.submitReview(appointmentId, {
        rating,
        comment: comment.trim() || undefined,
        anonymous,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Спасибо за отзыв!");
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Не удалось отправить отзыв";
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    if (rating < 1) {
      toast.error("Выберите оценку");
      return;
    }
    submitMutation.mutate();
  };

  const displayRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Оцените приём</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{doctorName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <Label className="text-sm font-medium">Ваша оценка</Label>
            <div className="mt-2 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-9 h-9 transition-colors",
                      n <= displayRating
                        ? "text-sand-500 fill-sand-500"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
              {displayRating > 0 && (
                <span className="ml-3 text-sm font-medium text-foreground">
                  {RATING_LABELS[displayRating]}
                </span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="review-comment" className="text-sm font-medium">
              Комментарий (необязательно)
            </Label>
            <Textarea
              id="review-comment"
              placeholder="Поделитесь впечатлениями: что понравилось, что можно улучшить..."
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              className="mt-2 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {comment.length}/2000
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAnonymous((v) => !v)}
            className={cn(
              "flex items-center gap-2.5 w-full p-3 rounded-lg border text-sm transition-all",
              anonymous
                ? "border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                : "border-border text-muted-foreground hover:border-blue-200 hover:text-foreground"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
              anonymous ? "border-blue-600 bg-blue-600" : "border-muted-foreground"
            )}>
              {anonymous && <div className="w-2 h-2 bg-white rounded-sm" />}
            </div>
            <EyeOff className="w-4 h-4 shrink-0" />
            <span>Оставить отзыв анонимно</span>
            {anonymous && (
              <span className="ml-auto text-xs text-blue-500">Ваше имя будет скрыто</span>
            )}
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitMutation.isPending}
          >
            {submitMutation.isPending ? "Отправка..." : "Отправить отзыв"}
          </Button>
        </div>
      </div>
    </div>
  );
}
