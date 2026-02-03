import * as React from "react";
import { cn } from "@/lib/utils";

export function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-6 w-11 items-center rounded-full border transition-colors",
        checked ? "bg-foreground" : "bg-muted",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "ml-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
