import * as React from "react";

import { Button } from "@/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "destructive";
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

/**
 * Piccolo confirm dialog “carino” (senza dipendenze Radix).
 * Usa overlay + Card e supporta ESC / click fuori per chiudere.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Conferma",
  cancelText = "Annulla",
  tone = "default",
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        // click fuori
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {cancelText}
            </Button>
            <Button
              variant={tone === "destructive" ? "destructive" : "default"}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
