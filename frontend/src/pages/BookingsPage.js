import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { bookingAPI, propertyAPI, roomAPI, guestAPI } from "../api/endpoints";
const BookingsPage = () => {
    const [bookings, setBookings] = useState([]);
    const [properties, setProperties] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingRoomId, setEditingRoomId] = useState(null);
    const [editingPaymentId, setEditingPaymentId] = useState(null);
    const [filterStatus, setFilterStatus] = useState("all");
    const [manualForm, setManualForm] = useState({
        propertyId: "",
        roomId: "",
        checkInDate: "",
        checkOutDate: "",
        numberOfGuests: 1,
        totalPrice: "",
        guestFirstName: "",
        guestLastName: "",
        guestEmail: "",
        guestPhone: "",
        notes: "",
    });
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
            setBookings(bookingsRes.data || []);
            setProperties(propertiesRes.data || []);
            if (propertiesRes.data?.length && !selectedProperty) {
                setSelectedProperty(propertiesRes.data[0].id);
            }
        }
        catch (err) {
            console.error("Failed to load bookings:", err);
            setError(err.response?.data?.message || "Failed to load bookings");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (selectedProperty) {
            loadRooms(Number(selectedProperty));
        }
    }, [selectedProperty]);
    const loadRooms = async (propertyId) => {
        try {
            setLoading(true);
            const response = await roomAPI.getByProperty(propertyId);
            setRooms(response.data || []);
        }
        catch (err) {
            setError(err.response?.data?.message || "Failed to load rooms");
        }
        finally {
            setLoading(false);
        }
    };
    const handleUpdateBookingRoom = async (bookingId, newRoomId) => {
        try {
            setLoading(true);
            await bookingAPI.updateStatus(bookingId, undefined, undefined, newRoomId);
            setEditingRoomId(null);
            await loadData();
        }
        catch (err) {
            setError(err.response?.data?.message || "Failed to update room");
        }
        finally {
            setLoading(false);
        }
    };
    const handleStatusUpdate = async (id, bookingStatus, paymentStatus) => {
        try {
            setLoading(true);
            await bookingAPI.updateStatus(id, bookingStatus, paymentStatus);
            await loadData();
        }
        catch (err) {
            setError(err.response?.data?.message || "Failed to update booking status");
        }
        finally {
            setLoading(false);
        }
    };
    const handleCancelBooking = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this booking?")) {
            return;
        }
        try {
            setLoading(true);
            await bookingAPI.cancel(id);
            await loadData();
        }
        catch (err) {
            setError(err.response?.data?.message || "Failed to cancel booking");
        }
        finally {
            setLoading(false);
        }
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };
    const getStatusBadgeClass = (status) => {
        const statusMap = {
            CONFIRMED: "badge-success",
            PENDING: "badge-warning",
            CANCELLED: "badge-danger",
            CHECKED_IN: "badge-info",
            CHECKED_OUT: "badge-secondary",
            PAID: "badge-success",
            UNPAID: "badge-danger",
            PARTIAL: "badge-warning",
        };
        return statusMap[status] || "badge-secondary";
    };
    const handleManualInput = (e) => {
        const { name, value } = e.target;
        setManualForm((prev) => ({
            ...prev,
            [name]: name === "numberOfGuests" ? Number(value) : value,
        }));
    };
    const handleCreateManualBooking = async (e) => {
        e.preventDefault();
        if (!manualForm.propertyId || !manualForm.roomId || !manualForm.checkInDate || !manualForm.checkOutDate) {
            setError("Please complete property, room, and dates.");
            return;
        }
        if (!manualForm.guestFirstName || !manualForm.guestLastName || !manualForm.guestEmail) {
            setError("Guest name and email are required.");
            return;
        }
        try {
            setLoading(true);
            setError("");
            const guestRes = await guestAPI.create({
                firstName: manualForm.guestFirstName,
                lastName: manualForm.guestLastName,
                email: manualForm.guestEmail,
                phone: manualForm.guestPhone,
            });
            await bookingAPI.create({
                propertyId: manualForm.propertyId,
                roomId: manualForm.roomId,
                guestId: guestRes.data?.id,
                checkInDate: manualForm.checkInDate,
                checkOutDate: manualForm.checkOutDate,
                numberOfGuests: manualForm.numberOfGuests,
                totalPrice: manualForm.totalPrice || 0,
                source: "MANUAL",
                notes: manualForm.notes,
            });
            setManualForm({
                propertyId: manualForm.propertyId,
                roomId: "",
                checkInDate: "",
                checkOutDate: "",
                numberOfGuests: 1,
                totalPrice: "",
                guestFirstName: "",
                guestLastName: "",
                guestEmail: "",
                guestPhone: "",
                notes: "",
            });
            await loadData();
        }
        catch (err) {
            setError(err.response?.data?.message || "Failed to create manual booking");
        }
        finally {
            setLoading(false);
        }
    };
    const getRoomStatusForDate = (room) => {
        if (room.status === "MAINTENANCE")
            return "MAINTENANCE";
        if (room.status === "OUT_OF_SERVICE")
            return "OUT_OF_SERVICE";
        if (room.status === "CLEANING")
            return "CLEANING";
        const targetDate = new Date(selectedDate);
        const hasBooking = bookings.some((booking) => {
            if (booking.roomId !== room.id)
                return false;
            if (!["CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus))
                return false;
            const checkIn = new Date(booking.checkInDate);
            const checkOut = new Date(booking.checkOutDate);
            return targetDate >= checkIn && targetDate < checkOut;
        });
        return hasBooking ? "OCCUPIED" : "AVAILABLE";
    };
    const getRoomStatusLabel = (status) => {
        const labels = {
            AVAILABLE: "Available",
            OCCUPIED: "Occupied",
            MAINTENANCE: "Maintenance",
            OUT_OF_SERVICE: "Out of Service",
            CLEANING: "Needs Cleaning",
        };
        return labels[status] || status;
    };
    const filteredBookings = filterStatus === "all"
        ? bookings
        : bookings.filter((b) => b.bookingStatus === filterStatus);
    const filteredByProperty = selectedProperty
        ? filteredBookings.filter((b) => b.propertyId === Number(selectedProperty))
        : filteredBookings;
    if (loading && bookings.length === 0) {
        return _jsx("div", { className: "loading", children: "Loading bookings..." });
    }
    return (_jsxs("div", { className: "page-container", children: [_jsxs("div", { className: "page-header", children: [_jsx("h2", { children: "Bookings Management" }), _jsxs("div", { className: "filter-group", children: [_jsx("label", { htmlFor: "propertyFilter", children: "Property:" }), _jsx("select", { id: "propertyFilter", value: selectedProperty, onChange: (e) => setSelectedProperty(Number(e.target.value)), className: "filter-select", children: properties.map((property) => (_jsx("option", { value: property.id, children: property.name }, property.id))) }), _jsx("label", { htmlFor: "dateFilter", children: "Date:" }), _jsx("input", { id: "dateFilter", type: "date", value: selectedDate, onChange: (e) => setSelectedDate(e.target.value), className: "filter-select" }), _jsx("label", { htmlFor: "statusFilter", children: "Filter by Status:" }), _jsxs("select", { id: "statusFilter", value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), className: "filter-select", children: [_jsx("option", { value: "all", children: "All Bookings" }), _jsx("option", { value: "CONFIRMED", children: "Confirmed" }), _jsx("option", { value: "PENDING", children: "Pending" }), _jsx("option", { value: "CHECKED_IN", children: "Checked In" }), _jsx("option", { value: "CHECKED_OUT", children: "Checked Out" }), _jsx("option", { value: "CANCELLED", children: "Cancelled" })] })] })] }), error && _jsx("div", { className: "error-message", children: error }), filteredByProperty.length === 0 ? (_jsx("div", { className: "empty-state", children: _jsx("p", { children: "No bookings found." }) })) : (_jsx("div", { className: "table-container", children: _jsxs("table", { className: "bookings-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "First Name" }), _jsx("th", { children: "Last Name" }), _jsx("th", { children: "Room" }), _jsx("th", { children: "Room Type" }), _jsx("th", { children: "Check In" }), _jsx("th", { children: "Check Out" }), _jsx("th", { children: "Reservation Date" }), _jsx("th", { children: "Guests" }), _jsx("th", { children: "Total Price" }), _jsx("th", { children: "Booking Status" }), _jsx("th", { children: "Payment Status" }), _jsx("th", { children: "Source" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: filteredByProperty.map((booking) => (_jsxs("tr", { children: [_jsxs("td", { children: ["#", booking.id] }), _jsx("td", { children: booking.guest?.firstName || "-" }), _jsx("td", { children: booking.guest?.lastName || "-" }), _jsx("td", { children: editingRoomId === booking.id ? (_jsx("select", { autoFocus: true, onBlur: (e) => {
                                                if (e.target.value !== String(booking.roomId)) {
                                                    handleUpdateBookingRoom(booking.id, Number(e.target.value));
                                                }
                                                else {
                                                    setEditingRoomId(null);
                                                }
                                            }, defaultValue: booking.roomId, onChange: (e) => handleUpdateBookingRoom(booking.id, Number(e.target.value)), className: "p-1 border rounded text-sm", children: rooms
                                                .filter(r => r.propertyId === booking.propertyId)
                                                .map(room => (_jsxs("option", { value: room.id, children: [room.roomNumber, " (", room.roomType, ")"] }, room.id))) })) : (_jsxs("div", { className: "flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded group", onClick: () => setEditingRoomId(booking.id), title: "Click to change room", children: [_jsx("span", { children: booking.room?.roomNumber || `Room ${booking.roomId}` }), _jsx("span", { className: "text-gray-400 opacity-0 group-hover:opacity-100 text-xs", children: "\u270E" })] })) }), _jsx("td", { children: booking.room?.roomType || "-" }), _jsx("td", { children: formatDate(booking.checkInDate) }), _jsx("td", { children: formatDate(booking.checkOutDate) }), _jsx("td", { children: booking.createdAt ? formatDate(booking.createdAt) : "-" }), _jsx("td", { children: booking.numberOfGuests }), _jsxs("td", { children: ["$", booking.totalPrice.toFixed(2)] }), _jsx("td", { children: _jsx("span", { className: `badge ${getStatusBadgeClass(booking.bookingStatus)}`, children: booking.bookingStatus }) }), _jsx("td", { children: editingPaymentId === booking.id ? (_jsxs("select", { autoFocus: true, defaultValue: booking.paymentStatus, onBlur: () => setEditingPaymentId(null), onChange: (e) => {
                                                handleStatusUpdate(booking.id, undefined, e.target.value);
                                                setEditingPaymentId(null);
                                            }, className: "p-1 border rounded text-xs", children: [_jsx("option", { value: "PENDING", children: "Pending" }), _jsx("option", { value: "PARTIAL", children: "Partial" }), _jsx("option", { value: "PAID", children: "Paid" }), _jsx("option", { value: "REFUNDED", children: "Refunded" })] })) : (_jsxs("span", { className: `badge ${getStatusBadgeClass(booking.paymentStatus)} cursor-pointer hover:opacity-80`, onClick: () => setEditingPaymentId(booking.id), title: "Click to update payment status", children: [booking.paymentStatus, " \u270E"] })) }), _jsx("td", { children: booking.source }), _jsx("td", { children: _jsxs("div", { className: "action-buttons", children: [booking.bookingStatus === "PENDING" && (_jsx("button", { className: "btn btn-sm btn-success", onClick: () => handleStatusUpdate(booking.id, "CONFIRMED", booking.paymentStatus), children: "Confirm" })), booking.bookingStatus === "CONFIRMED" && (_jsx("button", { className: "btn btn-sm btn-info", onClick: () => handleStatusUpdate(booking.id, "CHECKED_IN", booking.paymentStatus), children: "Check In" })), booking.bookingStatus === "CHECKED_IN" && (_jsx("button", { className: "btn btn-sm btn-secondary", onClick: () => handleStatusUpdate(booking.id, "CHECKED_OUT", booking.paymentStatus), children: "Check Out" })), booking.bookingStatus !== "CANCELLED" && (_jsx("button", { className: "btn btn-sm btn-danger", onClick: () => handleCancelBooking(booking.id), children: "Cancel" }))] }) })] }, booking.id))) })] }) })), _jsxs("div", { className: "stats-summary", children: [_jsxs("div", { className: "stat-card", children: [_jsx("h4", { children: "Total Bookings" }), _jsx("p", { className: "stat-value", children: bookings.length })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h4", { children: "Confirmed" }), _jsx("p", { className: "stat-value", children: bookings.filter((b) => b.bookingStatus === "CONFIRMED").length })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h4", { children: "Checked In" }), _jsx("p", { className: "stat-value", children: bookings.filter((b) => b.bookingStatus === "CHECKED_IN").length })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h4", { children: "Total Revenue" }), _jsxs("p", { className: "stat-value", children: ["$", bookings.reduce((sum, b) => sum + b.totalPrice, 0).toFixed(2)] })] })] })] }));
};
export default BookingsPage;
