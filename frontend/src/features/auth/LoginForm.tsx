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
  identifier: z
    .string()
    .min(1, "Введите email или номер телефона")
    .refine(
      (val) => {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        const isPhone = /^\+?[\d\s\-()]{7,15}$/.test(val);
        return isEmail || isPhone;
      },
      "Введите корректный email или номер телефона"
    ),
  password: z.string().min(1, "Введите пароль"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const loginMutation = useLoginMutation();

  const onSubmit = (values: LoginValues) => {
    loginMutation.mutate(values);
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

        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email или номер телефона</FormLabel>
              <FormControl>
                <Input placeholder="Введите email или номер телефона" {...field} />
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
                  <Input placeholder="Введите пароль" type={showPassword ? "text" : "password"} {...field} />
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
