import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope, Star, Clock, ChevronRight, Search, SlidersHorizontal, X, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
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
  { label: "Любой", value: "" },
  { label: "4+", value: "4" },
  { label: "4.5+", value: "4.5" },
];

const PRICE_OPTIONS = [
  { label: "Любая", value: "" },
  { label: "до 5 000 ₸", value: "5000" },
  { label: "до 10 000 ₸", value: "10000" },
  { label: "до 20 000 ₸", value: "20000" },
];

const EXPERIENCE_OPTIONS = [
  { label: "Любой", value: "" },
  { label: "3+ лет", value: "3" },
  { label: "5+ лет", value: "5" },
  { label: "10+ лет", value: "10" },
];

const SORT_OPTIONS = [
  { label: "По рейтингу", value: "rating_desc" },
  { label: "Цена: по возрастанию", value: "price_asc" },
  { label: "Цена: по убыванию", value: "price_desc" },
  { label: "По опыту", value: "experience_desc" },
];

const PAGE_SIZE = 12;

export function DoctorsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(searchParams.get("minRating") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [minExperience, setMinExperience] = useState(searchParams.get("minExperience") ?? "");
  const [selectedSpec, setSelectedSpec] = useState(searchParams.get("specialization") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "rating_desc");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "0"));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, minRating, maxPrice, minExperience, selectedSpec, sort]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (selectedSpec) params.specialization = selectedSpec;
    if (minRating) params.minRating = minRating;
    if (maxPrice) params.maxPrice = maxPrice;
    if (minExperience) params.minExperience = minExperience;
    if (sort !== "rating_desc") params.sort = sort;
    if (page > 0) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, selectedSpec, minRating, maxPrice, minExperience, sort, page, setSearchParams]);

  const queryParams = {
    query: debouncedSearch || undefined,
    specialization: selectedSpec || undefined,
    minRating: minRating ? Number(minRating) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minExperience: minExperience ? Number(minExperience) : undefined,
    sort,
    page,
    size: PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["doctors-search", queryParams],
    queryFn: () => appointmentsApi.searchDoctors(queryParams),
    placeholderData: (prev) => prev,
  });

  const doctors = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const hasActiveFilters = minRating !== "" || maxPrice !== "" || minExperience !== "" || selectedSpec !== "";

  const clearFilters = () => {
    setMinRating("");
    setMaxPrice("");
    setMinExperience("");
    setSelectedSpec("");
    setSearch("");
  };

  const specFilter = searchParams.get("specialization");

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

      {/* Search + sort + filter toggle */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или специальности..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            {/* Rating */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Минимальный рейтинг</p>
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
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Стоимость приёма</p>
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

            {/* Experience */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Опыт работы</p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMinExperience(opt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      minExperience === opt.value
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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border animate-pulse">
              <CardContent className="pt-5 pb-4 h-24" />
            </Card>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Врачи не найдены</div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Найдено: <span className="font-medium text-foreground">{totalElements}</span>
            </p>
          </div>

          <div className="space-y-3">
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onClick={() => navigate(`/doctors/${doctor.id}`)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                const pageNum = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3, totalPages - 7)) + i;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="icon"
                    onClick={() => setPage(pageNum)}
                    className="w-9 h-9 text-sm"
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
