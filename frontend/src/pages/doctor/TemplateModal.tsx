import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { apiClient } from "@/shared/api/axios";
import { toast } from "sonner";

interface TemplateEntry {
  id?: string;
  dayOfWeek: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  slotDurationMin: number;
  appointmentType: string;
}

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (weeks: number) => void;
}

const DAY_NAMES = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const DURATIONS = [15, 30, 45, 60];
const SLOT_TYPES = [
  { value: "BOTH", label: "Онлайн/Офлайн" },
  { value: "ONLINE_ONLY", label: "Только онлайн" },
  { value: "OFFLINE_ONLY", label: "Только офлайн" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function TemplateModal({ open, onClose, onGenerate }: TemplateModalProps) {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<TemplateEntry[]>([]);
  const [weeksAhead, setWeeksAhead] = useState("4");

  useQuery({
    queryKey: ["schedule-template"],
    queryFn: () => apiClient.get<TemplateEntry[]>("/doctor/schedule/template").then((r) => r.data),
    enabled: open,
    onSuccess: (data: TemplateEntry[]) => {
      if (data.length > 0) setEntries(data);
    },
  } as Parameters<typeof useQuery>[0]);

  const saveMutation = useMutation({
    mutationFn: (data: TemplateEntry[]) =>
      apiClient.post("/doctor/schedule/template", { entries: data }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-template"] });
      toast.success("Шаблон сохранён");
    },
    onError: () => toast.error("Не удалось сохранить шаблон"),
  });

  const addEntry = (day: number) => {
    setEntries((prev) => [
      ...prev,
      { dayOfWeek: day, startHour: 9, startMin: 0, endHour: 13, endMin: 0, slotDurationMin: 60, appointmentType: "BOTH" },
    ]);
  };

  const removeEntry = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateEntry = (idx: number, patch: Partial<TemplateEntry>) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const handleSaveAndGenerate = async () => {
    await saveMutation.mutateAsync(entries);
    onGenerate(Number(weeksAhead));
    onClose();
  };

  const activeDays = Array.from(new Set(entries.map((e) => e.dayOfWeek))).sort();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Шаблон рабочей недели</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Day toggle */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Рабочие дни</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const active = entries.some((e) => e.dayOfWeek === day);
                return (
                  <button
                    key={day}
                    onClick={() => (active ? setEntries((p) => p.filter((e) => e.dayOfWeek !== day)) : addEntry(day))}
                    className={`w-10 h-10 rounded-lg border text-sm font-medium transition-all ${
                      active
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "border-border text-foreground hover:border-teal-400"
                    }`}
                  >
                    {DAY_NAMES[day]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Entries */}
          {activeDays.map((day) => {
            const dayEntries = entries
              .map((e, idx) => ({ ...e, idx }))
              .filter((e) => e.dayOfWeek === day);

            return (
              <div key={day} className="border border-border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{DAY_NAMES[day]}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setEntries((prev) => [
                        ...prev,
                        {
                          dayOfWeek: day,
                          startHour: 14,
                          startMin: 0,
                          endHour: 18,
                          endMin: 0,
                          slotDurationMin: 60,
                          appointmentType: "BOTH",
                        },
                      ])
                    }
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Добавить блок
                  </Button>
                </div>
                {dayEntries.map(({ idx, ...entry }) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-center">
                    <div className="flex items-center gap-1">
                      <Select
                        value={String(entry.startHour)}
                        onValueChange={(v) => updateEntry(idx, { startHour: Number(v) })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS.map((h) => (
                            <SelectItem key={h} value={String(h)}>{pad(h)}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">—</span>
                      <Select
                        value={String(entry.endHour)}
                        onValueChange={(v) => updateEntry(idx, { endHour: Number(v) })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS.map((h) => (
                            <SelectItem key={h} value={String(h)}>{pad(h)}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Select
                      value={String(entry.slotDurationMin)}
                      onValueChange={(v) => updateEntry(idx, { slotDurationMin: Number(v) })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map((d) => (
                          <SelectItem key={d} value={String(d)}>{d} мин</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={entry.appointmentType}
                      onValueChange={(v) => updateEntry(idx, { appointmentType: v })}
                    >
                      <SelectTrigger className="h-8 text-xs min-w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SLOT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => removeEntry(idx)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}

          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Выберите рабочие дни выше
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-sm text-muted-foreground">Сгенерировать на</span>
            <Select value={weeksAhead} onValueChange={setWeeksAhead}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 4, 8, 12].map((w) => (
                  <SelectItem key={w} value={String(w)}>{w} нед.</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            onClick={handleSaveAndGenerate}
            disabled={saveMutation.isPending || entries.length === 0}
          >
            Сохранить и сгенерировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
