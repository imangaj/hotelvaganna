import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { bookingAPI, propertyAPI } from "../api/endpoints";
const GuestsPage = () => {
    const [guests, setGuests] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showDetails, setShowDetails] = useState(null);
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
            const uniqueGuests = {};
            (bookingsRes.data || []).forEach((booking) => {
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
    if (loading) {
        return _jsx("div", { className: "loading", children: "Loading guests..." });
    }
    return (_jsxs("div", { className: "page-container", children: [_jsxs("div", { className: "page-header", children: [_jsx("h2", { children: "Guest Management" }), _jsx("div", { className: "header-actions", children: _jsx("input", { type: "text", placeholder: "Search by name or email...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "search-input" }) })] }), error && _jsx("div", { className: "error-message", children: error }), filteredGuests.length === 0 ? (_jsx("div", { className: "empty-state", children: _jsx("p", { children: "No guests found. Bookings will create guest records." }) })) : (_jsx("div", { className: "guests-grid", children: filteredGuests.map((guest) => (_jsxs("div", { className: "guest-card", children: [_jsxs("div", { className: "guest-header", children: [_jsxs("h3", { children: [guest.firstName, " ", guest.lastName] }), _jsxs("span", { className: "stays-badge", children: [guest.totalStays || 1, " stays"] })] }), _jsxs("div", { className: "guest-info", children: [_jsxs("p", { children: [_jsx("strong", { children: "\uD83D\uDCE7 Email:" }), " ", guest.email] }), guest.phone && (_jsxs("p", { children: [_jsx("strong", { children: "\uD83D\uDCDE Phone:" }), " ", guest.phone] })), guest.country && (_jsxs("p", { children: [_jsx("strong", { children: "\uD83C\uDF0D Country:" }), " ", guest.country] })), guest.lastBookingDate && (_jsxs("p", { children: [_jsx("strong", { children: "\uD83D\uDCC5 Last Stay:" }), " ", new Date(guest.lastBookingDate).toLocaleDateString()] }))] }), _jsx("div", { className: "guest-actions", children: _jsxs("button", { className: "btn btn-sm btn-primary", onClick: () => setShowDetails(showDetails === guest.id ? null : guest.id), children: [showDetails === guest.id ? "Hide" : "View", " History"] }) }), showDetails === guest.id && (_jsxs("div", { className: "guest-history", children: [_jsx("h4", { children: "Stay History" }), _jsx("div", { className: "history-placeholder", children: _jsx("p", { children: "Guest stay history and notes would appear here" }) })] }))] }, guest.id))) })), _jsxs("div", { className: "guests-summary", children: [_jsx("h3", { children: "Summary Statistics" }), _jsxs("div", { className: "summary-grid", children: [_jsxs("div", { className: "summary-card", children: [_jsx("p", { className: "summary-label", children: "Total Guests" }), _jsx("p", { className: "summary-value", children: filteredGuests.length })] }), _jsxs("div", { className: "summary-card", children: [_jsx("p", { className: "summary-label", children: "Total Stays" }), _jsx("p", { className: "summary-value", children: filteredGuests.reduce((sum, g) => sum + (g.totalStays || 1), 0) })] }), _jsxs("div", { className: "summary-card", children: [_jsx("p", { className: "summary-label", children: "Avg Stays per Guest" }), _jsx("p", { className: "summary-value", children: (filteredGuests.length > 0 ? (filteredGuests.reduce((sum, g) => sum + (g.totalStays || 1), 0) / filteredGuests.length).toFixed(1) : 0) })] }), _jsxs("div", { className: "summary-card", children: [_jsx("p", { className: "summary-label", children: "Repeat Guests" }), _jsx("p", { className: "summary-value", children: filteredGuests.filter(g => (g.totalStays || 1) > 1).length })] })] })] })] }));
};
export default GuestsPage;
