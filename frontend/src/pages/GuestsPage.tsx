import React, { useState, useEffect } from "react";
import { bookingAPI, propertyAPI } from "../api/endpoints";
import { useLanguage } from "../contexts/LanguageContext";

interface Guest {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
}

const GuestsPage: React.FC = () => {
  const { t } = useLanguage();
  const [guests, setGuests] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetails, setShowDetails] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [bookingsRes, propertiesRes] = await Promise.all([
        bookingAPI.getAll(),
        propertyAPI.getAll(),
      ]);
      
      // Extract unique guests from bookings
      const uniqueGuests: { [key: string]: any } = {};
      (bookingsRes.data || []).forEach((booking: any) => {
        if (booking.guest) {
          uniqueGuests[booking.guest.id] = {
            ...booking.guest,
            lastBookingDate: booking.checkInDate,
            totalStays: (uniqueGuests[booking.guest.id]?.totalStays || 0) + 1,
          };
        }
      });

      setGuests(Object.values(uniqueGuests));
      setProperties(propertiesRes.data || []);
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.response?.data?.message || "Failed to load guests");
    } finally {
      setLoading(false);
    }
  };

  const filteredGuests = guests.filter((guest) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      guest.firstName?.toLowerCase().includes(searchLower) ||
      guest.lastName?.toLowerCase().includes(searchLower) ||
      guest.email?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <div className="loading">{t("guests_loading")}</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t("guests_title")}</h2>
        <div className="header-actions">
          <input
            type="text"
            placeholder={t("guests_search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {filteredGuests.length === 0 ? (
        <div className="empty-state">
          <p>{t("guests_no_guests")}</p>
        </div>
      ) : (
        <div className="guests-grid">
          {filteredGuests.map((guest) => (
            <div key={guest.id} className="guest-card">
              <div className="guest-header">
                <h3>{guest.firstName} {guest.lastName}</h3>
                <span className="stays-badge">{guest.totalStays || 1} {t("guests_stays")}</span>
              </div>
              
              <div className="guest-info">
                <p>
                  <strong>📧 {t("guests_email")}:</strong> {guest.email}
                </p>
                {guest.phone && (
                  <p>
                    <strong>📞 {t("guests_phone")}:</strong> {guest.phone}
                  </p>
                )}
                {guest.country && (
                  <p>
                    <strong>🌍 {t("guests_country")}:</strong> {guest.country}
                  </p>
                )}
                {guest.lastBookingDate && (
                  <p>
                    <strong>📅 {t("guests_last_stay")}:</strong> {new Date(guest.lastBookingDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="guest-actions">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowDetails(showDetails === guest.id ? null : guest.id)}
                >
                  {showDetails === guest.id ? t("guests_hide") : t("guests_view")} {t("guests_history")}
                </button>
              </div>

              {showDetails === guest.id && (
                <div className="guest-history">
                  <h4>{t("guests_history")}</h4>
                  <div className="history-placeholder">
                    <p>{t("guests_history_placeholder")}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="guests-summary">
        <h3>{t("guests_summary")}</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <p className="summary-label">{t("guests_total_guests")}</p>
            <p className="summary-value">{filteredGuests.length}</p>
          </div>
          <div className="summary-card">
            <p className="summary-label">{t("guests_total_stays")}</p>
            <p className="summary-value">{filteredGuests.reduce((sum, g) => sum + (g.totalStays || 1), 0)}</p>
          </div>
          <div className="summary-card">
            <p className="summary-label">{t("guests_avg_stays")}</p>
            <p className="summary-value">{(filteredGuests.length > 0 ? (filteredGuests.reduce((sum, g) => sum + (g.totalStays || 1), 0) / filteredGuests.length).toFixed(1) : 0)}</p>
          </div>
          <div className="summary-card">
            <p className="summary-label">{t("guests_repeat_guests")}</p>
            <p className="summary-value">{filteredGuests.filter(g => (g.totalStays || 1) > 1).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestsPage;
