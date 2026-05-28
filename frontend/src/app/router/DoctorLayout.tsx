import { Outlet } from "react-router-dom";
import { DoctorNavbar } from "@/widgets/navbar/DoctorNavbar";

export function DoctorLayout() {
  return (
    <div className="min-h-screen bg-background">
      <DoctorNavbar />
      <Outlet />
    </div>
  );
}
