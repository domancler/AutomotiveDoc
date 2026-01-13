import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from ?? "/dashboard";

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("password");
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
        <div>
          <div className="text-xl font-semibold">Login</div>
          <div className="text-sm text-muted-foreground">Password di test: <b>password</b></div>
        </div>

        <div className="space-y-2">
          <label className="text-sm">Username</label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm">Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Accesso..." : "Accedi"}
        </Button>
      </form>
    </div>
  );
}
