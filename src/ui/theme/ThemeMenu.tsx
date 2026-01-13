import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, ChevronDown } from "lucide-react";
import { Button } from "@/ui/components/button";
import { cn } from "@/lib/utils";
import { useOnClickOutside } from "@/lib/useOnClickOutside";

type ThemeKey = "light" | "dark" | "system";

const THEMES: Array<{
  key: ThemeKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "light", label: "Light", Icon: Sun },
  { key: "dark", label: "Dark", Icon: Moon },
  { key: "system", label: "System", Icon: Monitor },
];

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
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

  const active = (theme ?? "system") as ThemeKey;
  const activeItem = THEMES.find((t) => t.key === active) ?? THEMES[2];

  return (
    <div ref={wrapRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <activeItem.Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{activeItem.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </Button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-44 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-soft">
          <div className="p-1">
            {THEMES.map(({ key, label, Icon }) => {
              const isActive = active === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTheme(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground",
                  )}
                  role="menuitem"
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
