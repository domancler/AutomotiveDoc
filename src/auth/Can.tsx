import * as React from "react";
import type { Action } from "@/auth/actions";
import type { FascicoloContext } from "@/auth/can";
import { can } from "@/auth/can";

// ⚠️ importa il tuo hook auth reale
import { useAuth } from "@/auth/AuthProvider";

export function Can({
                      action,
                      fascicolo,
                      children,
                      fallback = null,
                    }: {
  action: Action;
  fascicolo?: FascicoloContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth() as any;
  if (!user) return <>{fallback}</>;
  return can(user, action, fascicolo) ? <>{children}</> : <>{fallback}</>;
}
