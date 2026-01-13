import { Outlet } from "react-router-dom";
import { Topbar } from "@/ui/layout/Topbar";

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <Topbar />
      <main className="mx-auto w-full max-w-7xl p-4 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
