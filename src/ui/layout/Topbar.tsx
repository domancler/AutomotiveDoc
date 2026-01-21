import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ThemeMenu } from "@/ui/theme/ThemeMenu";
import { UserMenu } from "@/ui/user/UserMenu";

export function Topbar() {
  const { pathname } = useLocation();

  const isFascicoloDetail =
    pathname.startsWith("/fascicoli/") &&
    !pathname.startsWith("/fascicoli/disponibili") &&
    !pathname.startsWith("/fascicoli/in-corso") &&
    !pathname.startsWith("/fascicoli/tutti");

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img
              src="/assets/favicon-32x32.png"
              alt="AutomotiveDoc"
              className="h-6 w-6"
              loading="eager"
            />
            <span className="font-semibold">AutomotiveDoc</span>
          </Link>

          {/* separatore */}
          <span className="h-6 w-px bg-border" />

          {/* tab subito dopo logo */}
          <nav className="flex items-center gap-4 text-sm font-medium">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/fascicoli/disponibili"
              className={({ isActive }) =>
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              Disponibili
            </NavLink>
            <NavLink
              to="/fascicoli/in-corso"
              className={({ isActive }) =>
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              In corso
            </NavLink>
            <NavLink
              to="/fascicoli/tutti"
              className={({ isActive }) =>
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              Tutti
            </NavLink>
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeMenu />
          <UserMenu />
        </div>
      </div>

      {/* breadcrumb “torna ai fascicoli” */}
      {isFascicoloDetail && (
        <div className="border-t bg-muted/40">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
            <Link to="/fascicoli/in-corso" className="hover:underline">
              Fascicoli
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Dettaglio</span>
          </div>
        </div>
      )}
    </header>
  );
}
