import React, { useState, useEffect, useRef } from "react";
import { bookingAPI, dashboardAPI } from "../api/endpoints";
import BookingsPage from "../pages/BookingsPage.tsx";
import AnalyticsPage from "../pages/AnalyticsPage.tsx";
import GuestsPage from "../pages/GuestsPage.tsx";
import SettingsPage from "../pages/SettingsPage.tsx";
import PricingPage from "../pages/PricingPage.tsx";
import HousekeepingPage from "../pages/HousekeepingPage.tsx";
import CalendarView from "./CalendarView.tsx";
import LanguageSelector from "./LanguageSelector.tsx";
import { useLanguage } from "../contexts/LanguageContext";
import "./AdminDashboard.css";

interface AdminDashboardProps {
  onLogout: () => void;
}

type ViewType = 
  | "dashboard" 
  | "bookings" 
  | "calendar"
  | "analytics" 
  | "guests" 
  | "settings"
  | "pricing"
  | "housekeeping";


const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [userRole, setUserRole] = useState<string>("ADMIN");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [bookingAlerts, setBookingAlerts] = useState<Array<{
    id: number;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfGuests: number;
    totalPrice: number;
    source: string;
    createdAt: string;
  }>>([]);
  const lastSeenBookingTime = useRef<number>(0);

  const getAllowedViews = (role: string): ViewType[] => {
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
        const data = res.data || [];
        const maxTime = data.reduce((max: number, booking: any) => {
          const t = new Date(booking.createdAt || booking.checkInDate || 0).getTime();
          return t > max ? t : max;
        }, 0);
        lastSeenBookingTime.current = maxTime;
      } catch (error) {
        console.error("Failed to init booking alerts", error);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await bookingAPI.getAll();
        const data = res.data || [];
        const fresh = data.filter((booking: any) => {
          const t = new Date(booking.createdAt || booking.checkInDate || 0).getTime();
          return t > lastSeenBookingTime.current;
        });

        if (fresh.length > 0) {
          const newestTime = fresh.reduce((max: number, booking: any) => {
            const t = new Date(booking.createdAt || booking.checkInDate || 0).getTime();
            return t > max ? t : max;
          }, lastSeenBookingTime.current);
          lastSeenBookingTime.current = newestTime;

          const newAlerts = fresh.map((booking: any) => ({
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
      } catch (error) {
        console.error("Failed to poll bookings", error);
      }
    };

    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleViewChange = (view: ViewType) => {
    console.log("Changing view to:", view);
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  if (userRole === "PENDING") {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-100 flex-col gap-4 text-center p-4">
              <h1 className="text-3xl font-bold text-gray-800">Account Pending Approval</h1>
              <p className="max-w-md text-gray-600">Your account has been registered but is awaiting administrator approval. Please contact the system admin to activate your access.</p>
              <button onClick={onLogout} className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">Logout</button>
          </div>
      );
  }

  const renderContent = () => {
    console.log("Rendering view:", currentView);
    const allowedViews = getAllowedViews(userRole);
    if (!allowedViews.includes(currentView)) {
      return <div className="p-10 text-center text-red-600 font-bold">{t("access_denied")}</div>;
    }

    switch (currentView) {
      case "calendar":
        return <CalendarView />;
      case "bookings":
        return <BookingsPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "guests":
        return <GuestsPage />;
      case "settings":
        return <SettingsPage />;
      case "pricing":
        return <PricingPage />;
      case "housekeeping":
        return <HousekeepingPage />;
      case "dashboard":
      default:
        return <DashboardOverview onNavigate={handleViewChange} />;
    }
  };

  if (userRole === "CLEANER") {
    return (
      <div className="main-content" style={{ marginLeft: 0, padding: "16px" }}>
        <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h1 className="page-title">{t("admin_housekeeping")}</h1>
          <button className="logout-btn" onClick={onLogout} style={{ display: "inline-flex" }}>
            {t("admin_logout")}
          </button>
        </div>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <h1 className="sidebar-title">🏨 PMS <span className="text-xs opacity-50 block">{userRole}</span></h1>
        <div className="sidebar-language">
          <LanguageSelector />
        </div>
        <nav className="sidebar-menu">
          <ul>
            {(userRole === "ADMIN" || userRole === "MANAGER") && (
            <li>
              <button
                className={currentView === "dashboard" ? "active" : ""}
                onClick={() => handleViewChange("dashboard")}
              >
                <span className="menu-icon">📊</span>
                {t('admin_dashboard')}
              </button>
            </li>
            )}
            
            {(userRole === "ADMIN" || userRole === "MANAGER" || userRole === "RECEPTION") && (
            <li>
              <button
                className={currentView === "calendar" ? "active" : ""}
                onClick={() => handleViewChange("calendar")}
              >
                <span className="menu-icon">📅</span>
                {t('admin_calendar')}
              </button>
            </li>
            )}

            {(userRole === "ADMIN" || userRole === "MANAGER" || userRole === "RECEPTION") && (
            <li>
              <button
                className={currentView === "bookings" ? "active" : ""}
                onClick={() => handleViewChange("bookings")}
              >
                <span className="menu-icon">📅</span>
                {t('admin_bookings')}
              </button>
            </li>
            )}
            
            {(userRole === "ADMIN" || userRole === "MANAGER") && (
            <li>
              <button
                className={currentView === "pricing" ? "active" : ""}
                onClick={() => handleViewChange("pricing")}
              >
                <span className="menu-icon">💰</span>
                {t('admin_pricing')}
              </button>
            </li>
            )}

            {/* Housekeeping is visible to everyone */}
            <li>
              <button
                className={currentView === "housekeeping" ? "active" : ""}
                onClick={() => handleViewChange("housekeeping")}
              >
                <span className="menu-icon">🧹</span>
                {t('admin_housekeeping')}
              </button>
            </li>
            
            {(userRole === "ADMIN" || userRole === "MANAGER") && (
            <li>
              <button
                className={currentView === "guests" ? "active" : ""}
                onClick={() => handleViewChange("guests")}
              >
                <span className="menu-icon">👥</span>
                {t('admin_guests')}
              </button>
            </li>
            )}

            {(userRole === "ADMIN" || userRole === "MANAGER") && (
            <li>
              <button
                className={currentView === "analytics" ? "active" : ""}
                onClick={() => handleViewChange("analytics")}
              >
                <span className="menu-icon">📈</span>
                {t('admin_analytics')}
              </button>
            </li>
            )}

            {(userRole === "ADMIN" || userRole === "MANAGER") && (
            <li>
              <button
                className={currentView === "settings" ? "active" : ""}
                onClick={() => handleViewChange("settings")}
              >
                <span className="menu-icon">⚙️</span>
                {t('admin_settings')}
              </button>
            </li>
            )}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-sidebar-btn" onClick={onLogout}>
            <span className="menu-icon">🚪</span>
            {t('admin_logout')}
          </button>
        </div>
      </aside>

      <div
        className={`sidebar-overlay ${isSidebarOpen ? "show" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <main className="main-content">
        {bookingAlerts.length > 0 && (
          <div className="admin-toast-container">
            {bookingAlerts.map((alert) => (
              <div key={alert.id} className="admin-toast">
                <button
                  className="admin-toast-close"
                  onClick={() => setBookingAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                  aria-label="Dismiss"
                >
                  ×
                </button>
                <div className="admin-toast-title">New Reservation</div>
                <div className="admin-toast-body">
                  <div><strong>Guest:</strong> {alert.guestName}</div>
                  <div><strong>Dates:</strong> {new Date(alert.checkInDate).toLocaleDateString()} — {new Date(alert.checkOutDate).toLocaleDateString()}</div>
                  <div><strong>Guests:</strong> {alert.numberOfGuests}</div>
                  <div><strong>Total:</strong> €{alert.totalPrice.toFixed(2)}</div>
                  <div><strong>Source:</strong> {alert.source}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 50 }}>
          <div className="header-left">
            <button
              className="hamburger-btn"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <h1 className="page-title">
              {currentView === "dashboard" && t('admin_dashboard')}
              {currentView === "housekeeping" && t('admin_housekeeping')}
              {currentView === "bookings" && t('admin_bookings')}
              {currentView === "guests" && t('admin_guests')}
              {currentView === "analytics" && t('admin_analytics')}
              {currentView === "settings" && t('admin_settings')}
              {currentView === "pricing" && t('admin_pricing')}
              {currentView === "calendar" && t('admin_calendar')}
            </h1>
          </div>
          <div className="header-right">
            <button className="logout-btn" onClick={onLogout}>
                {t('admin_logout')}
            </button>
          </div>
        </header>

        <div className="content-area">{renderContent()}</div>
      </main>
    </div>
  );
};

// Dashboard Overview Component
interface DashboardOverviewProps {
  onNavigate: (view: ViewType) => void;
}

interface DashboardStats {
  properties: number;
  rooms: number;
  bookings: number;
  revenue: number;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
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
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="dashboard-overview">
      <div className="welcome-section">
        <h2>{t("dash_welcome_title")}</h2>
        <p>{t("dash_welcome_subtitle")}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <h3>{t("dash_stats_properties")}</h3>
            <p className="stat-value">{loading ? "-" : stats.properties}</p>
            <p className="stat-label">{t("dash_stats_total_properties")}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🛏️</div>
          <div className="stat-content">
            <h3>{t("dash_stats_rooms")}</h3>
            <p className="stat-value">{loading ? "-" : stats.rooms}</p>
            <p className="stat-label">{t("dash_stats_total_rooms")}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>{t("dash_stats_bookings")}</h3>
            <p className="stat-value">{loading ? "-" : stats.bookings}</p>
            <p className="stat-label">{t("dash_stats_active_bookings")}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{t("dash_stats_revenue")}</h3>
            <p className="stat-value">{loading ? "-" : `$${stats.revenue.toLocaleString()}`}</p>
            <p className="stat-label">{t("dash_stats_total_revenue")}</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>{t("dash_quick_actions")}</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => onNavigate("settings")}> 
            <span className="action-icon">🏢</span>
            {t("dash_action_properties")}
          </button>
          <button className="action-btn" onClick={() => onNavigate("settings")}> 
            <span className="action-icon">🛏️</span>
            {t("dash_action_manage_rooms")}
          </button>
          <button className="action-btn" onClick={() => onNavigate("bookings")}> 
            <span className="action-icon">📝</span>
            {t("dash_action_new_booking")}
          </button>
          <button className="action-btn" onClick={() => onNavigate("analytics")}> 
            <span className="action-icon">📊</span>
            {t("dash_action_view_reports")}
          </button>
        </div>
      </div>

      <div className="info-section">
        <h3>{t("dash_getting_started")}</h3>
        <div className="info-cards">
          <div className="info-card">
            <h4>{t("dash_step1_title")}</h4>
            <p>{t("dash_step1_desc")}</p>
          </div>
          <div className="info-card">
            <h4>{t("dash_step2_title")}</h4>
            <p>{t("dash_step2_desc")}</p>
          </div>
          <div className="info-card">
            <h4>{t("dash_step3_title")}</h4>
            <p>{t("dash_step3_desc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

