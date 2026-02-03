import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/ui/layout/AppLayout";
import { DashboardPage } from "@/views/DashboardPage";
import { FascicoliInCorsoPage } from "@/views/FascicoliInCorsoPage";
import { FascicoliDisponibiliPage } from "@/views/FascicoliDisponibiliPage";
import { FascicoliTuttiPage } from "@/views/FascicoliTuttiPage";
import { NotFoundPage } from "@/views/NotFoundPage";
import { RequireAuth } from "@/auth/RequireAuth";
import { RequireTakeTabs } from "@/auth/RequireTakeTabs";
import { RequireAdmin } from "@/auth/RequireAdmin";
import LoginPage from "@/views/LoginPage";
import { FascicoloDettaglioPage } from "@/views/FascicoloDettaglioPage";
import { AdminConfigurazionePage } from "@/views/AdminConfigurazionePage";

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
      { path: "/config", element: <RequireAdmin><AdminConfigurazionePage /></RequireAdmin> },
      { path: "/fascicoli/disponibili", element: <RequireTakeTabs><FascicoliDisponibiliPage /></RequireTakeTabs> },
      { path: "/fascicoli/in-corso", element: <RequireTakeTabs><FascicoliInCorsoPage /></RequireTakeTabs> },
      { path: "/fascicoli/tutti", element: <FascicoliTuttiPage /> },
      { path: "/fascicoli/:id", element: <FascicoloDettaglioPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
