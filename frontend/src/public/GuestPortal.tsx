import React, { useEffect, useMemo, useState } from "react";
import { guestAuthAPI, hotelProfileAPI } from "../api/endpoints";
import { buildReservationReceiptHtml } from "../utils/receipt";
import { useLanguage } from "../contexts/LanguageContext";

interface Booking {
  id: number;
  bookingNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalPrice: number;
  paidAmount: number;
  paymentStatus: string;
  bookingStatus: string;
  breakfastCount: number;
  parkingIncluded: boolean;
  createdAt: string;
  notes?: string;
  guest?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  room?: { roomNumber?: string; roomType?: string };
  property?: { name?: string; address?: string; city?: string; country?: string; phone?: string; email?: string };
}

const GuestPortal: React.FC = () => {
  const { language } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [authError, setAuthError] = useState("");
  const [token, setToken] = useState<string | null>(localStorage.getItem("guestToken"));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [reservationFilter, setReservationFilter] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await hotelProfileAPI.get();
        setProfile(res.data || null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const isLoggedIn = !!token;

  const loadBookings = async (guestToken: string) => {
    setBookingsLoading(true);
    try {
      const res = await guestAuthAPI.getBookings(guestToken);
      setBookings(res.data || []);
    } catch (error) {
      console.error(error);
      setAuthError("Failed to load your bookings. Please login again.");
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadBookings(token);
    }
  }, [token]);

  const handleAuth = async (e: React.FormEvent) => {
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
    } catch (error: any) {
      setAuthError(error.response?.data?.message || "Login failed.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("guestToken");
    setToken(null);
    setBookings([]);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });

  const parseGuestNotes = (notes?: string) => {
    if (!notes) return { checkIn: "", additional: "" };
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

  const handlePrint = (booking: Booking) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rulesTitle = profile?.contentJson?.i18n?.rules?.title?.[language]
      || profile?.contentJson?.rules?.title
      || "Hotel Rules";
    const rulesContent = profile?.contentJson?.i18n?.rules?.content?.[language]
      || profile?.contentJson?.rules?.content
      || profile?.policies
      || "";
    const cityTax = Number(profile?.contentJson?.receipt?.cityTaxPerPersonPerNight ?? 7.4);

    const html = buildReservationReceiptHtml({
      booking,
      profile,
      language,
      cityTaxPerPersonPerNight: isNaN(cityTax) ? 0 : cityTax,
      rulesTitle,
      rulesContent,
    });

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const title = useMemo(() => profile?.websiteTitle || profile?.name || "Guest Portal", [profile]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-bold text-lg" style={{ color: profile?.primaryColor || "#2E5D4B" }}>
            {title}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" className="text-gray-600 hover:text-gray-900">Back to website</a>
            {isLoggedIn && (
              <button onClick={handleLogout} className="text-red-600 hover:text-red-700">Logout</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {!isLoggedIn ? (
          <div className="bg-white p-6 rounded-lg shadow-sm max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-2">Guest Login</h2>
            <p className="text-sm text-gray-500 mb-6">
              Use the same email you used for your reservation. You can book without an account and create one later.
            </p>

            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 py-2 rounded ${authMode === "login" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`flex-1 py-2 rounded ${authMode === "register" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === "register" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">First Name</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Last Name</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full border rounded px-3 py-2"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Password</label>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <a href="/guest/forgot-password" className="text-xs text-blue-600 hover:underline">Forgot Password?</a>
              </div>
              {authError && <div className="text-red-600 text-sm">{authError}</div>}
              <button
                type="submit"
                className="w-full py-2 rounded text-white font-semibold"
                style={{ background: profile?.primaryColor || "#2E5D4B" }}
              >
                {authMode === "login" ? "Login" : "Create Account"}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <div className="text-sm text-gray-500">Welcome</div>
                <h2 className="text-2xl font-bold">{guestName}</h2>
              </div>
              <button
                onClick={() => token && loadBookings(token)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Refresh
              </button>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => setReservationFilter("upcoming")}
                className={`px-3 py-2 text-sm rounded ${reservationFilter === "upcoming" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                To Check In / Upcoming
              </button>
              <button
                type="button"
                onClick={() => setReservationFilter("past")}
                className={`px-3 py-2 text-sm rounded ${reservationFilter === "past" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                Past
              </button>
            </div>

            {bookingsLoading ? (
              <div className="bg-white p-6 rounded-lg">Loading reservations...</div>
            ) : (reservationFilter === "upcoming" ? upcomingReservations : pastReservations).length === 0 ? (
              <div className="bg-white p-6 rounded-lg">
                {reservationFilter === "upcoming"
                  ? "No upcoming reservations found."
                  : "No past reservations found."}
              </div>
            ) : (
              <div className="space-y-4">
                {(reservationFilter === "upcoming" ? upcomingReservations : pastReservations).map((booking) => {
                  const guestNotes = parseGuestNotes(booking.notes);
                  return (
                  <div key={booking.id} className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-500">Reservation</div>
                        <div className="text-lg font-semibold">{booking.bookingNumber || `#${booking.id}`}</div>
                      </div>
                      <div className="text-sm text-gray-600">Booked on {formatDate(booking.createdAt)}</div>
                      <button
                        onClick={() => handlePrint(booking)}
                        className="px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                      >
                        Receipt
                      </button>
                    </div>

                    <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                      {guestNotes.checkIn && (
                        <div>
                          <div className="text-gray-500">Check-in Name</div>
                          <div className="font-medium">{guestNotes.checkIn}</div>
                        </div>
                      )}
                      {guestNotes.additional && (
                        <div>
                          <div className="text-gray-500">Additional Guests</div>
                          <div className="font-medium">{guestNotes.additional}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-gray-500">Guest</div>
                        <div className="font-medium">
                          {(booking.guest?.firstName || booking.guest?.lastName)
                            ? `${booking.guest?.firstName || ""} ${booking.guest?.lastName || ""}`.trim()
                            : guestName}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Dates</div>
                        <div className="font-medium">{formatDate(booking.checkInDate)} — {formatDate(booking.checkOutDate)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Room</div>
                        <div className="font-medium">{booking.room?.roomType || "Room"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Guests</div>
                        <div className="font-medium">{booking.numberOfGuests}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Extras</div>
                        <div className="font-medium">
                          {booking.breakfastCount > 0 ? `Breakfast x${booking.breakfastCount}` : "No breakfast"}
                          {booking.parkingIncluded ? " + Parking" : ""}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Total</div>
                        <div className="font-medium">€{booking.totalPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Status</div>
                        <div className="font-medium">{booking.bookingStatus}</div>
                      </div>
                    </div>

                    {booking.property && (
                      <div className="mt-4 text-xs text-gray-500">
                        {booking.property.name} · {booking.property.city || ""} {booking.property.country || ""}
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default GuestPortal;
