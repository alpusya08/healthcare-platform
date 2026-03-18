import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope, Star, Clock, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { Doctor } from "@/features/appointments/types";

function DoctorCard({ doctor, onClick }: { doctor: Doctor; onClick: () => void }) {
  return (
    <Card
      className="border-border hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 shrink-0">
              <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{doctor.fullName}</p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {doctor.specialization}
              </Badge>
              {doctor.bio && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                  {doctor.bio}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {doctor.yearsExperience} лет опыта
                </span>
                {doctor.averageRating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    {doctor.averageRating.toFixed(1)}
                  </span>
                )}
                {doctor.consultationFee != null && (
                  <span>{doctor.consultationFee.toLocaleString("ru-RU")} ₸</span>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DoctorsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => appointmentsApi.listDoctors(),
  });

  const filtered = doctors.filter(
    (d) =>
      d.fullName.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Выбор врача</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Выберите специалиста и запишитесь на удобное время
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени или специальности..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Врачи не найдены
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onClick={() => navigate(`/book/${doctor.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
