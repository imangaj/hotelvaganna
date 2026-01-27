import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import AuthPage from "./components/AuthPage";
import AdminDashboard from "./components/AdminDashboard";
import PublicSite from "./public/PublicSite";
import GuestPortal from "./public/GuestPortal";
import GuestForgotPassword from "./pages/GuestForgotPassword";
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
    const appMode = import.meta.env.VITE_APP_MODE;
    const isAdminRoute = appMode === "admin" || (!appMode && window.location.pathname.startsWith("/admin"));
    const isGuestRoute = appMode === "guest" || (!appMode && window.location.pathname.startsWith("/guest"));
    const isPublicRoute = appMode === "public" || !appMode;
    if (isLoading && isAdminRoute) {
        return _jsx("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px" }, children: "Loading..." });
    }
    return (_jsx(Router, { children: isAdminRoute ? (isAuthenticated ? (_jsx(AdminDashboard, { onLogout: handleLogout })) : (_jsx(AuthPage, { onAuthSuccess: handleAuthSuccess }))) : isGuestRoute ? (_jsxs(Routes, { children: [_jsx(Route, { path: "/guest/forgot-password", element: _jsx(GuestForgotPassword, {}) }), _jsx(Route, { path: "/guest/reset-password", element: _jsx(GuestResetPassword, {}) }), _jsx(Route, { path: "/guest/*", element: _jsx(GuestPortal, {}) })] })) : isPublicRoute ? (_jsx(PublicSite, {})) : null }));
}
export default App;
