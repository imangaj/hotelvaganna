import React, { useState, useEffect } from "react";
import AuthPage from "./components/AuthPage";
import AdminDashboard from "./components/AdminDashboard";
import PublicSite from "./public/PublicSite";
import GuestPortal from "./public/GuestPortal";
cimport GuestForgotPassword from "./pages/GuestForgotPassword";
import GuestResetPassword from "./pages/GuestResetPassword";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles/global.css";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
  };

  const appMode = import.meta.env.VITE_APP_MODE as "public" | "admin" | "guest" | undefined;
  const isAdminRoute = appMode === "admin" || (!appMode && window.location.pathname.startsWith("/admin"));
  const isGuestRoute = appMode === "guest" || (!appMode && window.location.pathname.startsWith("/guest"));
  const isPublicRoute = appMode === "public" || !appMode;

  if (isLoading && isAdminRoute) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px" }}>Loading...</div>;
  }

  return (
    <Router>
      {isAdminRoute ? (
        isAuthenticated ? (
          <AdminDashboard onLogout={handleLogout} />
        ) : (
          <AuthPage onAuthSuccess={handleAuthSuccess} />
        )
      ) : isGuestRoute ? (
        <Routes>
          <Route path="/guest/forgot-password" element={<GuestForgotPassword />} />
          <Route path="/guest/reset-password" element={<GuestResetPassword />} />
          <Route path="/guest/*" element={<GuestPortal />} />
        </Routes>
      ) : isPublicRoute ? (
        <PublicSite />
      ) : null}
    </Router>
  );
}

export default App;
