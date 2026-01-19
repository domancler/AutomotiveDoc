import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { DEMO_USERS } from "@/auth/auth";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from ?? "/dashboard";

  const [username, setUsername] = React.useState("");
  const [usePassword, setUsePassword] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password); // ✅ fondamentale
      navigate(from, { replace: true }); // ✅ fondamentale
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
            src="/assets/favicon-32x32.png"
            alt="AutomotiveDoc"
            className="h-8 w-8"
            loading="eager"
          />
          <div>
            <div className="text-xl font-semibold">Login</div>
            <div className="text-sm text-muted-foreground">
              Seleziona un utente demo (uno per ruolo) oppure inserisci username libero.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Utenti demo</div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map((u) => (
              <Button
                key={u.id}
                type="button"
                variant={username.toLowerCase() === u.username.toLowerCase() ? "default" : "outline"}
                onClick={() => setUsername(u.username)}
                className="justify-start"
              >
                {u.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm">Username</label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>

        <div className="rounded-lg border bg-background p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={usePassword}
              onChange={(e) => setUsePassword(e.target.checked)}
            />
            Usa password (opzionale, fittizia)
          </label>

          {usePassword && (
            <div className="mt-2 space-y-2">
              <label className="text-sm">Password</label>
              <Input
                type="password"
                value={password}
                placeholder="Qualsiasi valore (non validato)"
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">Non viene verificata: serve solo a scopo demo.</div>
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
