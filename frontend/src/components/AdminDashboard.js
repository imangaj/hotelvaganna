import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { dashboardAPI } from "../api/endpoints";
import BookingsPage from "../pages/BookingsPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import GuestsPage from "../pages/GuestsPage";
import SettingsPage from "../pages/SettingsPage";
import PricingPage from "../pages/PricingPage";
import HousekeepingPage from "../pages/HousekeepingPage";
import CalendarView from "./CalendarView";
import LanguageSelector from "./LanguageSelector";
import "./AdminDashboard.css";
const AdminDashboard = ({ onLogout }) => {
    const [currentView, setCurrentView] = useState("dashboard");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const handleViewChange = (view) => {
        console.log("Changing view to:", view);
        setCurrentView(view);
        setIsSidebarOpen(false);
    };
    const renderContent = () => {
        console.log("Rendering view:", currentView);
        switch (currentView) {
            case "calendar":
                return _jsx(CalendarView, {});
            case "bookings":
                return _jsx(BookingsPage, {});
            case "analytics":
                return _jsx(AnalyticsPage, {});
            case "guests":
                return _jsx(GuestsPage, {});
            case "settings":
                return _jsx(SettingsPage, {});
            case "pricing":
                return _jsx(PricingPage, {});
            case "housekeeping":
                return _jsx(HousekeepingPage, {});
            case "dashboard":
            default:
                return _jsx(DashboardOverview, { onNavigate: handleViewChange });
        }
    };
    return (_jsxs("div", { className: "dashboard-container", children: [_jsxs("aside", { className: `sidebar ${isSidebarOpen ? "open" : ""}`, children: [_jsx("h1", { className: "sidebar-title", children: "\uD83C\uDFE8 PMS" }), _jsx("div", { className: "sidebar-language", children: _jsx(LanguageSelector, {}) }), _jsx("nav", { className: "sidebar-menu", children: _jsxs("ul", { children: [_jsx("li", { children: _jsxs("button", { className: currentView === "dashboard" ? "active" : "", onClick: () => handleViewChange("dashboard"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDCCA" }), "Dashboard"] }) }), _jsx("li", { children: _jsxs("button", { className: currentView === "calendar" ? "active" : "", onClick: () => handleViewChange("calendar"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDCC5" }), "Calendar / Daily"] }) }), _jsx("li", { children: _jsxs("button", { className: currentView === "bookings" ? "active" : "", onClick: () => handleViewChange("bookings"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDCC5" }), "Bookings"] }) }), _jsx("li", { children: _jsxs("button", { className: currentView === "pricing" ? "active" : "", onClick: () => handleViewChange("pricing"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDCB0" }), "Pricing"] }) }), _jsx("li", { children: _jsxs("button", { className: currentView === "housekeeping" ? "active" : "", onClick: () => handleViewChange("housekeeping"), children: [_jsx("span", { className: "menu-icon", children: "\uD83E\uDDF9" }), "Housekeeping"] }) }), _jsx("li", { children: _jsxs("button", { className: currentView === "guests" ? "active" : "", onClick: () => handleViewChange("guests"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDC65" }), "Guests"] }) }), _jsx("li", { children: _jsxs("button", { className: currentView === "analytics" ? "active" : "", onClick: () => handleViewChange("analytics"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDCC8" }), "Analytics"] }) }), _jsx("li", { children: _jsxs("button", { className: currentView === "settings" ? "active" : "", onClick: () => handleViewChange("settings"), children: [_jsx("span", { className: "menu-icon", children: "\u2699\uFE0F" }), "Settings"] }) })] }) }), _jsx("div", { className: "sidebar-footer", children: _jsxs("button", { className: "logout-sidebar-btn", onClick: onLogout, children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDEAA" }), "Logout"] }) })] }), _jsx("div", { className: `sidebar-overlay ${isSidebarOpen ? "show" : ""}`, onClick: () => setIsSidebarOpen(false) }), _jsxs("main", { className: "main-content", children: [_jsxs("header", { className: "header", children: [_jsxs("div", { className: "header-left", children: [_jsx("button", { className: "hamburger-btn", onClick: () => setIsSidebarOpen(prev => !prev), "aria-label": "Toggle menu", children: "\u2630" }), _jsxs("h1", { className: "page-title", children: [currentView === "dashboard" && "Dashboard Overview", currentView === "housekeeping" && "Housekeeping Tasks", currentView === "bookings" && "Bookings", currentView === "guests" && "Guest Management", currentView === "analytics" && "Analytics & Reports", currentView === "settings" && "Settings & Configuration", currentView === "pricing" && "Pricing Management", currentView === "calendar" && "Calendar"] })] }), _jsx("button", { className: "logout-btn", onClick: onLogout, children: "Logout" })] }), _jsx("div", { className: "content-area", children: renderContent() })] })] }));
};
const DashboardOverview = ({ onNavigate }) => {
    const [stats, setStats] = useState({
        properties: 0,
        rooms: 0,
        bookings: 0,
        revenue: 0,
    });
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await dashboardAPI.getStats();
                setStats(response.data);
            }
            catch (error) {
                console.error("Error fetching stats:", error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);
    return (_jsxs("div", { className: "dashboard-overview", children: [_jsxs("div", { className: "welcome-section", children: [_jsx("h2", { children: "Welcome to Property Management System" }), _jsx("p", { children: "Manage your properties, rooms, and bookings all in one place." })] }), _jsxs("div", { className: "stats-grid", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon", children: "\uD83C\uDFE2" }), _jsxs("div", { className: "stat-content", children: [_jsx("h3", { children: "Properties" }), _jsx("p", { className: "stat-value", children: loading ? "-" : stats.properties }), _jsx("p", { className: "stat-label", children: "Total Properties" })] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon", children: "\uD83D\uDECF\uFE0F" }), _jsxs("div", { className: "stat-content", children: [_jsx("h3", { children: "Rooms" }), _jsx("p", { className: "stat-value", children: loading ? "-" : stats.rooms }), _jsx("p", { className: "stat-label", children: "Total Rooms" })] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon", children: "\uD83D\uDCC5" }), _jsxs("div", { className: "stat-content", children: [_jsx("h3", { children: "Bookings" }), _jsx("p", { className: "stat-value", children: loading ? "-" : stats.bookings }), _jsx("p", { className: "stat-label", children: "Active Bookings" })] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon", children: "\uD83D\uDCB0" }), _jsxs("div", { className: "stat-content", children: [_jsx("h3", { children: "Revenue" }), _jsx("p", { className: "stat-value", children: loading ? "-" : `$${stats.revenue.toLocaleString()}` }), _jsx("p", { className: "stat-label", children: "Total Revenue" })] })] })] }), _jsxs("div", { className: "quick-actions", children: [_jsx("h3", { children: "Quick Actions" }), _jsxs("div", { className: "actions-grid", children: [_jsxs("button", { className: "action-btn", onClick: () => onNavigate("settings"), children: [_jsx("span", { className: "action-icon", children: "\uD83C\uDFE2" }), "Properties"] }), _jsxs("button", { className: "action-btn", onClick: () => onNavigate("settings"), children: [_jsx("span", { className: "action-icon", children: "\uD83D\uDECF\uFE0F" }), "Manage Rooms"] }), _jsxs("button", { className: "action-btn", onClick: () => onNavigate("bookings"), children: [_jsx("span", { className: "action-icon", children: "\uD83D\uDCDD" }), "New Booking"] }), _jsxs("button", { className: "action-btn", onClick: () => onNavigate("analytics"), children: [_jsx("span", { className: "action-icon", children: "\uD83D\uDCCA" }), "View Reports"] })] })] }), _jsxs("div", { className: "info-section", children: [_jsx("h3", { children: "Getting Started" }), _jsxs("div", { className: "info-cards", children: [_jsxs("div", { className: "info-card", children: [_jsx("h4", { children: "1. Add Your Properties" }), _jsx("p", { children: "Start by adding your hotel or rental properties to the system." })] }), _jsxs("div", { className: "info-card", children: [_jsx("h4", { children: "2. Configure Rooms" }), _jsx("p", { children: "Add rooms to your properties with pricing and availability." })] }), _jsxs("div", { className: "info-card", children: [_jsx("h4", { children: "3. Manage Bookings" }), _jsx("p", { children: "Track reservations and manage guest bookings efficiently." })] })] })] })] }));
};
export default AdminDashboard;
