import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Mail, Clock, Globe, Building2, ChevronDown, ChevronUp, X, Search, Navigation } from "lucide-react";
import { apiClient } from "@/shared/api/axios";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  workingHours: string | null;
  website: string | null;
  photoUrl: string | null;
  gisUrl: string | null;
  lat: number | null;
  lng: number | null;
}

function ClinicCard({ clinic }: { clinic: Clinic }) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <Card className="shadow-lg hover:shadow-xl rounded-2xl border-border transition-all duration-200 overflow-hidden flex flex-col">
      {/* Photo */}
      {clinic.photoUrl && !imgError ? (
        <div className="h-44 w-full overflow-hidden shrink-0">
          <img
            src={clinic.photoUrl}
            alt={clinic.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="h-28 w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
          <Building2 className="w-10 h-10 text-primary/30" />
        </div>
      )}

      <CardContent className="pt-5 pb-5 flex-1 flex flex-col">
        {/* Name + city badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-foreground text-base leading-snug">{clinic.name}</h3>
            <Badge variant="secondary" className="mt-1.5 rounded-xl text-xs gap-1">
              <MapPin className="w-3 h-3" />
              {clinic.city}
            </Badge>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm text-muted-foreground flex-1">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/70" />
            <span>{clinic.address}</span>
          </div>
          {clinic.workingHours && (
            <div className="flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/70" />
              <span>{clinic.workingHours}</span>
            </div>
          )}
          {clinic.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 shrink-0 text-primary/70" />
              <a
                href={`tel:${clinic.phone}`}
                className="hover:text-foreground hover:underline transition-colors"
              >
                {clinic.phone}
              </a>
            </div>
          )}
          {clinic.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 shrink-0 text-primary/70" />
              <a
                href={`mailto:${clinic.email}`}
                className="hover:text-foreground hover:underline transition-colors truncate text-xs"
              >
                {clinic.email}
              </a>
            </div>
          )}
          {clinic.website && (
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 shrink-0 text-primary/70" />
              <a
                href={clinic.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground hover:underline transition-colors truncate text-primary text-xs"
              >
                {clinic.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
        </div>

        {/* Expandable description */}
        {clinic.description && (
          <div className="mt-3">
            <p className={`text-sm text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
              {clinic.description}
            </p>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              {expanded ? (
                <><ChevronUp className="w-3.5 h-3.5" />Свернуть</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" />Подробнее</>
              )}
            </button>
          </div>
        )}

        {/* 2GIS link */}
        {clinic.gisUrl && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl gap-2 text-xs"
              onClick={() => window.open(clinic.gisUrl!, "_blank", "noopener,noreferrer")}
            >
              <Navigation className="w-3.5 h-3.5 text-primary" />
              Открыть на 2ГИС
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ClinicsPage() {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ["clinics"],
    queryFn: () => apiClient.get<Clinic[]>("/clinics").then((r) => r.data),
  });

  const cities = useMemo(() => {
    const set = new Set(clinics.map((c) => c.city));
    return Array.from(set).sort();
  }, [clinics]);

  const filtered = clinics.filter((c) => {
    const matchCity = selectedCity === "all" || c.city === selectedCity;
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q);
    return matchCity && matchSearch;
  });

  return (
    <div>
      {/* Gradient header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-foreground">Клиники</h1>
          <p className="mt-2 text-muted-foreground">
            Медицинские учреждения Алматы, работающие с платформой
          </p>

          <div className="relative mt-6 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или адресу..."
              className="w-full pl-11 pr-11 py-3 text-sm border border-input rounded-2xl bg-background/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* City filter */}
          {cities.length > 1 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setSelectedCity("all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selectedCity === "all"
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                Все города
              </button>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    selectedCity === city
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse rounded-2xl border-border">
                <div className="h-44 bg-muted rounded-t-2xl" />
                <CardContent className="pt-5 pb-5 h-40" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {search ? "Клиники не найдены" : "Нет доступных клиник"}
            </h2>
            {search && <p className="text-muted-foreground">Попробуйте изменить запрос</p>}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {search
                ? `Найдено: ${filtered.length} из ${clinics.length}`
                : `Всего клиник: ${clinics.length}`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((clinic) => (
                <ClinicCard key={clinic.id} clinic={clinic} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
