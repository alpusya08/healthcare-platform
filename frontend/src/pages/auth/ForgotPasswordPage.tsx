import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Logo } from "@/shared/ui/Logo";
import { authApi } from "@/features/auth/api/authApi";
import { routes } from "@/shared/config/routes";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email.trim()),
    onSuccess: () => setSent(true),
    onError: () => toast.error("Произошла ошибка. Попробуйте снова."),
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Logo size={40} />
        </div>

        <Card className="shadow-lg border-border/60">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Восстановление пароля</CardTitle>
            <CardDescription>
              {sent
                ? "Инструкция отправлена"
                : "Введите email, указанный при регистрации"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Если аккаунт с адресом <strong>{email}</strong> существует,
                  ссылка для сброса пароля была отправлена (или записана в логи).
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Ссылка действительна 1 час.
                </p>
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link to={routes.login}>Вернуться к входу</Link>
                </Button>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
                className="space-y-4"
              >
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending || !email.trim()}
                >
                  {mutation.isPending ? "Отправка..." : "Отправить ссылку"}
                </Button>
                <Link
                  to={routes.login}
                  className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Назад к входу
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
