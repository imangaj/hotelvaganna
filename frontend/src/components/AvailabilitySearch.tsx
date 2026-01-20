import { useState, useEffect } from "react";

interface Booking {
  id: number;
  roomId: number;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalPrice: number;
  bookingStatus: string;
}

interface Room {
  id: number;
  roomNumber: string;
  roomType: {
    name: string;
    maxGuests: number;
    basePrice: number;
  };
}

interface AvailabilitySearchProps {
  onSearch: (results: any[]) => void;
}

export const AvailabilitySearch: React.FC<AvailabilitySearchProps> = ({
  onSearch,
}) => {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="availability-search">
      <h2>Find Available Rooms</h2>
      <form onSubmit={handleSearch}>
        <div className="form-group">
          <label>Check-in Date</label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Check-out Date</label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Number of Guests</label>
          <input
            type="number"
            min="1"
            max="10"
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value))}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search Availability"}
        </button>
      </form>
    </div>
  );
};

export default AvailabilitySearch;
