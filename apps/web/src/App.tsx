import * as React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Assistant from "@/pages/Assistant";
import Documents from "@/pages/Documents";
import Imports from "@/pages/Imports";
import Reports from "@/pages/Reports";
import Approvals from "@/pages/Approvals";
import Settings from "@/pages/Settings";
import Documentation from "@/pages/Documentation";
import Admin from "@/pages/Admin";
import Landing from "@/pages/Landing";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

function AppRouter() {
  const location = useLocation();

  // Landing page acts directly as the Login and Register page
  if (
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/register"
  ) {
    return <Landing />;
  }

  return (
    <AppShell currentPath={location.pathname}>
      <Routes location={location}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute>
              <Assistant />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/imports"
          element={
            <ProtectedRoute>
              <Imports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <Approvals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docs"
          element={
            <ProtectedRoute>
              <Documentation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}
