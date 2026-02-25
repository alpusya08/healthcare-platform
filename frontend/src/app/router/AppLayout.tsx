import { Outlet } from "react-router-dom";
import { Navbar } from "@/widgets/navbar/Navbar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
