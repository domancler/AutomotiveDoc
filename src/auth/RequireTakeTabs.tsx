import * as React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { can, roleHasTakeAction } from "@/auth/can";

/**
 * Blocca l’accesso alle pagine "Disponibili" e "In corso" per i ruoli
 * che non prevedono la presa in carico (es. Admin, Amministrativo, Supervisore).
 * Questi ruoli devono poter consultare solo "Tutti" (se autorizzati).
 */
export function RequireTakeTabs({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();

  if (!isReady) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!roleHasTakeAction(user.role)) {
    const canViewAll = can(user, "FASCICOLO.VIEW_ALL");
    return <Navigate to={canViewAll ? "/fascicoli/tutti" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}
