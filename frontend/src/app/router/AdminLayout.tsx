import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, LogOut, Shield, Brain } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useAuthStore } from "@/features/auth/model/authStore";
import { authApi } from "@/features/auth/api/authApi";
import { routes } from "@/shared/config/routes";

const NAV = [
  { to: routes.admin.dashboard, icon: LayoutDashboard, label: "Панель" },
  { to: routes.admin.users, icon: Users, label: "Пользователи" },
  { to: routes.admin.mlMonitoring, icon: Brain, label: "ML-мониторинг" },
];

export function AdminLayout() {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    clearAuth();
    navigate(routes.login);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
          <Shield className="w-5 h-5 text-teal-600" />
          <span className="font-bold text-foreground">Админ-панель</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
