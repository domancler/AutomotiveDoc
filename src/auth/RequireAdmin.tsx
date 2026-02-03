import * as React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

/**
 * Permette l'accesso solo al ruolo ADMIN.
 * Se un utente non-admin prova ad entrare, viene reindirizzato.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();

  if (!isReady) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
