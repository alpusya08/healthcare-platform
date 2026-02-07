import { Link } from "react-router-dom";
import { RegisterForm } from "@/features/auth/RegisterForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { routes } from "@/shared/config/routes";

export function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Регистрация пациента</CardTitle>
          <CardDescription>
            Создайте аккаунт для доступа к AI-анализу
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link
              to={routes.login}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Войти
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
