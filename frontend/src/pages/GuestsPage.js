import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { bookingAPI, propertyAPI, guestAccountAPI, guestAPI } from "../api/endpoints";
import { useLanguage } from "../contexts/LanguageContext";
const GuestsPage = () => {
    const { t } = useLanguage();
    const [guests, setGuests] = useState([]);
    const [guestAccounts, setGuestAccounts] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showDetails, setShowDetails] = useState(null);
    const [guestBookings, setGuestBookings] = useState({});
    const [editingGuestId, setEditingGuestId] = useState(null);
    const [editGuest, setEditGuest] = useState({
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
            const bookingMap = {};
            const staysByGuest = {};
            (bookingsRes.data || []).forEach((booking) => {
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
            const mergedGuests = (guestsRes.data || []).map((guest) => ({
                ...guest,
                totalStays: staysByGuest[guest.id]?.totalStays || 0,
                lastBookingDate: staysByGuest[guest.id]?.lastBookingDate,
            }));
            setGuests(mergedGuests);
            setGuestBookings(bookingMap);
            setProperties(propertiesRes.data || []);
            setGuestAccounts(guestAccountsRes.data || []);
        }
        catch (err) {
            console.error("Failed to load data:", err);
            setError(err.response?.data?.message || "Failed to load guests");
        }
        finally {
            setLoading(false);
        }
    };
    const filteredGuests = guests.filter((guest) => {
        const searchLower = searchTerm.toLowerCase();
        return (guest.firstName?.toLowerCase().includes(searchLower) ||
            guest.lastName?.toLowerCase().includes(searchLower) ||
            guest.email?.toLowerCase().includes(searchLower));
    });
    const handleEditGuest = (guest) => {
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
    const handleUpdateGuest = async (id) => {
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
        }
        catch (err) {
            console.error("Failed to update guest", err);
            alert("Failed to update guest");
        }
    };
    const handleDeleteGuest = async (id) => {
        if (!window.confirm("Delete this guest?"))
            return;
        try {
            await guestAPI.delete(id);
            loadData();
        }
        catch (err) {
            console.error("Failed to delete guest", err);
            alert("Failed to delete guest");
        }
    };
    const handleResetGuestPasswordByEmail = async (email) => {
        const account = guestAccounts.find((a) => a.email === email);
        if (!account) {
            alert("No guest account found for this email.");
            return;
        }
        const newPassword = window.prompt("Enter new password for this guest:");
        if (!newPassword)
            return;
        try {
            await guestAccountAPI.resetPassword(account.id, newPassword);
            alert("Guest password reset successfully.");
        }
        catch (err) {
            console.error("Failed to reset guest password", err);
            alert("Failed to reset guest password");
        }
    };
    if (loading) {
        return _jsx("div", { className: "loading", children: t("guests_loading") });
    }
    return (_jsxs("div", { className: "page-container", children: [_jsxs("div", { className: "page-header", children: [_jsx("h2", { children: t("guests_title") }), _jsx("div", { className: "header-actions", children: _jsx("input", { type: "text", placeholder: t("guests_search_placeholder"), value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "search-input" }) })] }), error && _jsx("div", { className: "error-message", children: error }), filteredGuests.length === 0 ? (_jsx("div", { className: "empty-state", children: _jsx("p", { children: t("guests_no_guests") }) })) : (_jsx("div", { className: "guests-grid", children: filteredGuests.map((guest) => (_jsxs("div", { className: "guest-card", children: [_jsxs("div", { className: "guest-header", children: [_jsxs("h3", { children: [guest.firstName, " ", guest.lastName] }), _jsxs("span", { className: "stays-badge", children: [guest.totalStays || 1, " ", t("guests_stays")] })] }), _jsxs("div", { className: "guest-info", children: [editingGuestId === guest.id ? (_jsxs("div", { className: "grid grid-cols-1 gap-2", children: [_jsx("input", { className: "border p-2 rounded", value: editGuest.firstName, onChange: (e) => setEditGuest({ ...editGuest, firstName: e.target.value }), placeholder: "First name" }), _jsx("input", { className: "border p-2 rounded", value: editGuest.lastName, onChange: (e) => setEditGuest({ ...editGuest, lastName: e.target.value }), placeholder: "Last name" }), _jsx("input", { className: "border p-2 rounded", value: editGuest.email, onChange: (e) => setEditGuest({ ...editGuest, email: e.target.value }), placeholder: t("guests_email") }), _jsx("input", { className: "border p-2 rounded", value: editGuest.phone || "", onChange: (e) => setEditGuest({ ...editGuest, phone: e.target.value }), placeholder: t("guests_phone") }), _jsx("input", { className: "border p-2 rounded", value: editGuest.country || "", onChange: (e) => setEditGuest({ ...editGuest, country: e.target.value }), placeholder: t("guests_country") })] })) : (_jsxs(_Fragment, { children: [_jsxs("p", { children: [_jsxs("strong", { children: ["\uD83D\uDCE7 ", t("guests_email"), ":"] }), " ", guest.email] }), guest.phone && (_jsxs("p", { children: [_jsxs("strong", { children: ["\uD83D\uDCDE ", t("guests_phone"), ":"] }), " ", guest.phone] })), guest.country && (_jsxs("p", { children: [_jsxs("strong", { children: ["\uD83C\uDF0D ", t("guests_country"), ":"] }), " ", guest.country] }))] })), guest.lastBookingDate && (_jsxs("p", { children: [_jsxs("strong", { children: ["\uD83D\uDCC5 ", t("guests_last_stay"), ":"] }), " ", new Date(guest.lastBookingDate).toLocaleDateString()] }))] }), _jsxs("div", { className: "guest-actions", children: [editingGuestId === guest.id ? (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-sm btn-success", onClick: () => guest.id && handleUpdateGuest(guest.id), children: "Save" }), _jsx("button", { className: "btn btn-sm btn-secondary", onClick: () => setEditingGuestId(null), children: "Cancel" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-sm btn-info", onClick: () => handleEditGuest(guest), children: "Edit" }), _jsx("button", { className: "btn btn-sm btn-warning", onClick: () => handleResetGuestPasswordByEmail(guest.email), children: "Reset Password" }), _jsx("button", { className: "btn btn-sm btn-danger", onClick: () => guest.id && handleDeleteGuest(guest.id), children: "Delete" })] })), _jsxs("button", { className: "btn btn-sm btn-primary", onClick: () => setShowDetails(showDetails === guest.id ? null : guest.id), children: [showDetails === guest.id ? t("guests_hide") : t("guests_view"), " ", t("guests_history")] })] }), showDetails === guest.id && (_jsxs("div", { className: "guest-history", children: [_jsx("h4", { children: t("guests_history") }), _jsx("div", { className: "history-placeholder", children: (guestBookings[guest.id] || []).length === 0 ? (_jsx("p", { children: t("guests_history_placeholder") })) : (_jsx("ul", { className: "text-sm space-y-1", children: (guestBookings[guest.id] || []).map((booking) => (_jsxs("li", { children: ["#", booking.id, " \u2022 ", new Date(booking.checkInDate).toLocaleDateString(), " \u2192 ", new Date(booking.checkOutDate).toLocaleDateString(), " \u2022 ", booking.room?.roomNumber || booking.roomId, " \u2022 ", booking.bookingStatus] }, booking.id))) })) })] }))] }, guest.id))) })), _jsxs("div", { className: "guests-summary", children: [_jsx("h3", { children: t("guests_summary") }), _jsxs("div", { className: "summary-grid", children: [_jsxs("div", { className: "summary-card", children: [_jsx("p", { className: "summary-label", children: t("guests_total_guests") }), _jsx("p", { className: "summary-value", children: filteredGuests.length })] }), _jsxs("div", { className: "summary-card", children: [_jsx("p", { className: "summary-label", children: t("guests_total_stays") }), _jsx("p", { className: "summary-value", children: filteredGuests.reduce((sum, g) => sum + (g.totalStays || 1), 0) })] }), _jsxs("div", { className: "summary-card", children: [_jsx("p", { className: "summary-label", children: t("guests_avg_stays") }), _jsx("p", { className: "summary-value", children: (filteredGuests.length > 0 ? (filteredGuests.reduce((sum, g) => sum + (g.totalStays || 1), 0) / filteredGuests.length).toFixed(1) : 0) })] }), _jsxs("div", { className: "summary-card", children: [_jsx("p", { className: "summary-label", children: t("guests_repeat_guests") }), _jsx("p", { className: "summary-value", children: filteredGuests.filter(g => (g.totalStays || 1) > 1).length })] })] })] })] }));
};
export default GuestsPage;
