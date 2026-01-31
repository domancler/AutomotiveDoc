import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { DEMO_USERS } from "@/auth/auth";
import { Button } from "@/ui/components/button";
import fav from "../../public/favicon-32x32.png";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from ?? "/dashboard";

  const [selected, setSelected] = React.useState<(typeof DEMO_USERS)[number] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected) {
      setError("Seleziona un utente demo");
      return;
    }

    setLoading(true);
    try {
      await login(selected.username, ""); // password fittizia
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Errore login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={onSubmit} className="w-full space-y-4 rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3">
          <img
            src={fav}
            alt="AutomotiveDoc"
            className="h-8 w-8"
            loading="eager"
          />
          <div>
            <div className="text-xl font-semibold">Login</div>
            <div className="text-sm text-muted-foreground">
              Seleziona un profilo demo (solo ruoli effettivamente utilizzabili nel flusso).
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Utenti demo</div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map((u) => {
              const isActive = selected?.id === u.id;
              return (
                <Button
                  key={u.id}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => setSelected(u)}
                  className="justify-start"
                >
                  {u.name ?? u.username}
                </Button>
              );
            })}
          </div>

          {selected && (
            <div className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
              Selezionato: <span className="font-medium text-foreground">{selected.name ?? selected.username}</span>
              <span className="mx-1">·</span>
              username: <span className="font-mono">{selected.username}</span>
            </div>
          )}
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Accesso..." : "Accedi"}
        </Button>
      </form>
    </div>
  );
}
