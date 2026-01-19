import * as React from "react";
import { LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "@/ui/components/button";
import { cn } from "@/lib/utils";
import { useOnClickOutside } from "@/lib/useOnClickOutside";

// <-- se il tuo auth hook ha un path/nome diverso, cambia QUI
import { useAuth } from "@/auth/AuthProvider";

function roleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "AMMINISTRATIVO":
      return "Amministrativo";
    case "RESPONSABILE":
      return "Supervisore";
    case "COMMERCIALE":
      return "Venditore";
    case "BO":
      return "BackOffice Anagrafico";
    case "BOF":
      return "BackOffice Finanziario";
    case "BOU":
      return "BackOffice Permuta";
    case "CONSEGNATORE":
      return "Operatore consegna";
    case "VRC":
      return "Controllo consegna";
    default:
      return role;
  }
}

function initials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

export function UserMenu() {
  const { user, logout } = useAuth() as any; // "as any" per non rompere se il tipo non è definito

  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  useOnClickOutside(wrapRef, () => setOpen(false), open);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const displayName =
    user?.name || user?.username || user?.email || user?.id || "Utente";
  const rawRole = user?.role || user?.ruolo || "utente";
  const role = roleLabel(String(rawRole));

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-background px-2 py-1.5 text-sm",
          "hover:bg-accent hover:text-accent-foreground transition",
          open && "bg-accent text-accent-foreground",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          {initials(displayName)}
        </span>
        <span className="hidden sm:block leading-tight text-left">
          <span className="block font-medium">{displayName}</span>
          <span className="block text-xs text-muted-foreground">{role}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-soft">
          <div className="p-3 border-b">
            <div className="text-sm font-medium">{displayName}</div>
            <div className="text-xs text-muted-foreground">{role}</div>
          </div>

          <div className="p-1">
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" /> Profilo (mock)
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 rounded-lg"
              onClick={() => {
                setOpen(false);
                logout?.();
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
