import { Outlet } from "react-router-dom";
import { Topbar } from "@/ui/layout/Topbar";
import { ScrollToTopButton } from "@/ui/components/scroll-to-top-button";

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <Topbar />
      <main className="mx-auto w-full max-w-7xl p-4 lg:p-8">
        <Outlet />
      </main>

      <ScrollToTopButton />
    </div>

  );
}
