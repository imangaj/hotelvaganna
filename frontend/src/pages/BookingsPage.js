import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { bookingAPI, propertyAPI, roomAPI, guestAPI } from "../api/endpoints";
import { useLanguage } from "../contexts/LanguageContext";
const BookingsPage = () => {
    const { t } = useLanguage();
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
    const [searchTerm, setSearchTerm] = useState("");
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
            setError(err.response?.data?.message || t("bk_error_load_bookings"));
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
            setError(err.response?.data?.message || t("bk_error_load_rooms"));
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
            setError(err.response?.data?.message || t("bk_error_update_room"));
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
            setError(err.response?.data?.message || t("bk_error_update_status"));
        }
        finally {
            setLoading(false);
        }
    };
    const handleCancelBooking = async (id) => {
        if (!window.confirm(t("bk_confirm_cancel"))) {
            return;
        }
        try {
            setLoading(true);
            await bookingAPI.cancel(id);
            await loadData();
        }
        catch (err) {
            setError(err.response?.data?.message || t("bk_error_cancel_booking"));
        }
        finally {
            setLoading(false);
        }
    };
    const handleDeleteBooking = async (id) => {
        if (!window.confirm("Delete this reservation permanently?")) {
            return;
        }
        try {
            setLoading(true);
            await bookingAPI.deletePermanent(id);
            await loadData();
        }
        catch (err) {
            setError(err.response?.data?.message || "Failed to delete booking.");
        }
        finally {
            setLoading(false);
        }
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("it-IT", {
            timeZone: "Europe/Rome",
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };
    const toDateKey = (dateStr) => new Date(dateStr).toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
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
    const getBookingStatusLabel = (status) => {
        const labels = {
            CONFIRMED: t("bk_confirmed"),
            PENDING: t("bk_pending"),
            CHECKED_IN: t("bk_checked_in"),
            CHECKED_OUT: t("bk_checked_out"),
            CANCELLED: t("bk_cancelled"),
        };
        return labels[status] || status;
    };
    const getPaymentStatusLabel = (status) => {
        const labels = {
            PENDING: t("payment_pending"),
            PARTIAL: t("payment_partial"),
            PAID: t("payment_paid"),
            REFUNDED: t("payment_refunded"),
        };
        return labels[status] || status;
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
            setError(t("bk_error_fields_required"));
            return;
        }
        if (!manualForm.guestFirstName || !manualForm.guestLastName || !manualForm.guestEmail) {
            setError(t("bk_error_guest_required"));
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
            setError(err.response?.data?.message || t("bk_error_create_booking"));
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
        const targetKey = toDateKey(selectedDate);
        const hasBooking = bookings.some((booking) => {
            if (booking.roomId !== room.id)
                return false;
            if (!["CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus))
                return false;
            const checkIn = toDateKey(booking.checkInDate);
            const checkOut = toDateKey(booking.checkOutDate);
            return targetKey >= checkIn && targetKey < checkOut;
        });
        return hasBooking ? "OCCUPIED" : "AVAILABLE";
    };
    const getRoomStatusLabel = (status) => {
        const labels = {
            AVAILABLE: t("room_status_available"),
            OCCUPIED: t("room_status_occupied"),
            MAINTENANCE: t("room_status_maintenance"),
            OUT_OF_SERVICE: t("room_status_out_of_service"),
            CLEANING: t("room_status_cleaning"),
        };
        return labels[status] || status;
    };
    const filteredBookings = filterStatus === "all"
        ? bookings
        : bookings.filter((b) => b.bookingStatus === filterStatus);
    const filteredByProperty = selectedProperty
        ? filteredBookings.filter((b) => b.propertyId === Number(selectedProperty))
        : filteredBookings;
    const filteredByDate = selectedDate
        ? filteredByProperty.filter((booking) => {
            const targetKey = toDateKey(selectedDate);
            const checkIn = toDateKey(booking.checkInDate);
            const checkOut = toDateKey(booking.checkOutDate);
            return targetKey >= checkIn && targetKey < checkOut;
        })
        : filteredByProperty;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredBySearch = normalizedSearch
        ? filteredByDate.filter((booking) => {
            const propertyName = properties.find((p) => p.id === booking.propertyId)?.name || "";
            const roomNumber = booking.room?.roomNumber || booking.roomId || "";
            const roomType = booking.room?.roomType || "";
            const guestName = `${booking.guest?.firstName || ""} ${booking.guest?.lastName || ""}`.trim();
            const haystack = [
                booking.id,
                propertyName,
                guestName,
                booking.guest?.email || "",
                roomNumber,
                roomType,
                booking.checkInDate,
                booking.checkOutDate,
                booking.createdAt || "",
                booking.numberOfGuests,
                booking.totalPrice,
                booking.bookingStatus,
                booking.paymentStatus,
                booking.source,
                booking.notes || "",
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(normalizedSearch);
        })
        : filteredByDate;
    if (loading && bookings.length === 0) {
        return _jsx("div", { className: "loading", children: t("bk_loading") });
    }
    return (_jsxs("div", { className: "page-container", children: [_jsxs("div", { className: "page-header", children: [_jsx("h2", { children: t("bk_title") }), _jsxs("div", { className: "filter-group", children: [_jsx("label", { htmlFor: "propertyFilter", children: t("bk_property") }), _jsx("select", { id: "propertyFilter", value: selectedProperty, onChange: (e) => setSelectedProperty(Number(e.target.value)), className: "filter-select", children: properties.map((property) => (_jsx("option", { value: property.id, children: property.name }, property.id))) }), _jsx("label", { htmlFor: "dateFilter", children: t("bk_date") }), _jsx("input", { id: "dateFilter", type: "date", value: selectedDate, onChange: (e) => setSelectedDate(e.target.value), className: "filter-select" }), _jsx("label", { htmlFor: "statusFilter", children: t("bk_filter_status") }), _jsxs("select", { id: "statusFilter", value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), className: "filter-select", children: [_jsx("option", { value: "all", children: t("bk_all_bookings") }), _jsx("option", { value: "CONFIRMED", children: t("bk_confirmed") }), _jsx("option", { value: "PENDING", children: t("bk_pending") }), _jsx("option", { value: "CHECKED_IN", children: t("bk_checked_in") }), _jsx("option", { value: "CHECKED_OUT", children: t("bk_checked_out") }), _jsx("option", { value: "CANCELLED", children: t("bk_cancelled") })] }), _jsx("label", { htmlFor: "searchFilter", children: "Search" }), _jsx("input", { id: "searchFilter", type: "text", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "filter-select", placeholder: "Search all columns" })] })] }), error && _jsx("div", { className: "error-message", children: error }), filteredBySearch.length === 0 ? (_jsx("div", { className: "empty-state", children: _jsx("p", { children: t("bk_no_bookings") }) })) : (_jsx("div", { className: "table-container", children: _jsxs("table", { className: "bookings-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t("bk_table_id") }), _jsx("th", { children: t("bk_table_first_name") }), _jsx("th", { children: t("bk_table_last_name") }), _jsx("th", { children: t("bk_table_room") }), _jsx("th", { children: t("bk_table_room_type") }), _jsx("th", { children: t("bk_table_check_in") }), _jsx("th", { children: t("bk_table_check_out") }), _jsx("th", { children: t("bk_table_created_at") }), _jsx("th", { children: t("bk_table_guests") }), _jsx("th", { children: t("bk_table_total_price") }), _jsx("th", { children: t("bk_table_booking_status") }), _jsx("th", { children: t("bk_table_payment_status") }), _jsx("th", { children: t("bk_table_source") }), _jsx("th", { children: t("bk_table_actions") })] }) }), _jsx("tbody", { children: filteredBySearch.map((booking) => (_jsxs("tr", { children: [_jsxs("td", { children: ["#", booking.id] }), _jsx("td", { children: booking.guest?.firstName || "-" }), _jsx("td", { children: booking.guest?.lastName || "-" }), _jsx("td", { children: editingRoomId === booking.id ? (_jsx("select", { autoFocus: true, onBlur: (e) => {
                                                if (e.target.value !== String(booking.roomId)) {
                                                    handleUpdateBookingRoom(booking.id, Number(e.target.value));
                                                }
                                                else {
                                                    setEditingRoomId(null);
                                                }
                                            }, defaultValue: booking.roomId, onChange: (e) => handleUpdateBookingRoom(booking.id, Number(e.target.value)), className: "p-1 border rounded text-sm", children: rooms
                                                .filter(r => r.propertyId === booking.propertyId)
                                                .map(room => (_jsxs("option", { value: room.id, children: [room.roomNumber, " (", room.roomType, ")"] }, room.id))) })) : (_jsxs("div", { className: "flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded group", onClick: () => setEditingRoomId(booking.id), title: t("bk_click_change_room"), children: [_jsx("span", { children: booking.room?.roomNumber || `${t("bk_table_room")} ${booking.roomId}` }), _jsx("span", { className: "text-gray-400 opacity-0 group-hover:opacity-100 text-xs", children: "\u270E" })] })) }), _jsx("td", { children: booking.room?.roomType || "-" }), _jsx("td", { children: formatDate(booking.checkInDate) }), _jsx("td", { children: formatDate(booking.checkOutDate) }), _jsx("td", { children: booking.createdAt ? formatDate(booking.createdAt) : "-" }), _jsx("td", { children: booking.numberOfGuests }), _jsxs("td", { children: ["$", booking.totalPrice.toFixed(2)] }), _jsx("td", { children: _jsx("span", { className: `badge ${getStatusBadgeClass(booking.bookingStatus)}`, children: getBookingStatusLabel(booking.bookingStatus) }) }), _jsx("td", { children: editingPaymentId === booking.id ? (_jsxs("select", { autoFocus: true, defaultValue: booking.paymentStatus, onBlur: () => setEditingPaymentId(null), onChange: (e) => {
                                                handleStatusUpdate(booking.id, undefined, e.target.value);
                                                setEditingPaymentId(null);
                                            }, className: "p-1 border rounded text-xs", children: [_jsx("option", { value: "PENDING", children: t("payment_pending") }), _jsx("option", { value: "PARTIAL", children: t("payment_partial") }), _jsx("option", { value: "PAID", children: t("payment_paid") }), _jsx("option", { value: "REFUNDED", children: t("payment_refunded") })] })) : (_jsxs("span", { className: `badge ${getStatusBadgeClass(booking.paymentStatus)} cursor-pointer hover:opacity-80`, onClick: () => setEditingPaymentId(booking.id), title: t("bk_click_update_payment"), children: [getPaymentStatusLabel(booking.paymentStatus), " \u270E"] })) }), _jsx("td", { children: booking.source }), _jsx("td", { children: _jsxs("div", { className: "action-buttons", children: [booking.bookingStatus === "PENDING" && (_jsx("button", { className: "btn btn-sm btn-success", onClick: () => handleStatusUpdate(booking.id, "CONFIRMED", booking.paymentStatus), children: t("bk_action_confirm") })), booking.bookingStatus === "CONFIRMED" && (_jsx("button", { className: "btn btn-sm btn-info", onClick: () => handleStatusUpdate(booking.id, "CHECKED_IN", booking.paymentStatus), children: t("bk_action_check_in") })), booking.bookingStatus === "CHECKED_IN" && (_jsx("button", { className: "btn btn-sm btn-secondary", onClick: () => handleStatusUpdate(booking.id, "CHECKED_OUT", booking.paymentStatus), children: t("bk_action_check_out") })), booking.bookingStatus !== "CANCELLED" && (_jsx("button", { className: "btn btn-sm btn-danger", onClick: () => handleCancelBooking(booking.id), children: t("bk_action_cancel") })), _jsx("button", { className: "btn btn-sm btn-danger", onClick: () => handleDeleteBooking(booking.id), children: "Delete" })] }) })] }, booking.id))) })] }) })), _jsxs("div", { className: "stats-summary", children: [_jsxs("div", { className: "stat-card", children: [_jsx("h4", { children: t("bk_stats_total_bookings") }), _jsx("p", { className: "stat-value", children: bookings.length })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h4", { children: t("bk_stats_confirmed") }), _jsx("p", { className: "stat-value", children: bookings.filter((b) => b.bookingStatus === "CONFIRMED").length })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h4", { children: t("bk_stats_checked_in") }), _jsx("p", { className: "stat-value", children: bookings.filter((b) => b.bookingStatus === "CHECKED_IN").length })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h4", { children: t("bk_stats_total_revenue") }), _jsxs("p", { className: "stat-value", children: ["$", bookings.reduce((sum, b) => sum + b.totalPrice, 0).toFixed(2)] })] })] })] }));
};
export default BookingsPage;
