import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { bookingAPI, guestAPI } from "../api/endpoints";
import "../styles/BookingForm.css";
export const BookingForm = ({ propertyId, roomId, onSubmit, }) => {
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
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };
    const handleSubmit = async (e) => {
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
        }
        catch (err) {
            setError(err.response?.data?.message || "Failed to create booking");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("form", { className: "booking-form", onSubmit: handleSubmit, children: [_jsx("h3", { children: "Create Booking" }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "First Name" }), _jsx("input", { type: "text", name: "guestFirstName", value: formData.guestFirstName, onChange: handleChange, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Last Name" }), _jsx("input", { type: "text", name: "guestLastName", value: formData.guestLastName, onChange: handleChange, required: true })] })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Email" }), _jsx("input", { type: "email", name: "guestEmail", value: formData.guestEmail, onChange: handleChange, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Phone" }), _jsx("input", { type: "tel", name: "guestPhone", value: formData.guestPhone, onChange: handleChange })] })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Check-in Date" }), _jsx("input", { type: "date", name: "checkInDate", value: formData.checkInDate, onChange: handleChange, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Check-out Date" }), _jsx("input", { type: "date", name: "checkOutDate", value: formData.checkOutDate, onChange: handleChange, required: true })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Number of Guests" }), _jsx("input", { type: "number", name: "numberOfGuests", value: formData.numberOfGuests, onChange: handleChange, min: "1", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Notes" }), _jsx("textarea", { name: "notes", value: formData.notes, onChange: handleChange, rows: 3 })] }), error && _jsx("div", { className: "error-message", children: error }), _jsx("button", { type: "submit", disabled: loading, className: "submit-btn", children: loading ? "Creating Booking..." : "Create Booking" })] }));
};
export default BookingForm;
