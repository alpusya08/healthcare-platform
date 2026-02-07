import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegisterMutation } from "./api/useRegisterMutation";
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

const registerSchema = z
  .object({
    email: z.string().email("Введите корректный email"),
    password: z
      .string()
      .min(8, "Минимум 8 символов")
      .regex(/[A-Z]/, "Нужна хотя бы одна заглавная буква")
      .regex(/\d/, "Нужна хотя бы одна цифра")
      .regex(/[@#$%^&+=!]/, "Нужен хотя бы один спецсимвол"),
    confirmPassword: z.string(),
    fullName: z.string().min(2, "Введите ФИО"),
    birthDate: z.string().min(1, "Укажите дату рождения"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"], {
      required_error: "Выберите пол",
    }),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      birthDate: "",
      gender: undefined,
      phone: "",
    },
  });

  const registerMutation = useRegisterMutation();

  const onSubmit = (values: RegisterValues) => {
    registerMutation.mutate({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      birthDate: values.birthDate,
      gender: values.gender,
      phone: values.phone || undefined,
    });
  };

  const serverError = registerMutation.error as AxiosError<ErrorResponse> | null;

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
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ФИО</FormLabel>
              <FormControl>
                <Input placeholder="Иванов Иван Иванович" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Дата рождения</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Пол</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...field}
                    value={field.value ?? ""}
                  >
                    <option value="" disabled>
                      Выберите
                    </option>
                    <option value="MALE">Мужской</option>
                    <option value="FEMALE">Женский</option>
                    <option value="OTHER">Другой</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Телефон (необязательно)</FormLabel>
              <FormControl>
                <Input placeholder="+77001234567" {...field} />
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
                <Input placeholder="••••••••" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Подтвердите пароль</FormLabel>
              <FormControl>
                <Input placeholder="••••••••" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? "Регистрация..." : "Зарегистрироваться"}
        </Button>
      </form>
    </Form>
  );
}
