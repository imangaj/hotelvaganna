import LanguageSelector from "../components/LanguageSelector";
import { guestPortalCopy } from "./guestPortalCopy";
import "./GuestPortal.css";
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
  const copy = guestPortalCopy[language];
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
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
    setBookingsError("");
    try {
      const res = await guestAuthAPI.getBookings(guestToken);
      if (localStorage.getItem("guestToken") === guestToken) setBookings(res.data || []);
    } catch (error: any) {
      if (localStorage.getItem("guestToken") !== guestToken) return;
      if (error.response?.status === 401) {
        localStorage.removeItem("guestToken");
        setToken(null);
        setBookings([]);
        setAuthError(copy.expired);
      } else {
        setBookingsError(copy.loadFailed);
      }
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      guestAuthAPI.me(token).then(({ data }) => {
        if (localStorage.getItem("guestToken") !== token) return;
        setEmail(data.email || "");
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setPhone(data.phone || "");
      }).catch((error) => {
        if (localStorage.getItem("guestToken") !== token) return;
        if (error.response?.status === 401) {
          setToken(null);
          setBookings([]);
          setAuthError(copy.expired);
        }
      });
      loadBookings(token);
    }
  }, [token]);

  useEffect(() => {
    const expired = () => {
      setToken(null);
      setBookings([]);
      setAuthError(guestPortalCopy[language].expired);
    };
    const changed = (event: StorageEvent) => {
      if (event.key === "guestToken") {
        setToken(localStorage.getItem("guestToken"));
        setBookings([]);
      }
    };
    window.addEventListener("guest-session-expired", expired);
    window.addEventListener("storage", changed);
    return () => {
      window.removeEventListener("guest-session-expired", expired);
      window.removeEventListener("storage", changed);
    };
  }, [language]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) return;
    setAuthError("");

    if (!email || !password) {
      setAuthError(copy.required);
      return;
    }

    if (authMode === "register" && (!firstName || !lastName || !phone)) {
      setAuthError(copy.nameRequired);
      return;
    }

    setAuthLoading(true);
    try {
      const res = authMode === "login"
        ? await guestAuthAPI.login({ email: email.trim(), password })
        : await guestAuthAPI.register({ email: email.trim(), password, firstName, lastName, phone });

      const newToken = res.data?.token;
      const guestProfile = res.data?.guest;
      if (!newToken) {
        setAuthError(copy.authFailed);
        return;
      }
      localStorage.setItem("guestToken", newToken);
      setBookings([]);
      setToken(newToken);
      setPassword("");
      if (guestProfile) {
        setFirstName(guestProfile.firstName || "");
        setLastName(guestProfile.lastName || "");
        setPhone(guestProfile.phone || "");
      }
    } catch (error: any) {
      setAuthError(error.response?.status === 409 ? (language === "it" ? "Account già esistente. Accedi o reimposta la password." : language === "zh" ? "账户已存在，请登录或重置密码。" : "An account already exists. Sign in or reset your password.") : copy.authFailed);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("guestToken");
    setToken(null);
    setBookings([]);
    setAuthError("");
    setBookingsError("");
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === "it" ? "it-IT" : language === "zh" ? "zh-CN" : "en-GB", { timeZone: "Europe/Rome" });

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
    return email || copy.guest;
  }, [bookings, email, firstName, lastName, copy.guest]);

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
    return <div className="guest-portal min-h-screen flex items-center justify-center" role="status">{copy.loading}</div>;
  }

  return (
    <div className="guest-portal min-h-screen text-gray-800">
      <header className="guest-header">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-bold text-lg" style={{ color: profile?.primaryColor || "#2E5D4B" }}>
            {title}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <LanguageSelector />
            <a href="/" className="text-gray-600 hover:text-gray-900">{copy.back}</a>
            {isLoggedIn && (
              <button onClick={handleLogout} className="text-red-600 hover:text-red-700">{copy.logout}</button>
            )}
          </div>
        </div>
      </header>

      <main className="guest-main max-w-5xl mx-auto px-6 py-10">
        {!isLoggedIn ? (
          <section className="guest-auth-layout">
            <aside className="guest-welcome">
              <div className="guest-eyebrow">MILANO · {title}</div>
              <h1>{copy.intro}</h1>
              <p>{copy.subtitle}</p>
              <ul><li>{copy.benefit1}</li><li>{copy.benefit2}</li><li>{copy.benefit3}</li></ul>
              <a href="/">{copy.newBooking} <span aria-hidden="true">↗</span></a>
            </aside>
            <div className="guest-auth-card">
            <h2 className="text-2xl font-bold mb-2">{copy.loginTitle}</h2>
            <p className="text-sm text-gray-500 mb-6">
              {copy.sameEmail}
            </p>

            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 py-2 rounded ${authMode === "login" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {copy.login}
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`flex-1 py-2 rounded ${authMode === "register" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {copy.register}
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === "register" && (
                <>
                  <div>
                    <label htmlFor="guest-first-name" className="block text-xs font-semibold uppercase text-gray-500 mb-1">{copy.firstName}</label>
                    <input
                      type="text" id="guest-first-name" autoComplete="given-name" required
                      className="w-full border rounded px-3 py-2"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="guest-last-name" className="block text-xs font-semibold uppercase text-gray-500 mb-1">{copy.lastName}</label>
                    <input
                      type="text" id="guest-last-name" autoComplete="family-name" required
                      className="w-full border rounded px-3 py-2"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="guest-phone" className="block text-xs font-semibold uppercase text-gray-500 mb-1">{copy.phone}</label>
                    <input
                      type="tel"
                      id="guest-phone"
                      autoComplete="tel"
                      required
                      className="w-full border rounded px-3 py-2"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="guest-email" className="block text-xs font-semibold uppercase text-gray-500 mb-1">{copy.email}</label>
                <input
                  type="email"
                  id="guest-email"
                  autoComplete="email"
                  required
                  className="w-full border rounded px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="guest-password" className="block text-xs font-semibold uppercase text-gray-500 mb-1">{copy.password}</label>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  required
                  id="guest-password"
                  className="w-full border rounded px-3 py-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-between gap-4">
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs underline">{showPassword ? copy.hide : copy.show}</button>
                <a href="/guest/forgot-password" className="text-xs text-blue-600 hover:underline">{copy.forgot}</a>
              </div>
              {authError && <div role="alert" className="text-red-600 text-sm">{authError}</div>}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2 rounded text-white font-semibold"
                style={{ background: profile?.primaryColor || "#2E5D4B" }}
              >
                {authLoading ? copy.busy : authMode === "login" ? copy.login : copy.register}
              </button>
            </form>
          </div>
          </section>
        ) : (
          <div className="guest-reservations">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <div className="text-sm text-gray-500">{copy.welcome}</div>
                <h2 className="text-2xl font-bold">{guestName}</h2>
              </div>
              <button
                onClick={() => token && loadBookings(token)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {copy.refresh}
              </button>
            </div>

            <a href="/" className="guest-new-stay">{copy.newBooking} ↗</a>
            {bookingsError && <p role="alert" className="text-red-600 mb-4">{bookingsError}</p>}
            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => setReservationFilter("upcoming")}
                className={`px-3 py-2 text-sm rounded ${reservationFilter === "upcoming" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                {copy.upcoming}
              </button>
              <button
                type="button"
                onClick={() => setReservationFilter("past")}
                className={`px-3 py-2 text-sm rounded ${reservationFilter === "past" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                {copy.past}
              </button>
            </div>

            {bookingsLoading ? (
              <div className="bg-white p-6 rounded-lg">{copy.loadingBookings}</div>
            ) : bookingsError ? null : (reservationFilter === "upcoming" ? upcomingReservations : pastReservations).length === 0 ? (
              <div className="bg-white p-6 rounded-lg">
                {reservationFilter === "upcoming"
                  ? copy.noUpcoming
                  : copy.noPast}
              </div>
            ) : (
              <div className="space-y-4">
                {(reservationFilter === "upcoming" ? upcomingReservations : pastReservations).map((booking) => {
                  const guestNotes = parseGuestNotes(booking.notes);
                  return (
                  <div key={booking.id} className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-500">{copy.reservation}</div>
                        <div className="text-lg font-semibold">{booking.bookingNumber || `#${booking.id}`}</div>
                      </div>
                      <div className="text-sm text-gray-600">{copy.bookedOn} {formatDate(booking.createdAt)}</div>
                      <button
                        onClick={() => handlePrint(booking)}
                        className="px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                      >
                        {copy.receipt}
                      </button>
                    </div>

                    <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                      {guestNotes.checkIn && (
                        <div>
                          <div className="text-gray-500">{copy.checkInName}</div>
                          <div className="font-medium">{guestNotes.checkIn}</div>
                        </div>
                      )}
                      {guestNotes.additional && (
                        <div>
                          <div className="text-gray-500">{copy.additional}</div>
                          <div className="font-medium">{guestNotes.additional}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-gray-500">{copy.guest}</div>
                        <div className="font-medium">
                          {(booking.guest?.firstName || booking.guest?.lastName)
                            ? `${booking.guest?.firstName || ""} ${booking.guest?.lastName || ""}`.trim()
                            : guestName}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">{copy.dates}</div>
                        <div className="font-medium">{formatDate(booking.checkInDate)} — {formatDate(booking.checkOutDate)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">{copy.room}</div>
                        <div className="font-medium">{booking.room?.roomType || copy.room}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">{copy.guests}</div>
                        <div className="font-medium">{booking.numberOfGuests}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">{copy.extras}</div>
                        <div className="font-medium">
                          {booking.breakfastCount > 0 ? `${copy.breakfast} ×${booking.breakfastCount}` : copy.noBreakfast}
                          {booking.parkingIncluded ? ` + ${copy.parking}` : ""}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">{copy.total}</div>
                        <div className="font-medium">€{booking.totalPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">{copy.status}</div>
                        <div className="font-medium">{{ CONFIRMED: copy.confirmed, CANCELLED: copy.cancelled, CHECKED_IN: copy.checkedIn, CHECKED_OUT: copy.checkedOut }[booking.bookingStatus] || booking.bookingStatus}</div>
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
