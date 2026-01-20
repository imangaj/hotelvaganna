import React, { useState, useEffect } from "react";
import { bookingAPI, propertyAPI, roomAPI } from "../api/endpoints";
import { useLanguage } from "../contexts/LanguageContext";

const AnalyticsPage: React.FC = () => {
  const { t } = useLanguage();
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
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
    } catch (err: any) {
      setError(t("analytics_error_load_properties"));
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (propertyId: number) => {
    try {
      setLoading(true);
      setError("");
      const response = await bookingAPI.getByProperty(propertyId);
      setBookings(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("analytics_error_load"));
    } finally {
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
    const sources: { [key: string]: number } = {};
    bookings.forEach(booking => {
      sources[booking.source] = (sources[booking.source] || 0) + booking.totalPrice;
    });
    return sources;
  };

  const getBookingsByStatus = () => {
    const statuses: { [key: string]: number } = {};
    bookings.forEach(booking => {
      statuses[booking.bookingStatus] = (statuses[booking.bookingStatus] || 0) + 1;
    });
    return statuses;
  };

  const metrics = calculateMetrics();
  const revenueBySource = getRevenueBySource();
  const bookingsByStatus = getBookingsByStatus();

  if (loading && properties.length === 0) {
    return <div className="loading">{t("analytics_loading")}</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t("analytics_title")}</h2>
        <div className="header-actions">
          {properties.length > 0 && (
            <select
              value={selectedProperty || ""}
              onChange={(e) => setSelectedProperty(Number(e.target.value))}
              className="property-select"
            >
              <option value="">{t("analytics_select_property")}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {selectedProperty && (
        <>
          <div className="date-range-filter">
            <div className="filter-group">
              <label htmlFor="startDate">{t("analytics_from")}</label>
              <input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="endDate">{t("analytics_to")}</label>
              <input
                type="date"
                id="endDate"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">💰</div>
              <div className="metric-content">
                <h3>{t("analytics_total_revenue")}</h3>
                <p className="metric-value">${metrics.totalRevenue.toFixed(2)}</p>
                <p className="metric-label">{t("analytics_all_bookings")}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📅</div>
              <div className="metric-content">
                <h3>{t("analytics_confirmed_bookings")}</h3>
                <p className="metric-value">{metrics.confirmedBookings}</p>
                <p className="metric-label">{t("analytics_active_reservations")}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🏠</div>
              <div className="metric-content">
                <h3>{t("analytics_occupied_rooms")}</h3>
                <p className="metric-value">{metrics.occupiedRooms}</p>
                <p className="metric-label">{t("analytics_currently_checked_in")}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">✅</div>
              <div className="metric-content">
                <h3>{t("analytics_checked_out")}</h3>
                <p className="metric-value">{metrics.checkedOutBookings}</p>
                <p className="metric-label">{t("analytics_completed_stays")}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📊</div>
              <div className="metric-content">
                <h3>{t("analytics_avg_booking_value")}</h3>
                <p className="metric-value">${metrics.avgBookingValue.toFixed(2)}</p>
                <p className="metric-label">{t("analytics_per_reservation")}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📈</div>
              <div className="metric-content">
                <h3>{t("analytics_total_bookings")}</h3>
                <p className="metric-value">{metrics.totalBookings}</p>
                <p className="metric-label">{t("analytics_in_period")}</p>
              </div>
            </div>
          </div>

          <div className="reports-grid">
            <div className="report-card">
              <h3>{t("analytics_revenue_by_source")}</h3>
              <div className="report-content">
                {Object.entries(revenueBySource).map(([source, revenue]) => (
                  <div key={source} className="report-row">
                    <span>{source}</span>
                    <span className="report-value">${revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-card">
              <h3>{t("analytics_bookings_by_status")}</h3>
              <div className="report-content">
                {Object.entries(bookingsByStatus).map(([status, count]) => (
                  <div key={status} className="report-row">
                    <span>{status}</span>
                    <span className="report-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="report-card full-width">
            <h3>{t("analytics_recent_bookings")}</h3>
            <div className="table-container">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>{t("analytics_table_id")}</th>
                    <th>{t("analytics_table_room")}</th>
                    <th>{t("analytics_table_check_in")}</th>
                    <th>{t("analytics_table_check_out")}</th>
                    <th>{t("analytics_table_total_price")}</th>
                    <th>{t("analytics_table_status")}</th>
                    <th>{t("analytics_table_source")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 10).map((booking) => (
                    <tr key={booking.id}>
                      <td>#{booking.id}</td>
                      <td>{booking.room?.roomNumber}</td>
                      <td>{new Date(booking.checkInDate).toLocaleDateString()}</td>
                      <td>{new Date(booking.checkOutDate).toLocaleDateString()}</td>
                      <td>${booking.totalPrice.toFixed(2)}</td>
                      <td>
                        <span className={`badge badge-${booking.bookingStatus === "CONFIRMED" ? "success" : "info"}`}>
                          {booking.bookingStatus}
                        </span>
                      </td>
                      <td>{booking.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
