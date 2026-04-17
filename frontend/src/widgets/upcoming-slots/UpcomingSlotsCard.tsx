import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Star, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { UpcomingSlot } from "@/features/appointments/types";

interface Props {
  specializationCode?: string | null;
  aiSessionId?: string | null;
  limit?: number;
}

const RU_WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const RU_MONTHS = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

function formatSlotDate(iso: string): { date: string; time: string; relative: string } {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

  let relative: string;
  if (diffDays === 0) relative = "сегодня";
  else if (diffDays === 1) relative = "завтра";
  else if (diffDays === 2) relative = "послезавтра";
  else relative = `через ${diffDays} дн.`;

  const date = `${d.getDate()} ${RU_MONTHS[d.getMonth()]}, ${RU_WEEKDAYS[d.getDay()]}`;
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return { date, time, relative };
}

function getDoctorInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function SlotRow({ slot, aiSessionId }: { slot: UpcomingSlot; aiSessionId?: string | null }) {
  const navigate = useNavigate();
  const { date, time, relative } = formatSlotDate(slot.startTime);

  const handleBook = () => {
    const params = new URLSearchParams({ slotId: slot.slotId });
    if (aiSessionId) params.set("aiSessionId", aiSessionId);
    navigate(`/book/${slot.doctorId}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm transition-all">
      <div className="w-11 h-11 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-300 font-semibold text-sm shrink-0">
        {getDoctorInitials(slot.doctorFullName)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm truncate">{slot.doctorFullName}</p>
          {slot.averageRating > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-sand-700 dark:text-sand-400">
              <Star className="w-3 h-3 fill-sand-500 text-sand-500" />
              {slot.averageRating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
            {slot.specialization}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {slot.yearsExperience} лет опыта
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-xs">
          <span className="flex items-center gap-1 text-foreground font-medium">
            <Calendar className="w-3 h-3 text-teal-600" />
            {date}
          </span>
          <span className="flex items-center gap-1 text-foreground font-medium">
            <Clock className="w-3 h-3 text-teal-600" />
            {time}
          </span>
          <span className="text-teal-700 dark:text-teal-400 font-semibold">{relative}</span>
        </div>
      </div>

      <Button size="sm" onClick={handleBook} className="shrink-0">
        Записаться
        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
      </Button>
    </div>
  );
}

export function UpcomingSlotsCard({ specializationCode, aiSessionId, limit = 3 }: Props) {
  const navigate = useNavigate();

  const { data: slots, isLoading } = useQuery({
    queryKey: ["upcoming-slots", specializationCode, limit],
    queryFn: () => appointmentsApi.listUpcomingSlots(specializationCode ?? undefined, limit),
  });

  return (
    <Card className="border-teal-200 dark:border-teal-900 bg-teal-50/30 dark:bg-teal-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          Ближайшие свободные приёмы
          {specializationCode && (
            <Badge variant="outline" className="ml-auto text-xs font-normal capitalize">
              {specializationCode}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Подбираем врачей...
          </div>
        ) : !slots || slots.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              Нет свободных слотов у врачей этой специализации в ближайшие дни.
            </p>
            <Button
              variant="link"
              onClick={() => navigate(`/doctors${specializationCode ? `?specialization=${specializationCode}` : ""}`)}
              className="mt-1"
            >
              Посмотреть всех врачей
            </Button>
          </div>
        ) : (
          <>
            {slots.map((slot) => (
              <SlotRow key={slot.slotId} slot={slot} aiSessionId={aiSessionId} />
            ))}
            <Button
              variant="ghost"
              onClick={() => navigate(`/doctors${specializationCode ? `?specialization=${specializationCode}` : ""}`)}
              className="w-full mt-1 text-teal-700 dark:text-teal-400"
            >
              Выбрать другого врача
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
