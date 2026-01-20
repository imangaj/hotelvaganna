import React, { useState, useEffect } from "react";
import { bookingAPI, guestAPI } from "../api/endpoints";
import "../styles/BookingForm.css";

interface BookingFormProps {
  propertyId: number;
  roomId: number;
  onSubmit: (booking: any) => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  propertyId,
  roomId,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    guestFirstName: "",
    guestLastName: "",
    guestEmail: "",
    guestPhone: "",
    checkInDate: "",
    checkOutDate: "",
    numberOfGuests: 1,
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const guestRes = await guestAPI.create({
        firstName: formData.guestFirstName,
        lastName: formData.guestLastName,
        email: formData.guestEmail,
        phone: formData.guestPhone,
      });

      const booking = await bookingAPI.create({
        propertyId,
        roomId,
        guestId: guestRes.data?.id,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        numberOfGuests: parseInt(formData.numberOfGuests.toString()),
        totalPrice: 0, // Calculate based on pricing
        source: "DIRECT_WEBSITE",
        notes: formData.notes,
      });

      onSubmit(booking.data);
      setFormData({
        guestFirstName: "",
        guestLastName: "",
        guestEmail: "",
        guestPhone: "",
        checkInDate: "",
        checkOutDate: "",
        numberOfGuests: 1,
        notes: "",
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <h3>Create Booking</h3>

      <div className="form-row">
        <div className="form-group">
          <label>First Name</label>
          <input
            type="text"
            name="guestFirstName"
            value={formData.guestFirstName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Last Name</label>
          <input
            type="text"
            name="guestLastName"
            value={formData.guestLastName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="guestEmail"
            value={formData.guestEmail}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            name="guestPhone"
            value={formData.guestPhone}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Check-in Date</label>
          <input
            type="date"
            name="checkInDate"
            value={formData.checkInDate}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Check-out Date</label>
          <input
            type="date"
            name="checkOutDate"
            value={formData.checkOutDate}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Number of Guests</label>
        <input
          type="number"
          name="numberOfGuests"
          value={formData.numberOfGuests}
          onChange={handleChange}
          min="1"
          required
        />
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? "Creating Booking..." : "Create Booking"}
      </button>
    </form>
  );
};

export default BookingForm;
