import { Outlet } from "react-router-dom";
import { Navbar } from "@/widgets/navbar/Navbar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Outlet />
    </div>
  );
}
