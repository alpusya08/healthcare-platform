import { useAuthStore } from "@/features/auth/model/authStore";
import { authApi } from "@/features/auth/api/authApi";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useNavigate } from "react-router-dom";

export function HomePage() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate("/login");
    }
  };

  return (
    <main className="min-h-screen bg-muted/50">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">Healthcare Platform</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.fullName}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="mb-6 text-2xl font-bold">
          Добро пожаловать, {user?.fullName}!
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Анализ симптомов с ИИ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Опишите свои симптомы и получите предварительный анализ на основе
                искусственного интеллекта
              </p>
              <Button className="w-full">Начать анализ</Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Результат носит информационный характер и не заменяет
                консультацию врача
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Запись к врачу</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Запишитесь на приём онлайн или очно к специалисту
              </p>
              <Button variant="outline" className="w-full">
                Выбрать врача
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
