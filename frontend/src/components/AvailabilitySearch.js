import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
export const AvailabilitySearch = ({ onSearch, }) => {
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [guests, setGuests] = useState(1);
    const [loading, setLoading] = useState(false);
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!checkIn || !checkOut) {
            alert("Please select both check-in and check-out dates");
            return;
        }
        setLoading(true);
        try {
            // Simulate search - in real app, call API
            const mockResults = [
                {
                    id: 1,
                    roomNumber: "101",
                    type: "Deluxe Room",
                    price: 150,
                    guests: 2,
                },
                {
                    id: 2,
                    roomNumber: "102",
                    type: "Suite",
                    price: 200,
                    guests: 4,
                },
            ];
            onSearch(mockResults);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "availability-search", children: [_jsx("h2", { children: "Find Available Rooms" }), _jsxs("form", { onSubmit: handleSearch, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Check-in Date" }), _jsx("input", { type: "date", value: checkIn, onChange: (e) => setCheckIn(e.target.value), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Check-out Date" }), _jsx("input", { type: "date", value: checkOut, onChange: (e) => setCheckOut(e.target.value), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Number of Guests" }), _jsx("input", { type: "number", min: "1", max: "10", value: guests, onChange: (e) => setGuests(parseInt(e.target.value)), required: true })] }), _jsx("button", { type: "submit", disabled: loading, children: loading ? "Searching..." : "Search Availability" })] })] }));
};
export default AvailabilitySearch;
