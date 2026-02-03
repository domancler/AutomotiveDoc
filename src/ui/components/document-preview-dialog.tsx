import { X } from "lucide-react";
import { Button } from "@/ui/components/button";

function isPdf(url: string) {
  return url.toLowerCase().includes(".pdf");
}

function isImage(url: string) {
  const u = url.toLowerCase();
  return u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp");
}

export function DocumentPreviewDialog(props: {
  open: boolean;
  title?: string;
  fileUrl: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { open, title, fileUrl, onOpenChange } = props;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-label="Chiudi preview"
      />

      {/* panel */}
      <div className="absolute left-1/2 top-1/2 w-[min(1000px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{title ?? "Anteprima documento"}</div>
            <div className="truncate text-xs text-muted-foreground">{fileUrl}</div>
          </div>
          <div className="flex items-center gap-2">
            <a
              className="text-xs text-muted-foreground underline underline-offset-4"
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
            >
              Apri in nuova scheda
            </a>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Chiudi">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="h-[min(78vh,720px)] bg-muted/20">
          {isPdf(fileUrl) ? (
            <iframe title={title ?? "Documento"} src={fileUrl} className="h-full w-full" />
          ) : isImage(fileUrl) ? (
            <div className="flex h-full w-full items-center justify-center p-4">
              <img src={fileUrl} alt={title ?? "Documento"} className="max-h-full max-w-full rounded-lg border" />
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
              <div className="text-sm font-medium">Formato non supportato per preview</div>
              <div className="text-sm text-muted-foreground">Apri il file in una nuova scheda.</div>
              <a
                className="text-sm underline underline-offset-4"
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
              >
                Apri file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
