import React, { useState, useEffect } from "react";
import AuthPage from "./components/AuthPage.tsx";
import AdminDashboard from "./components/AdminDashboard.tsx";
import PublicSite from "./public/PublicSite.tsx";
import GuestPortal from "./public/GuestPortal.tsx";
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

  const appMode = import.meta.env.VITE_APP_MODE as "public" | "admin" | undefined;
  const isAdminRoute = appMode === "admin" || (!appMode && window.location.pathname.startsWith("/admin"));
  const isGuestRoute = appMode === "guest" || (!appMode && window.location.pathname.startsWith("/guest"));
  const isPublicRoute = appMode === "public" || !appMode;

  if (isLoading && isAdminRoute) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px" }}>Loading...</div>;
  }

  return (
    <>
      {isAdminRoute ? (
        isAuthenticated ? (
          <AdminDashboard onLogout={handleLogout} />
        ) : (
          <AuthPage onAuthSuccess={handleAuthSuccess} />
        )
      ) : isGuestRoute ? (
        <GuestPortal />
      ) : isPublicRoute ? (
        <PublicSite />
      ) : null}
    </>
  );
}

export default App;
