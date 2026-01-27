import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { bookingAPI, propertyAPI } from "../api/endpoints";
import { useLanguage } from "../contexts/LanguageContext";
const AnalyticsPage = () => {
    const { t } = useLanguage();
    const [properties, setProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    useEffect(() => {
        loadProperties();
    }, []);
    useEffect(() => {
        if (selectedProperty) {
            loadAnalytics(selectedProperty);
        }
    }, [selectedProperty, dateRange]);
    const loadProperties = async () => {
        try {
            setLoading(true);
            const response = await propertyAPI.getAll();
            const propertiesData = response.data || [];
            setProperties(propertiesData);
            if (propertiesData.length > 0 && !selectedProperty) {
                setSelectedProperty(propertiesData[0].id);
            }
        }
        catch (err) {
            setError(t("analytics_error_load_properties"));
        }
        finally {
            setLoading(false);
        }
    };
    const loadAnalytics = async (propertyId) => {
        try {
            setLoading(true);
            setError("");
            const response = await bookingAPI.getByProperty(propertyId);
            setBookings(response.data || []);
        }
        catch (err) {
            setError(err.response?.data?.message || t("analytics_error_load"));
        }
        finally {
            setLoading(false);
        }
    };
    const calculateMetrics = () => {
        const filteredBookings = bookings.filter(b => {
            const bookingDate = new Date(b.checkInDate);
            const start = new Date(dateRange.startDate);
            const end = new Date(dateRange.endDate);
            return bookingDate >= start && bookingDate <= end;
        });
        const totalRevenue = filteredBookings.reduce((sum, b) => sum + b.totalPrice, 0);
        const confirmedBookings = filteredBookings.filter(b => b.bookingStatus === "CONFIRMED").length;
        const occupiedRooms = filteredBookings.filter(b => b.bookingStatus === "CHECKED_IN").length;
        const checkedOutBookings = filteredBookings.filter(b => b.bookingStatus === "CHECKED_OUT").length;
        return {
            totalRevenue,
            confirmedBookings,
            occupiedRooms,
            checkedOutBookings,
            totalBookings: filteredBookings.length,
            avgBookingValue: filteredBookings.length > 0 ? totalRevenue / filteredBookings.length : 0
        };
    };
    const getRevenueBySource = () => {
        const sources = {};
        bookings.forEach(booking => {
            sources[booking.source] = (sources[booking.source] || 0) + booking.totalPrice;
        });
        return sources;
    };
    const getBookingsByStatus = () => {
        const statuses = {};
        bookings.forEach(booking => {
            statuses[booking.bookingStatus] = (statuses[booking.bookingStatus] || 0) + 1;
        });
        return statuses;
    };
    const metrics = calculateMetrics();
    const revenueBySource = getRevenueBySource();
    const bookingsByStatus = getBookingsByStatus();
    if (loading && properties.length === 0) {
        return _jsx("div", { className: "loading", children: t("analytics_loading") });
    }
    return (_jsxs("div", { className: "page-container", children: [_jsxs("div", { className: "page-header", children: [_jsx("h2", { children: t("analytics_title") }), _jsx("div", { className: "header-actions", children: properties.length > 0 && (_jsxs("select", { value: selectedProperty || "", onChange: (e) => setSelectedProperty(Number(e.target.value)), className: "property-select", children: [_jsx("option", { value: "", children: t("analytics_select_property") }), properties.map((property) => (_jsx("option", { value: property.id, children: property.name }, property.id)))] })) })] }), error && _jsx("div", { className: "error-message", children: error }), selectedProperty && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "date-range-filter", children: [_jsxs("div", { className: "filter-group", children: [_jsx("label", { htmlFor: "startDate", children: t("analytics_from") }), _jsx("input", { type: "date", id: "startDate", value: dateRange.startDate, onChange: (e) => setDateRange(prev => ({ ...prev, startDate: e.target.value })) })] }), _jsxs("div", { className: "filter-group", children: [_jsx("label", { htmlFor: "endDate", children: t("analytics_to") }), _jsx("input", { type: "date", id: "endDate", value: dateRange.endDate, onChange: (e) => setDateRange(prev => ({ ...prev, endDate: e.target.value })) })] })] }), _jsxs("div", { className: "metrics-grid", children: [_jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83D\uDCB0" }), _jsxs("div", { className: "metric-content", children: [_jsx("h3", { children: t("analytics_total_revenue") }), _jsxs("p", { className: "metric-value", children: ["$", metrics.totalRevenue.toFixed(2)] }), _jsx("p", { className: "metric-label", children: t("analytics_all_bookings") })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83D\uDCC5" }), _jsxs("div", { className: "metric-content", children: [_jsx("h3", { children: t("analytics_confirmed_bookings") }), _jsx("p", { className: "metric-value", children: metrics.confirmedBookings }), _jsx("p", { className: "metric-label", children: t("analytics_active_reservations") })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83C\uDFE0" }), _jsxs("div", { className: "metric-content", children: [_jsx("h3", { children: t("analytics_occupied_rooms") }), _jsx("p", { className: "metric-value", children: metrics.occupiedRooms }), _jsx("p", { className: "metric-label", children: t("analytics_currently_checked_in") })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\u2705" }), _jsxs("div", { className: "metric-content", children: [_jsx("h3", { children: t("analytics_checked_out") }), _jsx("p", { className: "metric-value", children: metrics.checkedOutBookings }), _jsx("p", { className: "metric-label", children: t("analytics_completed_stays") })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83D\uDCCA" }), _jsxs("div", { className: "metric-content", children: [_jsx("h3", { children: t("analytics_avg_booking_value") }), _jsxs("p", { className: "metric-value", children: ["$", metrics.avgBookingValue.toFixed(2)] }), _jsx("p", { className: "metric-label", children: t("analytics_per_reservation") })] })] }), _jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-icon", children: "\uD83D\uDCC8" }), _jsxs("div", { className: "metric-content", children: [_jsx("h3", { children: t("analytics_total_bookings") }), _jsx("p", { className: "metric-value", children: metrics.totalBookings }), _jsx("p", { className: "metric-label", children: t("analytics_in_period") })] })] })] }), _jsxs("div", { className: "reports-grid", children: [_jsxs("div", { className: "report-card", children: [_jsx("h3", { children: t("analytics_revenue_by_source") }), _jsx("div", { className: "report-content", children: Object.entries(revenueBySource).map(([source, revenue]) => (_jsxs("div", { className: "report-row", children: [_jsx("span", { children: source }), _jsxs("span", { className: "report-value", children: ["$", revenue.toFixed(2)] })] }, source))) })] }), _jsxs("div", { className: "report-card", children: [_jsx("h3", { children: t("analytics_bookings_by_status") }), _jsx("div", { className: "report-content", children: Object.entries(bookingsByStatus).map(([status, count]) => (_jsxs("div", { className: "report-row", children: [_jsx("span", { children: status }), _jsx("span", { className: "report-value", children: count })] }, status))) })] })] }), _jsxs("div", { className: "report-card full-width", children: [_jsx("h3", { children: t("analytics_recent_bookings") }), _jsx("div", { className: "table-container", children: _jsxs("table", { className: "bookings-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t("analytics_table_id") }), _jsx("th", { children: t("analytics_table_room") }), _jsx("th", { children: t("analytics_table_check_in") }), _jsx("th", { children: t("analytics_table_check_out") }), _jsx("th", { children: t("analytics_table_total_price") }), _jsx("th", { children: t("analytics_table_status") }), _jsx("th", { children: t("analytics_table_source") })] }) }), _jsx("tbody", { children: bookings.slice(0, 10).map((booking) => (_jsxs("tr", { children: [_jsxs("td", { children: ["#", booking.id] }), _jsx("td", { children: booking.room?.roomNumber }), _jsx("td", { children: new Date(booking.checkInDate).toLocaleDateString() }), _jsx("td", { children: new Date(booking.checkOutDate).toLocaleDateString() }), _jsxs("td", { children: ["$", booking.totalPrice.toFixed(2)] }), _jsx("td", { children: _jsx("span", { className: `badge badge-${booking.bookingStatus === "CONFIRMED" ? "success" : "info"}`, children: booking.bookingStatus }) }), _jsx("td", { children: booking.source })] }, booking.id))) })] }) })] })] }))] }));
};
export default AnalyticsPage;
