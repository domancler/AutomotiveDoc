import * as React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  // evita flicker/redirect mentre legge localStorage
  if (!isReady) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // ✅ Se viene usato come wrapper (<RequireAuth><AppLayout/></RequireAuth>)
  if (children) return <>{children}</>;

  // ✅ Se viene usato come route element (<Route element={<RequireAuth/>} />)
  return <Outlet />;
}
