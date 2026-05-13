import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { adminApi, type AdminUser } from "@/features/admin/api/adminApi";

const ROLE_LABELS: Record<string, string> = {
  PATIENT: "Пациент",
  DOCTOR: "Врач",
  ADMIN: "Администратор",
};

const ROLE_COLORS: Record<string, string> = {
  PATIENT: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  DOCTOR: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  ADMIN: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function UserRow({ user, onToggleStatus }: { user: AdminUser; onToggleStatus: (u: AdminUser) => void }) {
  const isActive = user.status === "ACTIVE";
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center font-bold text-muted-foreground shrink-0 text-sm">
        {user.fullName.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{user.fullName}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role] ?? ""}`}>
        {ROLE_LABELS[user.role] ?? user.role}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
        {isActive ? "Активен" : "Заблокирован"}
      </span>
      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{formatDate(user.lastLoginAt)}</span>
      {user.role !== "ADMIN" && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => onToggleStatus(user)}
        >
          {isActive
            ? <><UserX className="w-3.5 h-3.5 mr-1 text-destructive" />Заблокировать</>
            : <><UserCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />Активировать</>
          }
        </Button>
      )}
    </div>
  );
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

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

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Пользователи</h1>
        <p className="mt-1 text-sm text-muted-foreground">Управление аккаунтами пользователей</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border-border">
        <CardContent className="pt-4 pb-2">
          <div className="flex items-center gap-4 py-2 border-b border-border mb-1 text-xs text-muted-foreground font-medium uppercase">
            <span className="w-9 shrink-0" />
            <span className="flex-1">Пользователь</span>
            <span className="w-24 text-center">Роль</span>
            <span className="w-24 text-center">Статус</span>
            <span className="w-28 text-center hidden sm:block">Последний вход</span>
            <span className="w-32" />
          </div>
          {isLoading ? (
            <p className="text-center py-10 text-muted-foreground">Загрузка...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">Пользователи не найдены</p>
          ) : (
            filtered.map((u) => (
              <UserRow key={u.id} user={u} onToggleStatus={(user) => toggleMutation.mutate(user)} />
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Всего: {filtered.length} из {users.length}</p>
    </div>
  );
}
