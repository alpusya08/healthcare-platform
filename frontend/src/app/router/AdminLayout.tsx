import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, LogOut, Brain, Heart, Moon, Sun } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useAuthStore } from "@/features/auth/model/authStore";
import { authApi } from "@/features/auth/api/authApi";
import { routes } from "@/shared/config/routes";
import { useTheme } from "@/app/providers/ThemeProvider";
import { cn } from "@/shared/lib/utils";

const NAV = [
  { to: routes.admin.dashboard, icon: LayoutDashboard, label: "Панель" },
  { to: routes.admin.users, icon: Users, label: "Пользователи" },
  { to: routes.admin.mlMonitoring, icon: Brain, label: "ML" },
];

export function AdminLayout() {
  const { clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    clearAuth();
    navigate(routes.login);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to={routes.admin.dashboard} className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
              <Heart className="w-5 h-5" fill="currentColor" />
            </div>
            <span className="text-xl font-semibold text-foreground">MedAI</span>
            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Администратор</span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map(({ to, icon: Icon, label }) => {
              const active = location.pathname === to || location.pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Выйти</span>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
