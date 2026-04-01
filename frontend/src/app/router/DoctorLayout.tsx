import { Outlet } from "react-router-dom";
import { DoctorNavbar } from "@/widgets/navbar/DoctorNavbar";

export function DoctorLayout() {
  return (
    <div className="min-h-screen bg-background">
      <DoctorNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
