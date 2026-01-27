import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { guestAuthAPI, hotelProfileAPI } from "../api/endpoints";
const GuestPortal = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authMode, setAuthMode] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [authError, setAuthError] = useState("");
    const [token, setToken] = useState(localStorage.getItem("guestToken"));
    const [bookings, setBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [reservationFilter, setReservationFilter] = useState("upcoming");
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const res = await hotelProfileAPI.get();
                setProfile(res.data || null);
            }
            catch (error) {
                console.error(error);
            }
            finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);
    const isLoggedIn = !!token;
    const loadBookings = async (guestToken) => {
        setBookingsLoading(true);
        try {
            const res = await guestAuthAPI.getBookings(guestToken);
            setBookings(res.data || []);
        }
        catch (error) {
            console.error(error);
            setAuthError("Failed to load your bookings. Please login again.");
        }
        finally {
            setBookingsLoading(false);
        }
    };
    useEffect(() => {
        if (token) {
            loadBookings(token);
        }
    }, [token]);
    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthError("");
        if (!email || !password) {
            setAuthError("Email and password are required.");
            return;
        }
        if (authMode === "register" && (!firstName || !lastName || !phone)) {
            setAuthError("First name, last name, and phone are required.");
            return;
        }
        try {
            const res = authMode === "login"
                ? await guestAuthAPI.login({ email, password })
                : await guestAuthAPI.register({ email, password, firstName, lastName, phone });
            const newToken = res.data?.token;
            const guestProfile = res.data?.guest;
            if (!newToken) {
                setAuthError("Login failed.");
                return;
            }
            localStorage.setItem("guestToken", newToken);
            setToken(newToken);
            setPassword("");
            if (guestProfile) {
                setFirstName(guestProfile.firstName || "");
                setLastName(guestProfile.lastName || "");
                setPhone(guestProfile.phone || "");
            }
        }
        catch (error) {
            setAuthError(error.response?.data?.message || "Login failed.");
        }
    };
    const handleLogout = () => {
        localStorage.removeItem("guestToken");
        setToken(null);
        setBookings([]);
    };
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
    const parseGuestNotes = (notes) => {
        if (!notes)
            return { checkIn: "", additional: "" };
        const checkInMatch = notes.match(/Check-in guest:\s*([^|]+)/i);
        const additionalMatch = notes.match(/Additional guests:\s*([^|]+)/i);
        return {
            checkIn: checkInMatch?.[1]?.trim() || "",
            additional: additionalMatch?.[1]?.trim() || "",
        };
    };
    const guestName = useMemo(() => {
        const fromBooking = bookings.find((b) => b.guest?.firstName || b.guest?.lastName)?.guest;
        if (fromBooking?.firstName || fromBooking?.lastName) {
            return `${fromBooking.firstName || ""} ${fromBooking.lastName || ""}`.trim();
        }
        if (firstName || lastName) {
            return `${firstName} ${lastName}`.trim();
        }
        return email || "Guest";
    }, [bookings, email, firstName, lastName]);
    const todayStart = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    }, []);
    const upcomingReservations = useMemo(() => {
        return bookings.filter((booking) => {
            const checkOut = new Date(booking.checkOutDate).getTime();
            return checkOut >= todayStart;
        });
    }, [bookings, todayStart]);
    const pastReservations = useMemo(() => {
        return bookings.filter((booking) => {
            const checkOut = new Date(booking.checkOutDate).getTime();
            return checkOut < todayStart;
        });
    }, [bookings, todayStart]);
    const handlePrint = (booking) => {
        const printWindow = window.open("", "_blank");
        if (!printWindow)
            return;
        const hotelName = profile?.name || "Hotel";
        const logoUrl = profile?.logoUrl;
        const extras = [
            booking.breakfastCount > 0 ? `Breakfast x${booking.breakfastCount}` : null,
            booking.parkingIncluded ? "Parking" : null,
        ].filter(Boolean).join(" · ");
        const guestNotes = parseGuestNotes(booking.notes);
        printWindow.document.write(`
      <html>
        <head>
          <title>Reservation ${booking.bookingNumber || booking.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #2c3e50; }
            .header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
            .logo { height: 40px; }
            .card { border: 1px solid #eee; border-radius: 8px; padding: 16px; }
            .row { display: flex; justify-content: space-between; margin: 6px 0; }
            .title { font-size: 20px; font-weight: bold; margin-bottom: 12px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 10px; font-size: 12px; background: #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoUrl ? `<img class="logo" src="${logoUrl}" />` : ""}
            <div>
              <div style="font-weight: bold; font-size: 18px;">${hotelName}</div>
              <div style="font-size: 12px; color: #6b7280;">Reservation Confirmation</div>
            </div>
          </div>
          <div class="card">
            <div class="title">Reservation ${booking.bookingNumber || `#${booking.id}`}</div>
            <div class="row"><span>Guest</span><span>${guestNotes.checkIn || `${booking.guest?.firstName || ""} ${booking.guest?.lastName || ""}`.trim()}</span></div>
            ${guestNotes.additional ? `<div class="row"><span>Additional Guests</span><span>${guestNotes.additional}</span></div>` : ""}
            <div class="row"><span>Dates</span><span>${formatDate(booking.checkInDate)} — ${formatDate(booking.checkOutDate)}</span></div>
            <div class="row"><span>Room</span><span>${booking.room?.roomType || "Room"}</span></div>
            <div class="row"><span>Guests</span><span>${booking.numberOfGuests}</span></div>
            <div class="row"><span>Extras</span><span>${extras || "None"}</span></div>
            <div class="row"><span>Total</span><span>€${booking.totalPrice.toFixed(2)}</span></div>
            <div class="row"><span>Status</span><span class="badge">${booking.bookingStatus}</span></div>
          </div>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };
    const title = useMemo(() => profile?.websiteTitle || profile?.name || "Guest Portal", [profile]);
    if (loading) {
        return _jsx("div", { className: "min-h-screen flex items-center justify-center", children: "Loading..." });
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 text-gray-800", children: [_jsx("header", { className: "bg-white shadow-sm", children: _jsxs("div", { className: "max-w-5xl mx-auto px-6 py-4 flex items-center justify-between", children: [_jsx("div", { className: "font-bold text-lg", style: { color: profile?.primaryColor || "#2E5D4B" }, children: title }), _jsxs("div", { className: "flex items-center gap-4 text-sm", children: [_jsx("a", { href: "/", className: "text-gray-600 hover:text-gray-900", children: "Back to website" }), isLoggedIn && (_jsx("button", { onClick: handleLogout, className: "text-red-600 hover:text-red-700", children: "Logout" }))] })] }) }), _jsx("main", { className: "max-w-5xl mx-auto px-6 py-10", children: !isLoggedIn ? (_jsxs("div", { className: "bg-white p-6 rounded-lg shadow-sm max-w-md mx-auto", children: [_jsx("h2", { className: "text-2xl font-bold mb-2", children: "Guest Login" }), _jsx("p", { className: "text-sm text-gray-500 mb-6", children: "Use the same email you used for your reservation. You can book without an account and create one later." }), _jsxs("div", { className: "flex gap-2 mb-6", children: [_jsx("button", { type: "button", onClick: () => setAuthMode("login"), className: `flex-1 py-2 rounded ${authMode === "login" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`, children: "Login" }), _jsx("button", { type: "button", onClick: () => setAuthMode("register"), className: `flex-1 py-2 rounded ${authMode === "register" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`, children: "Create Account" })] }), _jsxs("form", { onSubmit: handleAuth, className: "space-y-4", children: [authMode === "register" && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase text-gray-500 mb-1", children: "First Name" }), _jsx("input", { type: "text", className: "w-full border rounded px-3 py-2", value: firstName, onChange: (e) => setFirstName(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase text-gray-500 mb-1", children: "Last Name" }), _jsx("input", { type: "text", className: "w-full border rounded px-3 py-2", value: lastName, onChange: (e) => setLastName(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase text-gray-500 mb-1", children: "Phone" }), _jsx("input", { type: "tel", className: "w-full border rounded px-3 py-2", value: phone, onChange: (e) => setPhone(e.target.value) })] })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase text-gray-500 mb-1", children: "Email" }), _jsx("input", { type: "email", className: "w-full border rounded px-3 py-2", value: email, onChange: (e) => setEmail(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase text-gray-500 mb-1", children: "Password" }), _jsx("input", { type: "password", className: "w-full border rounded px-3 py-2", value: password, onChange: (e) => setPassword(e.target.value) })] }), _jsx("div", { className: "flex justify-end", children: _jsx("a", { href: "/guest/forgot-password", className: "text-xs text-blue-600 hover:underline", children: "Forgot Password?" }) }), authError && _jsx("div", { className: "text-red-600 text-sm", children: authError }), _jsx("button", { type: "submit", className: "w-full py-2 rounded text-white font-semibold", style: { background: profile?.primaryColor || "#2E5D4B" }, children: authMode === "login" ? "Login" : "Create Account" })] })] })) : (_jsxs("div", { children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-6", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-500", children: "Welcome" }), _jsx("h2", { className: "text-2xl font-bold", children: guestName })] }), _jsx("button", { onClick: () => token && loadBookings(token), className: "text-sm text-gray-600 hover:text-gray-900", children: "Refresh" })] }), _jsxs("div", { className: "flex items-center gap-2 mb-6", children: [_jsx("button", { type: "button", onClick: () => setReservationFilter("upcoming"), className: `px-3 py-2 text-sm rounded ${reservationFilter === "upcoming" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`, children: "To Check In / Upcoming" }), _jsx("button", { type: "button", onClick: () => setReservationFilter("past"), className: `px-3 py-2 text-sm rounded ${reservationFilter === "past" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`, children: "Past" })] }), bookingsLoading ? (_jsx("div", { className: "bg-white p-6 rounded-lg", children: "Loading reservations..." })) : (reservationFilter === "upcoming" ? upcomingReservations : pastReservations).length === 0 ? (_jsx("div", { className: "bg-white p-6 rounded-lg", children: reservationFilter === "upcoming"
                                ? "No upcoming reservations found."
                                : "No past reservations found." })) : (_jsx("div", { className: "space-y-4", children: (reservationFilter === "upcoming" ? upcomingReservations : pastReservations).map((booking) => {
                                const guestNotes = parseGuestNotes(booking.notes);
                                return (_jsxs("div", { className: "bg-white p-6 rounded-lg shadow-sm", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-500", children: "Reservation" }), _jsx("div", { className: "text-lg font-semibold", children: booking.bookingNumber || `#${booking.id}` })] }), _jsxs("div", { className: "text-sm text-gray-600", children: ["Booked on ", formatDate(booking.createdAt)] }), _jsx("button", { onClick: () => handlePrint(booking), className: "px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50", children: "Print" })] }), _jsxs("div", { className: "mt-4 grid md:grid-cols-2 gap-4 text-sm", children: [guestNotes.checkIn && (_jsxs("div", { children: [_jsx("div", { className: "text-gray-500", children: "Check-in Name" }), _jsx("div", { className: "font-medium", children: guestNotes.checkIn })] })), guestNotes.additional && (_jsxs("div", { children: [_jsx("div", { className: "text-gray-500", children: "Additional Guests" }), _jsx("div", { className: "font-medium", children: guestNotes.additional })] })), _jsxs("div", { children: [_jsx("div", { className: "text-gray-500", children: "Guest" }), _jsx("div", { className: "font-medium", children: (booking.guest?.firstName || booking.guest?.lastName)
                                                                ? `${booking.guest?.firstName || ""} ${booking.guest?.lastName || ""}`.trim()
                                                                : guestName })] }), _jsxs("div", { children: [_jsx("div", { className: "text-gray-500", children: "Dates" }), _jsxs("div", { className: "font-medium", children: [formatDate(booking.checkInDate), " \u2014 ", formatDate(booking.checkOutDate)] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-gray-500", children: "Room" }), _jsx("div", { className: "font-medium", children: booking.room?.roomType || "Room" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-gray-500", children: "Guests" }), _jsx("div", { className: "font-medium", children: booking.numberOfGuests })] }), _jsxs("div", { children: [_jsx("div", { className: "text-gray-500", children: "Extras" }), _jsxs("div", { className: "font-medium", children: [booking.breakfastCount > 0 ? `Breakfast x${booking.breakfastCount}` : "No breakfast", booking.parkingIncluded ? " + Parking" : ""] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-gray-500", children: "Total" }), _jsxs("div", { className: "font-medium", children: ["\u20AC", booking.totalPrice.toFixed(2)] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-gray-500", children: "Status" }), _jsx("div", { className: "font-medium", children: booking.bookingStatus })] })] }), booking.property && (_jsxs("div", { className: "mt-4 text-xs text-gray-500", children: [booking.property.name, " \u00B7 ", booking.property.city || "", " ", booking.property.country || ""] }))] }, booking.id));
                            }) }))] })) })] }));
};
export default GuestPortal;
