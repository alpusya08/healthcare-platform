import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">Страница не найдена</p>
      <Button asChild>
        <Link to="/">На главную</Link>
      </Button>
    </main>
  );
}
