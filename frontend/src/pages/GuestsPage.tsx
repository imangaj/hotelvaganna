import React, { useState, useEffect } from "react";
import { bookingAPI, propertyAPI, guestAccountAPI, guestAPI } from "../api/endpoints";
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
  const [guestBookings, setGuestBookings] = useState<Record<number, any[]>>({});
  const [editingGuestId, setEditingGuestId] = useState<number | null>(null);
  const [editGuest, setEditGuest] = useState<Guest>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [bookingsRes, propertiesRes, guestAccountsRes, guestsRes] = await Promise.all([
        bookingAPI.getAll(),
        propertyAPI.getAll(),
        guestAccountAPI.getAll(),
        guestAPI.getAll(),
      ]);

      const bookingMap: Record<number, any[]> = {};
      const staysByGuest: Record<number, { totalStays: number; lastBookingDate?: string }> = {};

      (bookingsRes.data || []).forEach((booking: any) => {
        if (booking.guest?.id) {
          if (!bookingMap[booking.guest.id]) {
            bookingMap[booking.guest.id] = [];
          }
          bookingMap[booking.guest.id].push(booking);

          const existing = staysByGuest[booking.guest.id] || { totalStays: 0 };
          staysByGuest[booking.guest.id] = {
            totalStays: existing.totalStays + 1,
            lastBookingDate: booking.checkInDate,
          };
        }
      });

      const mergedGuests = (guestsRes.data || []).map((guest: any) => ({
        ...guest,
        totalStays: staysByGuest[guest.id]?.totalStays || 0,
        lastBookingDate: staysByGuest[guest.id]?.lastBookingDate,
      }));

      setGuests(mergedGuests);
      setGuestBookings(bookingMap);
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

  const handleEditGuest = (guest: Guest) => {
    setEditingGuestId(guest.id || null);
    setEditGuest({
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone || "",
      country: guest.country || "",
    });
  };

  const handleUpdateGuest = async (id: number) => {
    try {
      await guestAPI.update(id, {
        firstName: editGuest.firstName,
        lastName: editGuest.lastName,
        email: editGuest.email,
        phone: editGuest.phone,
        country: editGuest.country,
      });
      setEditingGuestId(null);
      loadData();
    } catch (err) {
      console.error("Failed to update guest", err);
      alert("Failed to update guest");
    }
  };

  const handleDeleteGuest = async (id: number) => {
    if (!window.confirm("Delete this guest?")) return;
    try {
      await guestAPI.delete(id);
      loadData();
    } catch (err) {
      console.error("Failed to delete guest", err);
      alert("Failed to delete guest");
    }
  };

  const handleResetGuestPassword = async (guest: Guest) => {
    const email = guest.email;
    const account = guestAccounts.find((a) => a.email === email);
    const newPassword = window.prompt("Enter new password for this guest:");
    if (!newPassword) return;
    try {
      let accountId = account?.id;
      if (!accountId) {
        const ensureRes = await guestAccountAPI.ensure({
          email,
          firstName: guest.firstName,
          lastName: guest.lastName,
          phone: guest.phone,
        });
        accountId = ensureRes.data?.id;
        if (typeof accountId === "number") {
          const ensuredEmail = (ensureRes.data?.email as string) || email;
          setGuestAccounts((prev) => [
            ...prev.filter((a) => a.email !== ensuredEmail),
            { id: accountId, email: ensuredEmail },
          ]);
        }
      }

      if (!accountId) {
        alert("Failed to create guest account for this email.");
        return;
      }

      await guestAccountAPI.resetPassword(accountId, newPassword);
      alert("Guest password reset successfully.");
    } catch (err) {
      console.error("Failed to reset guest password", err);
      alert("Failed to reset guest password");
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
                {editingGuestId === guest.id ? (
                  <div className="grid grid-cols-1 gap-2">
                    <input className="border p-2 rounded" value={editGuest.firstName} onChange={(e) => setEditGuest({ ...editGuest, firstName: e.target.value })} placeholder="First name" />
                    <input className="border p-2 rounded" value={editGuest.lastName} onChange={(e) => setEditGuest({ ...editGuest, lastName: e.target.value })} placeholder="Last name" />
                    <input className="border p-2 rounded" value={editGuest.email} onChange={(e) => setEditGuest({ ...editGuest, email: e.target.value })} placeholder={t("guests_email")} />
                    <input className="border p-2 rounded" value={editGuest.phone || ""} onChange={(e) => setEditGuest({ ...editGuest, phone: e.target.value })} placeholder={t("guests_phone")} />
                    <input className="border p-2 rounded" value={editGuest.country || ""} onChange={(e) => setEditGuest({ ...editGuest, country: e.target.value })} placeholder={t("guests_country")} />
                  </div>
                ) : (
                  <>
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
                  </>
                )}
                {guest.lastBookingDate && (
                  <p>
                    <strong>📅 {t("guests_last_stay")}:</strong> {new Date(guest.lastBookingDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="guest-actions">
                {editingGuestId === guest.id ? (
                  <>
                    <button className="btn btn-sm btn-success" onClick={() => guest.id && handleUpdateGuest(guest.id)}>Save</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditingGuestId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-sm btn-info" onClick={() => handleEditGuest(guest)}>Edit</button>
                    <button className="btn btn-sm btn-warning" onClick={() => handleResetGuestPassword(guest)}>Reset Password</button>
                    <button className="btn btn-sm btn-danger" onClick={() => guest.id && handleDeleteGuest(guest.id)}>Delete</button>
                  </>
                )}
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
                    {(guestBookings[guest.id] || []).length === 0 ? (
                      <p>{t("guests_history_placeholder")}</p>
                    ) : (
                      <ul className="text-sm space-y-1">
                        {(guestBookings[guest.id] || []).map((booking) => (
                          <li key={booking.id}>
                            #{booking.id} • {new Date(booking.checkInDate).toLocaleDateString()} → {new Date(booking.checkOutDate).toLocaleDateString()} • {booking.room?.roomNumber || booking.roomId} • {booking.bookingStatus}
                          </li>
                        ))}
                      </ul>
                    )}
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
