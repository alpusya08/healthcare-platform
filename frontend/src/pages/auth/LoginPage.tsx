import { Link } from "react-router-dom";
import { LoginForm } from "@/features/auth/LoginForm";
import { Logo } from "@/shared/ui/Logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { routes } from "@/shared/config/routes";

export function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Logo size={40} />
          <p className="text-sm text-muted-foreground">AI-Powered Healthcare Platform</p>
        </div>

        <Card className="shadow-lg border-border/60">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Вход в систему</CardTitle>
            <CardDescription>Введите email и пароль для входа</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Нет аккаунта?{" "}
              <Link
                to={routes.register}
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline underline-offset-4"
              >
                Зарегистрироваться
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/60">
          ⚕️ Результаты AI-анализа не являются медицинским диагнозом
        </p>
      </div>
    </main>
  );
}
