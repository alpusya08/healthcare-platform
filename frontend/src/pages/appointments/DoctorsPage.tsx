import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Star, Clock, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight,
  TrendingUp, DollarSign, Award,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import type { Doctor } from "@/features/appointments/types";

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

function DoctorCard({
  doctor,
  highlight,
  onClick,
}: {
  doctor: Doctor;
  highlight?: boolean;
  onClick: () => void;
}) {
  const initials = doctor.fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card
      className={`shadow-lg hover:shadow-xl transition-all rounded-2xl border-border cursor-pointer group ${
        highlight ? "lg:col-span-2 bg-gradient-to-br from-primary/5 to-accent/10 border-primary/20" : "bg-card"
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-6 pb-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            {doctor.photoUrl ? (
              <img
                src={doctor.photoUrl}
                alt={doctor.fullName}
                className="w-14 h-14 rounded-2xl object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"; }}
              />
            ) : null}
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-white font-bold items-center justify-center text-lg ${doctor.photoUrl ? "hidden" : "flex"}`}>
              {initials}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="font-bold text-foreground text-base truncate">{doctor.fullName}</p>
                <Badge variant="info" className="mt-1 text-xs">
                  {doctor.specialization}
                </Badge>
              </div>
              {doctor.consultationFee != null && (
                <div className="text-right shrink-0">
                  <p className="font-bold text-foreground">{doctor.consultationFee.toLocaleString("ru-RU")} ₸</p>
                  <p className="text-xs text-muted-foreground">за приём</p>
                </div>
              )}
            </div>

            {doctor.bio && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                {doctor.bio}
              </p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
              {doctor.averageRating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-foreground">{doctor.averageRating.toFixed(1)}</span>
                  <span>рейтинг</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-semibold text-foreground">{doctor.yearsExperience}</span> лет опыта
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                className="rounded-xl shadow-lg flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                Записаться
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                Профиль
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
  const [onlineOnly, setOnlineOnly] = useState(searchParams.get("onlineOnly") === "true");
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") ?? "");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "0"));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, minRating, maxPrice, minExperience, selectedSpec, sort, onlineOnly, selectedCity]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (selectedSpec) params.specialization = selectedSpec;
    if (minRating) params.minRating = minRating;
    if (maxPrice) params.maxPrice = maxPrice;
    if (minExperience) params.minExperience = minExperience;
    if (sort !== "rating_desc") params.sort = sort;
    if (onlineOnly) params.onlineOnly = "true";
    if (selectedCity) params.city = selectedCity;
    if (page > 0) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, selectedSpec, minRating, maxPrice, minExperience, sort, onlineOnly, selectedCity, page, setSearchParams]);

  const queryParams = {
    query: debouncedSearch || undefined,
    specialization: selectedSpec || undefined,
    minRating: minRating ? Number(minRating) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minExperience: minExperience ? Number(minExperience) : undefined,
    sort,
    page,
    size: PAGE_SIZE,
    onlineOnly: onlineOnly || undefined,
    city: selectedCity || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["doctors-search", queryParams],
    queryFn: () => appointmentsApi.searchDoctors(queryParams),
    placeholderData: (prev) => prev,
  });

  const doctors = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const hasActiveFilters = minRating !== "" || maxPrice !== "" || minExperience !== "" || selectedSpec !== "" || onlineOnly || selectedCity !== "";

  const clearFilters = () => {
    setMinRating("");
    setMaxPrice("");
    setMinExperience("");
    setSelectedSpec("");
    setOnlineOnly(false);
    setSelectedCity("");
    setSearch("");
  };

  const specFilter = searchParams.get("specialization");

  return (
    <div className="min-h-screen bg-background">

      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-foreground">Наши врачи</h1>
          <p className="mt-2 text-muted-foreground text-lg">
            Выберите специалиста и запишитесь на удобное время
          </p>
          {/* City pills */}
          <div className="flex flex-wrap gap-2 mt-5">
            {["", "Алматы", "Астана"].map((city) => (
              <button
                key={city || "all"}
                onClick={() => setSelectedCity(city)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selectedCity === city
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border text-muted-foreground bg-background/80 hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {city === "" ? "Все города" : city}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-6">

        {/* ── AI Recommendation Banner ──────────────────────────────── */}
        {specFilter && selectedSpec === specFilter && (
          <Card className="shadow-lg rounded-2xl border-primary/20 bg-gradient-to-r from-primary/5 to-accent/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    По результатам AI-анализа рекомендован:{" "}
                    <span className="text-primary capitalize">{specFilter}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Показаны врачи выбранной специализации</p>
                </div>
                <button
                  className="text-xs font-medium text-primary hover:underline shrink-0"
                  onClick={clearFilters}
                >
                  Все врачи
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Search + Sort + Filter Toggle ─────────────────────────── */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени или специальности..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-2xl border-2"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-52 rounded-2xl h-12">
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
            className="rounded-2xl h-12 px-4 gap-2 shrink-0"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Фильтры
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary-foreground/80" />
            )}
          </Button>
        </div>

        {/* ── Filter Panel ──────────────────────────────────────────── */}
        {showFilters && (
          <Card className="shadow-lg rounded-2xl border-border">
            <CardContent className="pt-5 pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Rating */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-400" />
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Минимальный рейтинг</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {RATING_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setMinRating(opt.value)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          minRating === opt.value
                            ? "bg-primary border-primary text-primary-foreground shadow-md"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Стоимость приёма</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRICE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setMaxPrice(opt.value)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          maxPrice === opt.value
                            ? "bg-primary border-primary text-primary-foreground shadow-md"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-violet-500" />
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Опыт работы</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setMinExperience(opt.value)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          minExperience === opt.value
                            ? "bg-primary border-primary text-primary-foreground shadow-md"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Online only */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Формат приёма</p>
                  <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setOnlineOnly((v) => !v)}
                  >
                    <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      onlineOnly ? "bg-primary" : "bg-muted-foreground/30"
                    }`}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        onlineOnly ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Только онлайн</span>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-4"
                    >
                      <X className="w-3.5 h-3.5" />
                      Сбросить фильтры
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Results ───────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-2xl border-border animate-pulse">
                <CardContent className="pt-6 pb-5 h-40" />
              </Card>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground">Врачи не найдены</p>
            <p className="text-muted-foreground mt-1 text-sm">Попробуйте изменить параметры поиска</p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4 rounded-xl" onClick={clearFilters}>
                Сбросить фильтры
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Найдено: <span className="font-semibold text-foreground">{totalElements}</span> врачей
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {doctors.map((doctor, index) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  highlight={index === 0}
                  onClick={() => navigate(`/doctors/${doctor.id}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl"
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
                      className="w-10 h-10 text-sm rounded-xl"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl"
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
    </div>
  );
}
