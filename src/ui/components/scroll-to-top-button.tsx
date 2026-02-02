import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  const isXL = typeof window !== "undefined" && window.innerWidth >= 1280;

  const anchoredStyle = isXL
    ? { left: "50%", transform: "translateX(calc(625px + 0px))" } // più vicino (8px)
    : undefined;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed z-50",
        "bottom-4 lg:bottom-8", // <-- stessa linea del container (p-4 / lg:p-8)
        "h-11 w-11 rounded-full",
        "flex items-center justify-center",
        "bg-muted text-muted-foreground",
        "border shadow-md",
        "hover:bg-accent hover:text-accent-foreground",
        "transition-colors",
        // fallback mobile: in basso a destra
        !anchoredStyle && "right-4 lg:right-8"
      )}
      style={anchoredStyle}
      aria-label="Torna in alto"
      title="Torna in alto"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
