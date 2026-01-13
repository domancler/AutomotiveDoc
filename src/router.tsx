import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/ui/layout/AppLayout";
import { DashboardPage } from "@/views/DashboardPage";
import { FascicoliInCorsoPage } from "@/views/FascicoliInCorsoPage";
import { FascicoliTuttiPage } from "@/views/FascicoliTuttiPage";
import { FascicoloDettaglioPage } from "@/views/FascicoloDettaglioPage";
import { NotFoundPage } from "@/views/NotFoundPage";
import { RequireAuth } from "@/auth/RequireAuth";
import LoginPage from "@/views/LoginPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/fascicoli/in-corso", element: <FascicoliInCorsoPage /> },
      { path: "/fascicoli/tutti", element: <FascicoliTuttiPage /> },
      { path: "/fascicoli/:id", element: <FascicoloDettaglioPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
