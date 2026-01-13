import { Link } from "react-router-dom";
import { Button } from "@/ui/components/button";

export function NotFoundPage() {
  return (
    <div className="grid place-items-center py-20">
      <div className="space-y-4 text-center">
        <div className="text-5xl font-bold">404</div>
        <div className="text-muted-foreground">Pagina non trovata.</div>
        <Link to="/dashboard">
          <Button>Vai alla dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
