import { NavLink } from "react-router-dom";
import { Car, FileText, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const linkBase =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-accent hover:text-accent-foreground";

export function Sidebar() {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
          <Car className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold">AutomotiveDoc</div>
          <div className="text-xs text-muted-foreground">Gestione fascicoli & documenti</div>
        </div>
      </div>

      <div className="mt-6 space-y-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => cn(linkBase, isActive && "bg-accent text-accent-foreground")}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>

        <div className="px-2 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Fascicoli
        </div>

        <NavLink
          to="/fascicoli/in-corso"
          className={({ isActive }) => cn(linkBase, isActive && "bg-accent text-accent-foreground")}
        >
          <FileText className="h-4 w-4" />
          In corso
        </NavLink>

        <NavLink
          to="/fascicoli/tutti"
          className={({ isActive }) => cn(linkBase, isActive && "bg-accent text-accent-foreground")}
        >
          <FileText className="h-4 w-4" />
          Tutti
        </NavLink>
      </div>

      <div className="mt-auto p-2 text-xs text-muted-foreground">
        v0.1 · demo tesi
      </div>
    </div>
  );
}
