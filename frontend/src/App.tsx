import React, { useState, useEffect } from "react";
import apiClient from "./api/apiClient";
import AuthPage from "./components/AuthPage";
import AdminDashboard from "./components/AdminDashboard";
import PublicSite from "./public/PublicSite";
import GuestPortal from "./public/GuestPortal";
import GuestForgotPassword from "./pages/GuestForgotPassword";
import GuestResetPassword from "./pages/GuestResetPassword";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import "./styles/global.css";

function AppContent() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [sessionError, setSessionError] = useState(false);

  const validateSession = async () => {
    setIsLoading(true);
    setSessionError(false);
    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }
    try {
      const response = await apiClient.get("/auth/me");
      if (localStorage.getItem("token") === token) {
        localStorage.setItem("user", JSON.stringify(response.data));
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      setIsAuthenticated(false);
      setSessionError(error.response?.status !== 401);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (import.meta.env.VITE_APP_MODE === "admin" || location.pathname.startsWith("/admin")) validateSession();
    else setIsLoading(false);
    const expired = () => setIsAuthenticated(false);
    const storageChanged = (event: StorageEvent) => {
      if (event.key === "token") validateSession();
    };
    window.addEventListener("staff-session-expired", expired);
    window.addEventListener("storage", storageChanged);
    return () => {
      window.removeEventListener("staff-session-expired", expired);
      window.removeEventListener("storage", storageChanged);
    };
  }, [location.pathname]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
  };

  const appMode = import.meta.env.VITE_APP_MODE as "public" | "admin" | "guest" | undefined;
  const isAdminRoute = appMode === "admin" || (!appMode && location.pathname.startsWith("/admin"));
  const isGuestRoute = appMode === "guest" || location.pathname.startsWith("/guest");
  const isPublicRoute = appMode === "public" || !appMode;

  if (isLoading && isAdminRoute) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px" }}>Loading...</div>;
  }

  return (
    <>
      {isAdminRoute ? (
        sessionError ? (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4"><p>Unable to connect. Your session has been kept.</p><button onClick={validateSession}>Try again</button></div>
        ) : isAuthenticated ? (
          <AdminDashboard onLogout={handleLogout} />
        ) : (
          <AuthPage onAuthSuccess={handleAuthSuccess} />
        )
      ) : isGuestRoute ? (
        <Routes>
          <Route path="/guest/forgot-password" element={<GuestForgotPassword />} />
          <Route path="/guest/reset-password" element={<GuestResetPassword />} />
          <Route path="/guest/*" element={<GuestPortal />} />
          <Route path="/forgot-password" element={<GuestForgotPassword />} />
          <Route path="/reset-password" element={<GuestResetPassword />} />
          <Route path="*" element={<GuestPortal />} />
        </Routes>
      ) : isPublicRoute ? (
        <PublicSite />
      ) : null}
    </>
  );
}

function App() { return <Router><AppContent /></Router>; }
export default App;
