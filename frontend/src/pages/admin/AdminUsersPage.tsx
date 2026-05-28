import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserX, UserCheck, ChevronLeft, ChevronRight, Users, UserCircle, Stethoscope, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { adminApi, type AdminUser } from "@/features/admin/api/adminApi";

const ROLE_LABELS: Record<string, string> = {
  PATIENT: "Пациент",
  DOCTOR: "Врач",
  ADMIN: "Администратор",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function getRoleBadgeVariant(role: string): "destructive" | "info" | "secondary" | "outline" {
  if (role === "ADMIN") return "destructive";
  if (role === "DOCTOR") return "info";
  return "secondary";
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function UserRow({ user, onToggleStatus }: { user: AdminUser; onToggleStatus: (u: AdminUser) => void }) {
  const isActive = user.status === "ACTIVE";
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Avatar + name */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-bold text-white shrink-0 text-sm">
            {getInitials(user.fullName)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{user.fullName}</p>
          </div>
        </div>
      </td>
      {/* Email */}
      <td className="py-3.5 px-4">
        <p className="text-sm text-muted-foreground truncate max-w-[200px]">{user.email}</p>
      </td>
      {/* Role */}
      <td className="py-3.5 px-4">
        <Badge variant={getRoleBadgeVariant(user.role)}>
          {ROLE_LABELS[user.role] ?? user.role}
        </Badge>
      </td>
      {/* Status */}
      <td className="py-3.5 px-4">
        <Badge variant={isActive ? "success" : "destructive"}>
          {isActive ? "Активен" : "Заблокирован"}
        </Badge>
      </td>
      {/* Last login */}
      <td className="py-3.5 px-4 hidden sm:table-cell">
        <span className="text-xs text-muted-foreground">{formatDate(user.lastLoginAt)}</span>
      </td>
      {/* Actions */}
      <td className="py-3.5 px-4">
        {user.role !== "ADMIN" && (
          <Button
            variant={isActive ? "outline" : "outline"}
            size="sm"
            className={`shrink-0 text-xs ${isActive ? "hover:border-destructive/50 hover:text-destructive" : "hover:border-success/50 hover:text-success"}`}
            onClick={() => onToggleStatus(user)}
          >
            {isActive ? (
              <>
                <UserX className="w-3.5 h-3.5 mr-1.5 text-destructive" />
                Заблокировать
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Активировать
              </>
            )}
          </Button>
        )}
      </td>
    </tr>
  );
}

const PAGE_SIZE = 10;

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminApi.listUsers,
  });

  const toggleMutation = useMutation({
    mutationFn: (user: AdminUser) =>
      adminApi.setUserStatus(user.id, user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Статус пользователя изменён");
    },
    onError: () => toast.error("Не удалось изменить статус"),
  });

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalCount = users.length;
  const patientCount = users.filter((u) => u.role === "PATIENT").length;
  const doctorCount = users.filter((u) => u.role === "DOCTOR").length;
  const blockedCount = users.filter((u) => u.status !== "ACTIVE").length;

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/10 border-b border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Управление пользователями</h1>
              <p className="mt-1.5 text-muted-foreground">Аккаунты, роли и статусы доступа</p>
            </div>
            {/* Search in header */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-10 rounded-2xl border-border bg-background/80 backdrop-blur"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">

        {/* Stats mini row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Всего", value: totalCount, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
            { icon: UserCircle, label: "Пациентов", value: patientCount, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/40" },
            { icon: Stethoscope, label: "Врачей", value: doctorCount, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40" },
            { icon: ShieldOff, label: "Заблокированных", value: blockedCount, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <Card key={label} className="shadow-md rounded-2xl border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${bg} shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users table */}
        <Card className="shadow-xl rounded-2xl border-border overflow-hidden">
          <CardHeader className="pb-0 pt-5 px-4 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2 pb-4">
              <Users className="w-4 h-4 text-primary" />
              Список пользователей
              {filtered.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs font-normal">
                  {filtered.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-center py-14 text-muted-foreground">Загрузка...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-14 text-muted-foreground">Пользователи не найдены</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4">Пользователь</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4">Email</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4">Роль</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4">Статус</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 px-4 hidden sm:table-cell">Последний вход</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((u) => (
                      <UserRow key={u.id} user={u} onToggleStatus={(user) => toggleMutation.mutate(user)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Показано{" "}
              <span className="font-medium text-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)}
              </span>{" "}
              из{" "}
              <span className="font-medium text-foreground">{filtered.length}</span>
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-xl"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button
                    key={i}
                    variant={page === i ? "default" : "outline"}
                    size="icon"
                    className="w-8 h-8 text-xs rounded-xl"
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-xl"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
