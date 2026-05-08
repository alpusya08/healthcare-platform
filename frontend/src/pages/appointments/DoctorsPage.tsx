import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope, Star, Clock, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
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

const RATING_OPTIONS = [
  { label: "Любой", value: 0 },
  { label: "4+", value: 4 },
  { label: "4.5+", value: 4.5 },
];

const PRICE_OPTIONS = [
  { label: "Любая", value: Infinity },
  { label: "до 5 000 ₸", value: 5000 },
  { label: "до 10 000 ₸", value: 10000 },
  { label: "до 20 000 ₸", value: 20000 },
];

export function DoctorsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const specFilter = searchParams.get("specialization");

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(Infinity);
  const [selectedSpec, setSelectedSpec] = useState<string>(specFilter ?? "");

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => appointmentsApi.listDoctors(),
  });

  const specializations = useMemo(
    () => Array.from(new Set(doctors.map((d) => d.specialization))).sort(),
    [doctors]
  );

  const filtered = doctors.filter((d: Doctor) => {
    const matchesSpec = selectedSpec
      ? d.specialization.toLowerCase() === selectedSpec.toLowerCase()
      : true;
    const matchesSearch =
      d.fullName.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization.toLowerCase().includes(search.toLowerCase());
    const matchesRating = d.averageRating >= minRating;
    const matchesPrice =
      d.consultationFee == null ? true : d.consultationFee <= maxPrice;
    return matchesSpec && matchesSearch && matchesRating && matchesPrice;
  });

  const hasActiveFilters = minRating > 0 || maxPrice < Infinity || selectedSpec !== "";

  const clearFilters = () => {
    setMinRating(0);
    setMaxPrice(Infinity);
    setSelectedSpec("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Выбор врача</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Выберите специалиста и запишитесь на удобное время
        </p>
      </div>

      {specFilter && selectedSpec === specFilter && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-sm text-teal-700 dark:text-teal-300">
          <Stethoscope className="w-4 h-4 shrink-0" />
          <span>
            По результатам анализа рекомендован:{" "}
            <strong className="capitalize">{specFilter}</strong>
          </span>
          <button
            className="ml-auto text-xs underline text-teal-600 dark:text-teal-400"
            onClick={clearFilters}
          >
            Все врачи
          </button>
        </div>
      )}

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или специальности..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters((v) => !v)}
          className="shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card className="border-border">
          <CardContent className="pt-4 pb-4 space-y-4">
            {/* Specialization */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Специализация
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSpec("")}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    selectedSpec === ""
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "border-border text-foreground hover:border-teal-400"
                  }`}
                >
                  Все
                </button>
                {specializations.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpec(spec)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      selectedSpec === spec
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "border-border text-foreground hover:border-teal-400"
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Минимальный рейтинг
              </p>
              <div className="flex gap-2">
                {RATING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMinRating(opt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      minRating === opt.value
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "border-border text-foreground hover:border-teal-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Стоимость приёма
              </p>
              <div className="flex flex-wrap gap-2">
                {PRICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMaxPrice(opt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      maxPrice === opt.value
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "border-border text-foreground hover:border-teal-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Сбросить фильтры
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Врачи не найдены</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onClick={() => navigate(`/doctors/${doctor.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
