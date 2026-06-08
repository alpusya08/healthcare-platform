import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Moon, Sun, LogOut, User, ChevronDown,
  Activity, Calendar, Home, Building2, Stethoscope, Heart, Phone, Menu, X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useAuthStore } from "@/features/auth/model/authStore";
import { authApi } from "@/features/auth/api/authApi";
import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";
import { NotificationBell } from "@/widgets/notification-bell/NotificationBell";

const NAV_LINKS = [
  { to: routes.patient.home, label: "Главная", icon: Home },
  { to: routes.patient.aiAnalysis, label: "AI-Анализ", icon: Activity },
  { to: routes.patient.doctors, label: "Врачи", icon: Stethoscope },
  { to: routes.patient.clinics, label: "Клиники", icon: Building2 },
  { to: routes.patient.appointments, label: "Записи", icon: Calendar },
];

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate(routes.login);
    }
  };

  const initials = user
    ? user.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "U"
    : "U";
  const displayName = user?.fullName.split(" ")[0] ?? "Профиль";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to={routes.patient.home} className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
              <Heart className="w-5 h-5" fill="currentColor" />
            </div>
            <span className="text-xl font-semibold text-foreground">MedAI</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to || (to !== routes.patient.home && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Emergency 103 */}
            <button
              onClick={() => setEmergencyOpen(true)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emergency hover:bg-emergency/90 text-emergency-foreground text-xs font-bold transition-colors"
              aria-label="Экстренный вызов 103"
            >
              <Phone className="w-3 h-3" />
              103
            </button>

            {/* Notifications */}
            <NotificationBell />

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Переключить тему"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                  <Link to={routes.patient.cabinet}>
                    <User className="w-4 h-4" />
                    Мой кабинет
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to || (to !== routes.patient.home && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    active ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
            <button
              onClick={() => { setMobileOpen(false); setEmergencyOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-emergency w-full"
            >
              <Phone className="w-4 h-4" />
              Экстренная помощь 103
            </button>
          </div>
        )}
      </header>

      <Dialog open={emergencyOpen} onOpenChange={setEmergencyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emergency">
              <Phone className="w-5 h-5" />
              Вызов скорой помощи
            </DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите позвонить в скорую помощь?
              <span className="block mt-2 font-semibold text-foreground">
                103 — служба экстренной медицинской помощи
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEmergencyOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emergency hover:bg-emergency/90 text-emergency-foreground"
              asChild
              onClick={() => setEmergencyOpen(false)}
            >
              <a href="tel:103">
                <Phone className="w-4 h-4 mr-2" />
                Позвонить 103
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
