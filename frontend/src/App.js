import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import AuthPage from "./components/AuthPage";
import AdminDashboard from "./components/AdminDashboard";
import PublicSite from "./public/PublicSite.tsx";
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
    const isPublicRoute = appMode === "public" || !appMode;
    if (isLoading && isAdminRoute) {
        return _jsx("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px" }, children: "Loading..." });
    }
    return (_jsx(_Fragment, { children: isAdminRoute ? (isAuthenticated ? (_jsx(AdminDashboard, { onLogout: handleLogout })) : (_jsx(AuthPage, { onAuthSuccess: handleAuthSuccess }))) : isPublicRoute ? (_jsx(PublicSite, {})) : null }));
}
export default App;
