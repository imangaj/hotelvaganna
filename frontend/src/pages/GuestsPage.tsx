import React, { useState, useEffect } from "react";
import { bookingAPI, propertyAPI, guestAccountAPI } from "../api/endpoints";
import { useLanguage } from "../contexts/LanguageContext";

interface Guest {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
}

interface GuestAccount {
  id: number;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

const GuestsPage: React.FC = () => {
  const { t } = useLanguage();
  const [guests, setGuests] = useState<any[]>([]);
  const [guestAccounts, setGuestAccounts] = useState<GuestAccount[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetails, setShowDetails] = useState<number | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [editAccountEmail, setEditAccountEmail] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [bookingsRes, propertiesRes, guestAccountsRes] = await Promise.all([
        bookingAPI.getAll(),
        propertyAPI.getAll(),
        guestAccountAPI.getAll(),
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
      setGuestAccounts(guestAccountsRes.data || []);
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

  const filteredGuestAccounts = guestAccounts.filter((account) =>
    account.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditAccount = (account: GuestAccount) => {
    setEditingAccountId(account.id);
    setEditAccountEmail(account.email);
  };

  const handleUpdateAccount = async (id: number) => {
    try {
      await guestAccountAPI.update(id, { email: editAccountEmail });
      setEditingAccountId(null);
      loadData();
    } catch (err) {
      console.error("Failed to update guest account", err);
      alert("Failed to update guest account");
    }
  };

  const handleResetGuestPassword = async (id: number) => {
    const newPassword = window.prompt("Enter new password for this guest:");
    if (!newPassword) return;
    try {
      await guestAccountAPI.resetPassword(id, newPassword);
      alert("Guest password reset successfully.");
    } catch (err) {
      console.error("Failed to reset guest password", err);
      alert("Failed to reset guest password");
    }
  };

  const handleDeleteGuestAccount = async (id: number) => {
    if (!window.confirm("Delete this guest account?")) return;
    try {
      await guestAccountAPI.delete(id);
      loadData();
    } catch (err) {
      console.error("Failed to delete guest account", err);
      alert("Failed to delete guest account");
    }
  };

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

      <div className="section">
        <h3 className="text-lg font-bold mb-4">Guest Accounts</h3>
        {filteredGuestAccounts.length === 0 ? (
          <div className="empty-state">
            <p>No guest accounts found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuestAccounts.map((account) => (
                  <tr key={account.id}>
                    <td>#{account.id}</td>
                    <td>
                      {editingAccountId === account.id ? (
                        <input
                          className="border p-1 rounded text-sm"
                          value={editAccountEmail}
                          onChange={(e) => setEditAccountEmail(e.target.value)}
                        />
                      ) : (
                        account.email
                      )}
                    </td>
                    <td>{account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "-"}</td>
                    <td>
                      {editingAccountId === account.id ? (
                        <>
                          <button className="btn btn-sm btn-success" onClick={() => handleUpdateAccount(account.id)}>Save</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setEditingAccountId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-sm btn-info" onClick={() => handleEditAccount(account)}>Edit</button>
                          <button className="btn btn-sm btn-warning" onClick={() => handleResetGuestPassword(account.id)}>Reset Password</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteGuestAccount(account.id)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
