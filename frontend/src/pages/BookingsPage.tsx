import React, { useState, useEffect } from "react";
import { bookingAPI, propertyAPI, roomAPI, guestAPI, hotelProfileAPI } from "../api/endpoints";
import { useLanguage } from "../contexts/LanguageContext";
import { buildReservationReceiptHtml } from "../utils/receipt";

interface Booking {
  id: number;
  bookingNumber?: string;
  propertyId: number;
  roomId: number;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalPrice: number;
  paidAmount?: number;
  bookingStatus: string;
  paymentStatus: string;
  source: string;
  breakfastCount?: number;
  parkingIncluded?: boolean;
  notes?: string;
  property?: any;
  room?: { roomNumber?: string; roomType?: string; breakfastPrice?: number };
  guest?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  createdAt?: string;
}

interface Room {
  id: number;
  propertyId: number;
  roomNumber: string;
  roomType: string;
  maxGuests: number;
  basePrice: number;
  status: string;
  description?: string;
  breakfastIncluded?: boolean;
  breakfastPrice?: number;
}

const BookingsPage: React.FC = () => {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hotelProfile, setHotelProfile] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<number | "">("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
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
      const [bookingsRes, propertiesRes, profileRes] = await Promise.all([
        bookingAPI.getAll(),
        propertyAPI.getAll(),
        hotelProfileAPI.get().catch(() => ({ data: null })),
      ]);
      setBookings(bookingsRes.data || []);
      setProperties(propertiesRes.data || []);
      setHotelProfile(profileRes.data || null);
      if (propertiesRes.data?.length && !selectedProperty) {
        setSelectedProperty(propertiesRes.data[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load bookings:", err);
      setError(err.response?.data?.message || t("bk_error_load_bookings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProperty) {
      loadRooms(Number(selectedProperty));
    }
  }, [selectedProperty]);

  const loadRooms = async (propertyId: number) => {
    try {
      setLoading(true);
      const response = await roomAPI.getByProperty(propertyId);
      setRooms(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t("bk_error_load_rooms"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBookingRoom = async (bookingId: number, newRoomId: number) => {
    try {
      setLoading(true);
      await bookingAPI.updateStatus(bookingId, undefined, undefined, newRoomId);
      setEditingRoomId(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || t("bk_error_update_room"));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    id: number,
    bookingStatus?: string,
    paymentStatus?: string
  ) => {
    try {
      setLoading(true);
      await bookingAPI.updateStatus(id, bookingStatus, paymentStatus);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || t("bk_error_update_status"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (id: number) => {
    if (!window.confirm(t("bk_confirm_cancel"))) {
      return;
    }

    try {
      setLoading(true);
      await bookingAPI.cancel(id);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || t("bk_error_cancel_booking"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async (id: number) => {
    if (!window.confirm("Delete this reservation permanently?")) {
      return;
    }
    try {
      setLoading(true);
      await bookingAPI.deletePermanent(id);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete booking.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const CITY_TAX_PER_PERSON_PER_NIGHT = 2;

  const handlePrintReceipt = (booking: Booking) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = buildReservationReceiptHtml({
      booking,
      profile: hotelProfile,
      cityTaxPerPersonPerNight: CITY_TAX_PER_PERSON_PER_NIGHT,
    });

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const toDateKey = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });

  const getStatusBadgeClass = (status: string) => {
    const statusMap: { [key: string]: string } = {
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

  const getBookingStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      CONFIRMED: t("bk_confirmed"),
      PENDING: t("bk_pending"),
      CHECKED_IN: t("bk_checked_in"),
      CHECKED_OUT: t("bk_checked_out"),
      CANCELLED: t("bk_cancelled"),
    };
    return labels[status] || status;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      PENDING: t("payment_pending"),
      PARTIAL: t("payment_partial"),
      PAID: t("payment_paid"),
      REFUNDED: t("payment_refunded"),
    };
    return labels[status] || status;
  };

  const getReservationRole = (source: string) => {
    if (/booking|expedia|airbnb|ota/i.test(source)) return "OTA";
    if (/walk|phone/i.test(source)) return "Walk-in / Phone";
    return "Direct";
  };

  const handleManualInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setManualForm((prev) => ({
      ...prev,
      [name]: name === "numberOfGuests" ? Number(value) : value,
    }));
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      setError(err.response?.data?.message || t("bk_error_create_booking"));
    } finally {
      setLoading(false);
    }
  };

  const getRoomStatusForDate = (room: Room) => {
    if (room.status === "MAINTENANCE") return "MAINTENANCE";
    if (room.status === "OUT_OF_SERVICE") return "OUT_OF_SERVICE";
    if (room.status === "CLEANING") return "CLEANING";

    const targetKey = toDateKey(selectedDate);
    const hasBooking = bookings.some((booking) => {
      if (booking.roomId !== room.id) return false;
      if (!["CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus)) return false;
      const checkIn = toDateKey(booking.checkInDate);
      const checkOut = toDateKey(booking.checkOutDate);
      return targetKey >= checkIn && targetKey < checkOut;
    });

    return hasBooking ? "OCCUPIED" : "AVAILABLE";
  };

  const getRoomStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
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
    return <div className="loading">{t("bk_loading")}</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{t("bk_title")}</h2>
        <div className="filter-group">
          <label htmlFor="propertyFilter">{t("bk_property")}</label>
          <select
            id="propertyFilter"
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(Number(e.target.value))}
            className="filter-select"
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <label htmlFor="dateFilter">{t("bk_date")}</label>
          <input
            id="dateFilter"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="filter-select"
          />
          <label htmlFor="statusFilter">{t("bk_filter_status")}</label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t("bk_all_bookings")}</option>
            <option value="CONFIRMED">{t("bk_confirmed")}</option>
            <option value="PENDING">{t("bk_pending")}</option>
            <option value="CHECKED_IN">{t("bk_checked_in")}</option>
            <option value="CHECKED_OUT">{t("bk_checked_out")}</option>
            <option value="CANCELLED">{t("bk_cancelled")}</option>
          </select>
          <label htmlFor="searchFilter">Search</label>
          <input
            id="searchFilter"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-select"
            placeholder="Search all columns"
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {filteredBySearch.length === 0 ? (
        <div className="empty-state">
          <p>{t("bk_no_bookings")}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>{t("bk_table_id")}</th>
                <th>{t("bk_table_first_name")}</th>
                <th>{t("bk_table_last_name")}</th>
                <th>{t("bk_table_room")}</th>
                <th>{t("bk_table_room_type")}</th>
                <th>{t("bk_table_check_in")}</th>
                <th>{t("bk_table_check_out")}</th>
                <th>{t("bk_table_created_at")}</th>
                <th>{t("bk_table_guests")}</th>
                <th>{t("bk_table_total_price")}</th>
                <th>{t("bk_table_booking_status")}</th>
                <th>{t("bk_table_payment_status")}</th>
                <th>Role</th>
                <th>{t("bk_table_source")}</th>
                <th>{t("bk_table_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredBySearch.map((booking) => (
                <tr key={booking.id}>
                  <td>#{booking.id}</td>
                  <td>{booking.guest?.firstName || "-"}</td>
                  <td>{booking.guest?.lastName || "-"}</td>
                  <td>
                    {editingRoomId === booking.id ? (
                      <select
                        autoFocus
                        onBlur={(e) => {
                          if (e.target.value !== String(booking.roomId)) {
                            handleUpdateBookingRoom(booking.id, Number(e.target.value));
                          } else {
                            setEditingRoomId(null);
                          }
                        }}
                        defaultValue={booking.roomId}
                        onChange={(e) => handleUpdateBookingRoom(booking.id, Number(e.target.value))}
                        className="p-1 border rounded text-sm"
                      >
                        {rooms
                          .filter(r => r.propertyId === booking.propertyId)
                          .map(room => (
                            <option key={room.id} value={room.id}>
                              {room.roomNumber} ({room.roomType})
                            </option>
                          ))
                        }
                      </select>
                    ) : (
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded group"
                        onClick={() => setEditingRoomId(booking.id)}
                        title={t("bk_click_change_room")}
                      >
                        <span>{booking.room?.roomNumber || `${t("bk_table_room")} ${booking.roomId}`}</span>
                        <span className="text-gray-400 opacity-0 group-hover:opacity-100 text-xs">✎</span>
                      </div>
                    )}
                  </td>
                  <td>{booking.room?.roomType || "-"}</td>
                  <td>{formatDate(booking.checkInDate)}</td>
                  <td>{formatDate(booking.checkOutDate)}</td>
                  <td>{booking.createdAt ? formatDate(booking.createdAt) : "-"}</td>
                  <td>{booking.numberOfGuests}</td>
                  <td>${booking.totalPrice.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(booking.bookingStatus)}`}>
                      {getBookingStatusLabel(booking.bookingStatus)}
                    </span>
                  </td>
                  <td>
                    {editingPaymentId === booking.id ? (
                      <select
                        autoFocus
                        defaultValue={booking.paymentStatus}
                        onBlur={() => setEditingPaymentId(null)}
                        onChange={(e) => {
                          handleStatusUpdate(booking.id, undefined, e.target.value);
                          setEditingPaymentId(null);
                        }}
                        className="p-1 border rounded text-xs"
                      >
                         <option value="PENDING">{t("payment_pending")}</option>
                         <option value="PARTIAL">{t("payment_partial")}</option>
                         <option value="PAID">{t("payment_paid")}</option>
                         <option value="REFUNDED">{t("payment_refunded")}</option>
                      </select>
                    ) : (
                      <span 
                        className={`badge ${getStatusBadgeClass(booking.paymentStatus)} cursor-pointer hover:opacity-80`}
                        onClick={() => setEditingPaymentId(booking.id)}
                        title={t("bk_click_update_payment")}
                      >
                        {getPaymentStatusLabel(booking.paymentStatus)} ✎
                      </span>
                    )}
                  </td>
                  <td>{getReservationRole(booking.source)}</td>
                  <td>{booking.source}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handlePrintReceipt(booking)}
                      >
                        Receipt
                      </button>
                      {booking.bookingStatus === "PENDING" && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() =>
                            handleStatusUpdate(booking.id, "CONFIRMED", booking.paymentStatus)
                          }
                        >
                          {t("bk_action_confirm")}
                        </button>
                      )}
                      {booking.bookingStatus === "CONFIRMED" && (
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() =>
                            handleStatusUpdate(booking.id, "CHECKED_IN", booking.paymentStatus)
                          }
                        >
                          {t("bk_action_check_in")}
                        </button>
                      )}
                      {booking.bookingStatus === "CHECKED_IN" && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() =>
                            handleStatusUpdate(booking.id, "CHECKED_OUT", booking.paymentStatus)
                          }
                        >
                          {t("bk_action_check_out")}
                        </button>
                      )}
                      {booking.bookingStatus !== "CANCELLED" && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleCancelBooking(booking.id)}
                        >
                          {t("bk_action_cancel")}
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteBooking(booking.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="stats-summary">
        <div className="stat-card">
          <h4>{t("bk_stats_total_bookings")}</h4>
          <p className="stat-value">{bookings.length}</p>
        </div>
        <div className="stat-card">
          <h4>{t("bk_stats_confirmed")}</h4>
          <p className="stat-value">
            {bookings.filter((b) => b.bookingStatus === "CONFIRMED").length}
          </p>
        </div>
        <div className="stat-card">
          <h4>{t("bk_stats_checked_in")}</h4>
          <p className="stat-value">
            {bookings.filter((b) => b.bookingStatus === "CHECKED_IN").length}
          </p>
        </div>
        <div className="stat-card">
          <h4>{t("bk_stats_total_revenue")}</h4>
          <p className="stat-value">
            ${bookings.reduce((sum, b) => sum + b.totalPrice, 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingsPage;
