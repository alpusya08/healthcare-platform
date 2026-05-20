import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useLoginMutation } from "./api/useLoginMutation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { AxiosError } from "axios";
import type { ErrorResponse } from "@/shared/types/api";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: "Пациент", email: "demo@patient.com", password: "Demo1234!", color: "text-teal-600" },
  { label: "Врач", email: "demo@doctor.com", password: "Demo1234!", color: "text-violet-600" },
  { label: "Админ", email: "admin@medai.kz", password: "Admin1234!", color: "text-amber-600" },
];

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useLoginMutation();

  const onSubmit = (values: LoginValues) => {
    loginMutation.mutate(values);
  };

  const fillDemo = (email: string, password: string) => {
    form.setValue("email", email, { shouldValidate: true });
    form.setValue("password", password, { shouldValidate: true });
  };

  const serverError = loginMutation.error as AxiosError<ErrorResponse> | null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {serverError?.response?.data?.message && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {serverError.response.data.message}
          </div>
        )}

        {/* Demo accounts */}
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2 text-center">
            Демо-аккаунты
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {DEMO_ACCOUNTS.map(({ label, email, password, color }) => (
              <button
                key={label}
                type="button"
                onClick={() => fillDemo(email, password)}
                className="flex flex-col items-center gap-1 p-2 rounded-md border border-border bg-background hover:bg-accent transition-colors text-center"
              >
                <span className={`text-[11px] font-semibold ${color}`}>{label}</span>
                <span className="text-[9px] text-muted-foreground leading-tight break-all">{email}</span>
              </button>
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input placeholder="" type={showPassword ? "text" : "password"} {...field} />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Вход..." : "Войти"}
        </Button>
      </form>
    </Form>
  );
}
