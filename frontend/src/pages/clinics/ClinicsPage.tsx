import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Mail, Clock, Globe, Building2, ChevronDown, ChevronUp, X } from "lucide-react";
import { apiClient } from "@/shared/api/axios";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

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
}

function ClinicCard({ clinic }: { clinic: Clinic }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-border hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 shrink-0">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground text-base leading-snug">{clinic.name}</h3>
                <Badge variant="secondary" className="mt-1 text-xs">{clinic.city}</Badge>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
                <span>{clinic.address}</span>
              </div>
              {clinic.workingHours && (
                <div className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
                  <span>{clinic.workingHours}</span>
                </div>
              )}
              {clinic.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                  <a
                    href={`tel:${clinic.phone}`}
                    className="hover:text-foreground hover:underline transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {clinic.phone}
                  </a>
                </div>
              )}
              {clinic.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                  <a
                    href={`mailto:${clinic.email}`}
                    className="hover:text-foreground hover:underline transition-colors truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {clinic.email}
                  </a>
                </div>
              )}
              {clinic.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                  <a
                    href={clinic.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground hover:underline transition-colors truncate text-blue-600 dark:text-blue-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {clinic.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>

            {clinic.description && (
              <div className="mt-3">
                <p className={`text-sm text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
                  {clinic.description}
                </p>
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {expanded ? (
                    <><ChevronUp className="w-3.5 h-3.5" />Свернуть</>
                  ) : (
                    <><ChevronDown className="w-3.5 h-3.5" />Подробнее</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClinicsPage() {
  const [search, setSearch] = useState("");

  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ["clinics"],
    queryFn: () => apiClient.get<Clinic[]>("/clinics").then((r) => r.data),
  });

  const filtered = clinics.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Клиники</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Медицинские учреждения Алматы, работающие с платформой
        </p>
      </div>

      <div className="relative max-w-sm">
        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или адресу..."
          className="w-full pl-9 pr-9 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-border">
              <CardContent className="pt-5 pb-4 h-28" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "Клиники не найдены" : "Нет доступных клиник"}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {search
              ? `Найдено: ${filtered.length} из ${clinics.length}`
              : `Всего клиник: ${clinics.length}`}
          </p>
          <div className="space-y-3">
            {filtered.map((clinic) => (
              <ClinicCard key={clinic.id} clinic={clinic} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
