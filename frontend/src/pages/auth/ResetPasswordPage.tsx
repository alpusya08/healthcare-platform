import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Logo } from "@/shared/ui/Logo";
import { authApi } from "@/features/auth/api/authApi";
import { routes } from "@/shared/config/routes";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.resetPassword(token, password),
    onSuccess: () => {
      setDone(true);
      setTimeout(() => navigate(routes.login), 3000);
    },
    onError: () => toast.error("Ссылка недействительна или устарела"),
  });

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Неверная ссылка для сброса пароля</p>
          <Button asChild variant="outline"><Link to={routes.forgotPassword}>Запросить новую</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Logo size={40} />
        </div>

        <Card className="shadow-lg border-border/60">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Новый пароль</CardTitle>
            <CardDescription>Придумайте надёжный пароль (минимум 8 символов)</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <p className="text-sm text-muted-foreground">Пароль успешно изменён. Перенаправление...</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
                className="space-y-4"
              >
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="Новый пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="Повторите пароль"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                {confirm && password !== confirm && (
                  <p className="text-xs text-destructive">Пароли не совпадают</p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending || !password || password !== confirm || password.length < 8}
                >
                  {mutation.isPending ? "Сохранение..." : "Сохранить пароль"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
