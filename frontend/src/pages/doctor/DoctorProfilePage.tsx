import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Mail, Phone, Shield, Star, Stethoscope,
  Pencil, Check, X, BadgeCheck, Banknote, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { doctorApi } from "@/features/doctor/api/doctorApi";
import { apiClient } from "@/shared/api/axios";

function StatCard({ icon: Icon, value, label, color }: { icon: typeof User; value: string | number; label: string; color: string }) {
  return (
    <Card className="border-border text-center">
      <CardContent className="pt-4 pb-3">
        <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

export function DoctorProfilePage() {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: doctorApi.getProfile,
  });

  const [editBio, setEditBio] = useState("");
  const [editFee, setEditFee] = useState("");

  const startEdit = () => {
    setEditBio(profile?.bio ?? "");
    setEditFee(profile?.consultationFee?.toString() ?? "");
    setEditMode(true);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.patch("/doctor/profile", {
        bio: editBio.trim() || undefined,
        consultationFee: editFee ? parseFloat(editFee) : undefined,
      }).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-profile"] });
      toast.success("Профиль обновлён");
      setEditMode(false);
    },
    onError: () => toast.error("Не удалось сохранить изменения"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-48 text-muted-foreground">
        Загрузка...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16 text-muted-foreground">Не удалось загрузить профиль</div>
    );
  }

  const initials = profile.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Мой профиль</h1>
        <p className="mt-1 text-sm text-muted-foreground">Профессиональные данные и настройки</p>
      </div>

      {/* Profile header */}
      <Card className="border-border">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-3xl font-bold text-white shadow-md shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{profile.fullName}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="secondary">{profile.specialization}</Badge>
                    {profile.verified && (
                      <span className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Верифицирован
                      </span>
                    )}
                  </div>
                </div>
                {!editMode && (
                  <Button variant="outline" size="sm" onClick={startEdit}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Редактировать
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 shrink-0" />
                  {profile.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 shrink-0" />
                  {profile.yearsExperience} лет опыта
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 shrink-0" />
                  №{profile.licenseNumber}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Star} value={profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "—"} label="Рейтинг" color="text-amber-400" />
        <StatCard icon={Clock} value={profile.yearsExperience} label="Лет опыта" color="text-teal-600" />
        <StatCard icon={Banknote} value={profile.consultationFee ? `${profile.consultationFee.toLocaleString("ru-RU")} ₸` : "—"} label="Стоимость" color="text-emerald-600" />
      </div>

      {/* Editable info */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Профессиональная информация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editMode ? (
            <>
              <div className="space-y-1.5">
                <Label>О себе</Label>
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Опишите свой опыт, специализацию, методы работы..."
                  rows={4}
                  className="resize-none"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">{editBio.length}/1000</p>
              </div>
              <div className="space-y-1.5">
                <Label>Стоимость приёма (₸)</Label>
                <Input
                  type="number"
                  value={editFee}
                  onChange={(e) => setEditFee(e.target.value)}
                  placeholder="Например: 8000"
                  min={0}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  <Check className="w-3.5 h-3.5 mr-2" />
                  Сохранить
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditMode(false)}
                >
                  <X className="w-3.5 h-3.5 mr-2" />
                  Отмена
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">О себе</p>
                <p className="text-sm text-foreground leading-relaxed">
                  {profile.bio ?? <span className="text-muted-foreground italic">Не указано</span>}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Специализация</p>
                  <p className="text-sm text-foreground">{profile.specialization}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Стоимость приёма</p>
                  <p className="text-sm text-foreground">
                    {profile.consultationFee
                      ? `${profile.consultationFee.toLocaleString("ru-RU")} ₸`
                      : <span className="text-muted-foreground italic">Не указана</span>
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Номер лицензии</p>
                  <p className="text-sm text-foreground">{profile.licenseNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Рейтинг</p>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400" />
                    <p className="text-sm text-foreground">
                      {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "Нет оценок"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contact info */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Контактная информация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">{profile.email}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Для изменения контактных данных обратитесь к администратору системы
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
