import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { bookingAPI, dashboardAPI } from "../api/endpoints";
import BookingsPage from "../pages/BookingsPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import GuestsPage from "../pages/GuestsPage";
import SettingsPage from "../pages/SettingsPage";
import PricingPage from "../pages/PricingPage";
import HousekeepingPage from "../pages/HousekeepingPage";
import CalendarView from "./CalendarView";
import LanguageSelector from "./LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import "./AdminDashboard.css";
const AdminDashboard = ({ onLogout }) => {
    const { t } = useLanguage();
    const [currentView, setCurrentView] = useState("dashboard");
    const [userRole, setUserRole] = useState("ADMIN");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [bookingAlerts, setBookingAlerts] = useState([]);
    const lastSeenBookingTime = useRef(0);
    const getAllowedViews = (role) => {
        switch (role) {
            case "ADMIN":
            case "MANAGER":
                return ["dashboard", "calendar", "bookings", "analytics", "guests", "settings", "pricing", "housekeeping"];
            case "RECEPTION":
                return ["calendar", "bookings", "housekeeping"];
            case "CLEANER":
                return ["housekeeping"];
            default:
                return ["dashboard"];
        }
    };
    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const u = JSON.parse(userStr);
            const role = u.role ? u.role.toUpperCase() : "ADMIN";
            setUserRole(role);
            const allowedViews = getAllowedViews(role);
            if (!allowedViews.includes(currentView)) {
                setCurrentView(allowedViews[0]);
            }
        }
    }, []);
    useEffect(() => {
        const init = async () => {
            try {
                const res = await bookingAPI.getAll();
                const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
                const data = Array.isArray(list) ? list : [];
                const maxTime = data.reduce((max, booking) => {
                    const t = new Date(booking.createdAt || booking.checkInDate || 0).getTime();
                    return t > max ? t : max;
                }, 0);
                lastSeenBookingTime.current = maxTime;
            }
            catch (error) {
                console.error("Failed to init booking alerts", error);
            }
        };
        init();
    }, []);
    useEffect(() => {
        const poll = async () => {
            try {
                const res = await bookingAPI.getAll();
                const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
                const data = Array.isArray(list) ? list : [];
                const fresh = data.filter((booking) => {
                    const t = new Date(booking.createdAt || booking.checkInDate || 0).getTime();
                    return t > lastSeenBookingTime.current;
                });
                if (fresh.length > 0) {
                    const newestTime = fresh.reduce((max, booking) => {
                        const t = new Date(booking.createdAt || booking.checkInDate || 0).getTime();
                        return t > max ? t : max;
                    }, lastSeenBookingTime.current);
                    lastSeenBookingTime.current = newestTime;
                    const newAlerts = fresh.map((booking) => ({
                        id: booking.id,
                        guestName: `${booking.guest?.firstName || ""} ${booking.guest?.lastName || ""}`.trim() || "Guest",
                        checkInDate: booking.checkInDate,
                        checkOutDate: booking.checkOutDate,
                        numberOfGuests: booking.numberOfGuests || 0,
                        totalPrice: booking.totalPrice || 0,
                        source: booking.source || "website",
                        createdAt: booking.createdAt || "",
                    }));
                    setBookingAlerts((prev) => {
                        const merged = [...newAlerts, ...prev];
                        return merged.slice(0, 5);
                    });
                    newAlerts.forEach((alert) => {
                        setTimeout(() => {
                            setBookingAlerts((prev) => prev.filter((a) => a.id !== alert.id));
                        }, 10000);
                    });
                }
            }
            catch (error) {
                console.error("Failed to poll bookings", error);
            }
        };
        const interval = setInterval(poll, 15000);
        return () => clearInterval(interval);
    }, []);
    const handleViewChange = (view) => {
        console.log("Changing view to:", view);
        setCurrentView(view);
        setIsSidebarOpen(false);
    };
    if (userRole === "PENDING") {
        return (_jsxs("div", { className: "flex h-screen items-center justify-center bg-gray-100 flex-col gap-4 text-center p-4", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-800", children: "Account Pending Approval" }), _jsx("p", { className: "max-w-md text-gray-600", children: "Your account has been registered but is awaiting administrator approval. Please contact the system admin to activate your access." }), _jsx("button", { onClick: onLogout, className: "px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition", children: "Logout" })] }));
    }
    const renderContent = () => {
        console.log("Rendering view:", currentView);
        const allowedViews = getAllowedViews(userRole);
        if (!allowedViews.includes(currentView)) {
            return _jsx("div", { className: "p-10 text-center text-red-600 font-bold", children: t("access_denied") });
        }
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
    if (userRole === "CLEANER") {
        return (_jsxs("div", { className: "main-content", style: { marginLeft: 0, padding: "16px" }, children: [_jsxs("div", { className: "header", style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }, children: [_jsx("h1", { className: "page-title", children: t("admin_housekeeping") }), _jsx("button", { className: "logout-btn", onClick: onLogout, style: { display: "inline-flex" }, children: t("admin_logout") })] }), renderContent()] }));
    }
    return (_jsxs("div", { className: "dashboard-container", children: [_jsxs("aside", { className: `sidebar ${isSidebarOpen ? "open" : ""}`, children: [_jsxs("h1", { className: "sidebar-title", children: ["\uD83C\uDFE8 PMS ", _jsx("span", { className: "text-xs opacity-50 block", children: userRole })] }), _jsx("div", { className: "sidebar-language", children: _jsx(LanguageSelector, {}) }), _jsx("nav", { className: "sidebar-menu", children: _jsxs("ul", { children: [(userRole === "ADMIN" || userRole === "MANAGER") && (_jsx("li", { children: _jsxs("button", { className: currentView === "dashboard" ? "active" : "", onClick: () => handleViewChange("dashboard"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDCCA" }), t('admin_dashboard')] }) })), (userRole === "ADMIN" || userRole === "MANAGER" || userRole === "RECEPTION") && (_jsx("li", { children: _jsxs("button", { className: currentView === "calendar" ? "active" : "", onClick: () => handleViewChange("calendar"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDCC5" }), t('admin_calendar')] }) })), (userRole === "ADMIN" || userRole === "MANAGER" || userRole === "RECEPTION") && (_jsx("li", { children: _jsxs("button", { className: currentView === "bookings" ? "active" : "", onClick: () => handleViewChange("bookings"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDCC5" }), t('admin_bookings')] }) })), (userRole === "ADMIN" || userRole === "MANAGER") && (_jsx("li", { children: _jsxs("button", { className: currentView === "pricing" ? "active" : "", onClick: () => handleViewChange("pricing"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDCB0" }), t('admin_pricing')] }) })), _jsx("li", { children: _jsxs("button", { className: currentView === "housekeeping" ? "active" : "", onClick: () => handleViewChange("housekeeping"), children: [_jsx("span", { className: "menu-icon", children: "\uD83E\uDDF9" }), t('admin_housekeeping')] }) }), (userRole === "ADMIN" || userRole === "MANAGER") && (_jsx("li", { children: _jsxs("button", { className: currentView === "guests" ? "active" : "", onClick: () => handleViewChange("guests"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDC65" }), t('admin_guests')] }) })), (userRole === "ADMIN" || userRole === "MANAGER") && (_jsx("li", { children: _jsxs("button", { className: currentView === "analytics" ? "active" : "", onClick: () => handleViewChange("analytics"), children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDCC8" }), t('admin_analytics')] }) })), (userRole === "ADMIN" || userRole === "MANAGER") && (_jsx("li", { children: _jsxs("button", { className: currentView === "settings" ? "active" : "", onClick: () => handleViewChange("settings"), children: [_jsx("span", { className: "menu-icon", children: "\u2699\uFE0F" }), t('admin_settings')] }) }))] }) }), _jsx("div", { className: "sidebar-footer", children: _jsxs("button", { className: "logout-sidebar-btn", onClick: onLogout, children: [_jsx("span", { className: "menu-icon", children: "\uD83D\uDEAA" }), t('admin_logout')] }) })] }), _jsx("div", { className: `sidebar-overlay ${isSidebarOpen ? "show" : ""}`, onClick: () => setIsSidebarOpen(false) }), _jsxs("main", { className: "main-content", children: [bookingAlerts.length > 0 && (_jsx("div", { className: "admin-toast-container", children: bookingAlerts.map((alert) => (_jsxs("div", { className: "admin-toast", children: [_jsx("button", { className: "admin-toast-close", onClick: () => setBookingAlerts((prev) => prev.filter((a) => a.id !== alert.id)), "aria-label": "Dismiss", children: "\u00D7" }), _jsx("div", { className: "admin-toast-title", children: "New Reservation" }), _jsxs("div", { className: "admin-toast-body", children: [_jsxs("div", { children: [_jsx("strong", { children: "Guest:" }), " ", alert.guestName] }), _jsxs("div", { children: [_jsx("strong", { children: "Dates:" }), " ", new Date(alert.checkInDate).toLocaleDateString(), " \u2014 ", new Date(alert.checkOutDate).toLocaleDateString()] }), _jsxs("div", { children: [_jsx("strong", { children: "Guests:" }), " ", alert.numberOfGuests] }), _jsxs("div", { children: [_jsx("strong", { children: "Total:" }), " \u20AC", alert.totalPrice.toFixed(2)] }), _jsxs("div", { children: [_jsx("strong", { children: "Source:" }), " ", alert.source] })] })] }, alert.id))) })), _jsxs("header", { className: "header", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 50 }, children: [_jsxs("div", { className: "header-left", children: [_jsx("button", { className: "hamburger-btn", onClick: () => setIsSidebarOpen(prev => !prev), "aria-label": "Toggle menu", children: "\u2630" }), _jsxs("h1", { className: "page-title", children: [currentView === "dashboard" && t('admin_dashboard'), currentView === "housekeeping" && t('admin_housekeeping'), currentView === "bookings" && t('admin_bookings'), currentView === "guests" && t('admin_guests'), currentView === "analytics" && t('admin_analytics'), currentView === "settings" && t('admin_settings'), currentView === "pricing" && t('admin_pricing'), currentView === "calendar" && t('admin_calendar')] })] }), _jsx("div", { className: "header-right", children: _jsx("button", { className: "logout-btn", onClick: onLogout, children: t('admin_logout') }) })] }), _jsx("div", { className: "content-area", children: renderContent() })] })] }));
};
const DashboardOverview = ({ onNavigate }) => {
    const { t } = useLanguage();
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
                const payload = response.data || {};
                setStats({
                    properties: Number(payload.properties ?? 0),
                    rooms: Number(payload.rooms ?? 0),
                    bookings: Number(payload.bookings ?? 0),
                    revenue: Number(payload.revenue ?? 0),
                });
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
    return (_jsxs("div", { className: "dashboard-overview", children: [_jsxs("div", { className: "welcome-section", children: [_jsx("h2", { children: t("dash_welcome_title") }), _jsx("p", { children: t("dash_welcome_subtitle") })] }), _jsxs("div", { className: "stats-grid", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon", children: "\uD83C\uDFE2" }), _jsxs("div", { className: "stat-content", children: [_jsx("h3", { children: t("dash_stats_properties") }), _jsx("p", { className: "stat-value", children: loading ? "-" : stats.properties }), _jsx("p", { className: "stat-label", children: t("dash_stats_total_properties") })] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon", children: "\uD83D\uDECF\uFE0F" }), _jsxs("div", { className: "stat-content", children: [_jsx("h3", { children: t("dash_stats_rooms") }), _jsx("p", { className: "stat-value", children: loading ? "-" : stats.rooms }), _jsx("p", { className: "stat-label", children: t("dash_stats_total_rooms") })] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon", children: "\uD83D\uDCC5" }), _jsxs("div", { className: "stat-content", children: [_jsx("h3", { children: t("dash_stats_bookings") }), _jsx("p", { className: "stat-value", children: loading ? "-" : stats.bookings }), _jsx("p", { className: "stat-label", children: t("dash_stats_active_bookings") })] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-icon", children: "\uD83D\uDCB0" }), _jsxs("div", { className: "stat-content", children: [_jsx("h3", { children: t("dash_stats_revenue") }), _jsx("p", { className: "stat-value", children: loading ? "-" : `$${stats.revenue.toLocaleString()}` }), _jsx("p", { className: "stat-label", children: t("dash_stats_total_revenue") })] })] })] }), _jsxs("div", { className: "quick-actions", children: [_jsx("h3", { children: t("dash_quick_actions") }), _jsxs("div", { className: "actions-grid", children: [_jsxs("button", { className: "action-btn", onClick: () => onNavigate("settings"), children: [_jsx("span", { className: "action-icon", children: "\uD83C\uDFE2" }), t("dash_action_properties")] }), _jsxs("button", { className: "action-btn", onClick: () => onNavigate("settings"), children: [_jsx("span", { className: "action-icon", children: "\uD83D\uDECF\uFE0F" }), t("dash_action_manage_rooms")] }), _jsxs("button", { className: "action-btn", onClick: () => onNavigate("bookings"), children: [_jsx("span", { className: "action-icon", children: "\uD83D\uDCDD" }), t("dash_action_new_booking")] }), _jsxs("button", { className: "action-btn", onClick: () => onNavigate("analytics"), children: [_jsx("span", { className: "action-icon", children: "\uD83D\uDCCA" }), t("dash_action_view_reports")] })] })] }), _jsxs("div", { className: "info-section", children: [_jsx("h3", { children: t("dash_getting_started") }), _jsxs("div", { className: "info-cards", children: [_jsxs("div", { className: "info-card", children: [_jsx("h4", { children: t("dash_step1_title") }), _jsx("p", { children: t("dash_step1_desc") })] }), _jsxs("div", { className: "info-card", children: [_jsx("h4", { children: t("dash_step2_title") }), _jsx("p", { children: t("dash_step2_desc") })] }), _jsxs("div", { className: "info-card", children: [_jsx("h4", { children: t("dash_step3_title") }), _jsx("p", { children: t("dash_step3_desc") })] })] })] })] }));
};
export default AdminDashboard;
