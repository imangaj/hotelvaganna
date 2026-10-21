import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BedDouble, Check, CalendarDays, Mail, Phone, Printer, RefreshCw, ChevronLeft } from "lucide-react";
import { guestAuthAPI, hotelProfileAPI } from "../api/endpoints";
import { printReservationReceipt } from "../utils/receipt";
import { useLanguage } from "../contexts/LanguageContext";
import { guestPortalCopy } from "./guestPortalCopy";
import { hotelCopy } from "./hotelCopy";
import { HotelFrame, RoomPhoto } from "./HotelFrame";
import { roomImage, safeReturnPath } from "./hotelMedia";

type Booking = {
  id: number; bookingNumber?: string; checkInDate: string; checkOutDate: string; numberOfGuests: number;
  totalPrice: number; paidAmount: number; paymentStatus: string; bookingStatus: string; breakfastCount: number;
  parkingIncluded: boolean; createdAt: string; notes?: string;
  guest?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  room?: { roomNumber?: string; roomType?: string; roomTypeId?: number; description?: string };
  property?: { name?: string; address?: string; city?: string; country?: string; phone?: string; email?: string };
};
const GuestPortal: React.FC = () => {
  const { language } = useLanguage(); const auth = guestPortalCopy[language]; const t = hotelCopy[language];
  const location = useLocation(); const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("guestToken"));
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", phone: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(!!token);
  const [historyError, setHistoryError] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const bookingId = Number(location.pathname.match(/\/reservations\/(\d+)/)?.[1]);
  const booking = bookings.find(item => item.id === bookingId);
  const confirmed = params.has("confirmed");
  const confirmedIds = (params.get("confirmed") || "").split(",").map(Number);
  const returnTo = safeReturnPath(params.get("returnTo"));
  const locale = language === "it" ? "it-IT" : language === "zh" ? "zh-CN" : "en-GB";
  const money = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(amount);
  const date = (value: string) => new Date(value).toLocaleDateString(locale, { timeZone: "Europe/Rome", day: "numeric", month: "short", year: "numeric" });
  const guestName = [form.firstName, form.lastName].filter(Boolean).join(" ") || form.email;
  const nights = (item: Booking) => Math.max(1, Math.round((Date.parse(item.checkOutDate) - Date.parse(item.checkInDate)) / 86400000));
  const stateLabel = (state: string) => ({ CONFIRMED: t.statusConfirmed, CANCELLED: t.cancelled, CHECKED_IN: t.checkedIn, CHECKED_OUT: t.checkedOut, PAID: t.paid, PENDING: t.pending, PARTIAL: t.partial }[state] || state);
  const localized = (value: any, fallback = "") => typeof value === "string" ? value : value?.[language] || value?.en || fallback;

  useEffect(() => { hotelProfileAPI.get().then(({ data }) => setProfile(data)).catch(() => {}); }, []);
  useEffect(() => {
    const expired = () => { setToken(null); setBookings([]); setError(auth.expired); setLoading(false); };
    const changed = (event: StorageEvent) => { if (event.key === "guestToken" || event.key === null) { setToken(localStorage.getItem("guestToken")); setBookings([]); } };
    window.addEventListener("guest-session-expired", expired);
    window.addEventListener("storage", changed);
    return () => { window.removeEventListener("guest-session-expired", expired); window.removeEventListener("storage", changed); };
  }, [auth.expired]);

  const load = async (savedToken: string) => {
    setLoading(true); setHistoryError(false);
    try {
      const [guest, history] = await Promise.all([guestAuthAPI.me(savedToken), guestAuthAPI.getBookings(savedToken)]);
      if (localStorage.getItem("guestToken") !== savedToken) return;
      setForm(previous => ({ ...previous, ...guest.data, password: "" }));
      setBookings(history.data || []);
    } catch (failure: any) {
      if (localStorage.getItem("guestToken") !== savedToken) return;
      if (failure.response?.status === 401) {
        localStorage.removeItem("guestToken"); setToken(null); setBookings([]); setError(auth.expired);
      } else setHistoryError(true);
    } finally { if (localStorage.getItem("guestToken") === savedToken) setLoading(false); }
  };
  useEffect(() => { if (token) load(token); else setLoading(false); }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return; setError(""); setBusy(true);
    try {
      const data = { ...form, email: form.email.trim() };
      const result = mode === "login" ? await guestAuthAPI.login(data) : await guestAuthAPI.register(data);
      if (!result.data?.token) throw new Error();
      localStorage.setItem("guestToken", result.data.token);
      setBookings([]); setToken(result.data.token); setForm(previous => ({ ...previous, ...result.data.guest, password: "" }));
      if (returnTo) navigate(returnTo);
    } catch (failure: any) {
      setError(failure.response?.status === 409 ? (language === "it" ? "Account già esistente. Accedi o reimposta la password." : language === "zh" ? "账户已存在，请登录或重置密码。" : "An account already exists. Sign in or reset your password.") : auth.authFailed);
    } finally { setBusy(false); }
  };
  const logout = () => { localStorage.removeItem("guestToken"); setToken(null); setBookings([]); setForm({ email: "", password: "", firstName: "", lastName: "", phone: "" }); setError(""); navigate("/guest"); };
  const print = async (item: Booking) => {
    try {
      await printReservationReceipt({
        booking: item, profile, language,
        cityTaxPerPersonPerNight: Number(profile?.contentJson?.receipt?.cityTaxPerPersonPerNight || 0),
        rulesTitle: localized(profile?.contentJson?.i18n?.rules?.title, profile?.contentJson?.rules?.title || t.rules),
        rulesContent: localized(profile?.contentJson?.i18n?.rules?.content, profile?.contentJson?.rules?.content || profile?.policies || ""),
      });
    } catch { setError(t.error); }
  };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const displayed = bookings.filter(item => {
    if (confirmedIds.includes(item.id)) return true;
    const checkoutDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.checkOutDate));
    return filter === "upcoming" ? checkoutDay >= today : checkoutDay < today;
  }).sort((a,b) => Number(confirmedIds.includes(b.id)) - Number(confirmedIds.includes(a.id)));

  return <HotelFrame profile={profile}>
    <main className="hx-container hx-guest-page">
      {!token ? <section className="hx-guest-auth hx-reveal">
        <aside className="hx-guest-auth-visual"><RoomPhoto src="/banner.png" name={profile?.name || "Hotel Valganna"} eager/><div className="hx-guest-auth-visual-shade"/><div><p className="hx-eyebrow">MILANO · HOTEL VALGANNA</p><h1>{auth.intro}</h1><p>{auth.subtitle}</p></div></aside>
        <div className="hx-guest-auth-form"><p className="hx-eyebrow">{t.account}</p><h2>{mode === "login" ? auth.loginTitle : auth.register}</h2><p>{auth.sameEmail}</p>
          <div className="hx-tabs" role="tablist"><button role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>{auth.login}</button><button role="tab" aria-selected={mode === "register"} onClick={() => { setMode("register"); setError(""); }}>{auth.register}</button></div>
          <form onSubmit={submit}>
            {mode === "register" && (["firstName","lastName","phone"] as const).map(key => <div className="hx-field" key={key}><label htmlFor={"guest-" + key}>{auth[key]}</label><input id={"guest-" + key} autoComplete={key === "firstName" ? "given-name" : key === "lastName" ? "family-name" : "tel"} type={key === "phone" ? "tel" : "text"} required value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}/></div>)}
            <div className="hx-field"><label htmlFor="guest-email">{auth.email}</label><input id="guest-email" type="email" autoComplete="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></div>
            <div className="hx-field"><label htmlFor="guest-password">{auth.password}</label><input id="guest-password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></div>
            <div className="hx-password-tools"><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? auth.hide : auth.show}</button><Link to="/guest/forgot-password">{auth.forgot}</Link></div>
            {error && <p className="hx-alert" role="alert">{error}</p>}
            <button className="hx-button" disabled={busy} type="submit">{busy ? auth.busy : mode === "login" ? auth.login : auth.register}<ArrowRight size={17}/></button>
          </form>
        </div>
      </section> : loading ? <div className="hx-loading" role="status"><span className="hx-loader"/>{auth.loadingBookings}</div> :
      historyError ? <div className="hx-loading"><p role="alert">{auth.loadFailed}</p><button className="hx-button" onClick={() => token && load(token)}>{t.retry}</button></div> :
      bookingId ? booking ? <>
        <div className="hx-guest-welcome"><Link className="hx-text-link" to="/guest"><ChevronLeft size={16}/>{t.backToStays}</Link><button className="hx-button hx-button-outline" onClick={() => print(booking)}><Printer size={17}/>{t.print}</button></div>
        {confirmed && <div className="hx-confirmed-banner" role="status"><Check size={30}/><div><h2>{t.confirmed}</h2><p>{t.welcome}</p></div></div>}
        <section className="hx-reservation-hero"><RoomPhoto src={roomImage(booking.room?.roomType)} name={booking.room?.roomType} eager/><div className="hx-reservation-hero-shade"/><div className="hx-reservation-hero-content"><span className={"hx-status " + (booking.bookingStatus === "CANCELLED" ? "hx-cancelled" : "")}><Check size={12}/>{stateLabel(booking.bookingStatus)}</span><h1>{booking.room?.roomType || t.yourRoom}</h1><p className="hx-eyebrow">{t.reservation} {booking.bookingNumber || "#" + booking.id}</p></div></section>
        {error && <p className="hx-alert" role="alert">{error}</p>}
        <div className="hx-reservation-detail-grid"><div>
          <section className="hx-detail-panel"><p className="hx-eyebrow">{t.bookingDate} {date(booking.createdAt)}</p><h2>{t.summary}</h2><dl>
            <div><dt>{t.checkIn}</dt><dd>{date(booking.checkInDate)}{profile?.checkInTime && <small> · {profile.checkInTime}</small>}</dd></div>
            <div><dt>{t.checkOut}</dt><dd>{date(booking.checkOutDate)}{profile?.checkOutTime && <small> · {profile.checkOutTime}</small>}</dd></div>
            <div><dt>{t.guests}</dt><dd>{booking.numberOfGuests} · {nights(booking)} {t.nights}</dd></div>
            <div><dt>{t.details}</dt><dd>{[booking.guest?.firstName, booking.guest?.lastName].filter(Boolean).join(" ") || guestName}</dd></div>
            <div><dt>{auth.email}</dt><dd>{booking.guest?.email}</dd></div><div><dt>{auth.phone}</dt><dd>{booking.guest?.phone || "—"}</dd></div>
            {booking.breakfastCount > 0 && <div><dt>{t.breakfast}</dt><dd>{booking.breakfastCount} {t.people}</dd></div>}
            {booking.parkingIncluded && <div><dt>{t.parking}</dt><dd>{t.statusConfirmed}</dd></div>}
          </dl>{booking.room?.description && <p style={{ marginTop: 24 }}>{booking.room.description}</p>}{booking.room?.roomTypeId && <Link className="hx-text-link" to={"/rooms/" + booking.room.roomTypeId}>{t.roomDescription}<ArrowUpRight size={16}/></Link>}</section>
          <section className="hx-detail-panel"><h2>{t.hotelInfo}</h2><p>{profile?.name || booking.property?.name}<br/>{profile?.address || booking.property?.address}<br/>{profile?.city || booking.property?.city}</p>{profile?.policies && <p>{profile.policies}</p>}<Link to="/policies" className="hx-text-link">{t.rules}<ArrowUpRight size={15}/></Link></section>
        </div><aside><section className="hx-detail-panel"><p className="hx-eyebrow">{stateLabel(booking.paymentStatus)}</p><h2>{t.payment}</h2><div className="hx-detail-totals"><div><span>{t.stayTotal}</span><span>{money(booking.totalPrice)}</span></div><div><span>{t.paid}</span><span>{money(booking.paidAmount || 0)}</span></div><div><span>{t.balance}</span><span>{money(Math.max(0, booking.totalPrice - (booking.paidAmount || 0)))}</span></div></div><p className="hx-fine">{t.tax}</p><button className="hx-button" onClick={() => print(booking)}><Printer size={17}/>{t.print}</button></section><section className="hx-detail-panel hx-help"><h2>{t.bookingHelp}</h2><p>{t.welcome}</p><a className="hx-text-link" href={"mailto:" + (profile?.email || "hotel.valganna@libero.it")}><Mail size={15}/>{t.contact}</a>{profile?.phone && <p><a href={"tel:" + profile.phone}><Phone size={14}/> {profile.phone}</a></p>}</section></aside></div>
      </> : <div className="hx-empty"><p>{t.notFound}</p><Link className="hx-button" to="/guest">{t.backToStays}</Link></div> :
      <>
        <div className="hx-guest-welcome"><div><p className="hx-eyebrow">{auth.welcome}{guestName ? " · " + guestName : ""}</p><h1>{t.reservations}</h1></div><div className="hx-guest-actions"><Link className="hx-button" to="/booking">{t.book}<ArrowUpRight size={16}/></Link><button className="hx-text-link" onClick={logout}>{t.logout}</button></div></div>
        {confirmed && <div className="hx-confirmed-banner" role="status"><Check size={30}/><div><h2>{t.confirmed}</h2><p>{t.welcome}</p></div></div>}
        <div className="hx-tabs" role="tablist"><button role="tab" aria-selected={filter === "upcoming"} onClick={() => setFilter("upcoming")}>{t.upcoming}</button><button role="tab" aria-selected={filter === "past"} onClick={() => setFilter("past")}>{t.past}</button><button aria-label={t.refresh} onClick={() => token && load(token)}><RefreshCw size={16}/></button></div>
        {!displayed.length ? <div className="hx-empty"><BedDouble size={40}/><h2>{t.empty}</h2><p>{t.emptyNote}</p><Link to="/booking" className="hx-button">{t.book}<ArrowRight size={17}/></Link></div> : displayed.map(item => <article key={item.id} className="hx-reservation-card hx-reveal">
          <RoomPhoto src={roomImage(item.room?.roomType)} name={item.room?.roomType}/>
          <div className="hx-reservation-card-content"><div className="hx-reservation-card-top"><p className="hx-eyebrow">{item.bookingNumber || "#" + item.id}</p><span className={"hx-status " + (item.bookingStatus === "CANCELLED" ? "hx-cancelled" : "")}>{stateLabel(item.bookingStatus)}</span></div><h2>{item.room?.roomType || t.yourRoom}</h2>
            <div className="hx-reservation-facts"><div><small>{t.checkIn}</small>{date(item.checkInDate)}</div><div><small>{t.checkOut}</small>{date(item.checkOutDate)}</div><div><small>{t.guests}</small>{item.numberOfGuests} · {nights(item)} {t.nights}</div></div>
            <div className="hx-reservation-card-bottom"><div><small className="hx-fine">{t.stayTotal}</small><strong>{money(item.totalPrice)}</strong></div><Link className="hx-button" to={"/guest/reservations/" + item.id}>{t.viewReservation}<ArrowRight size={17}/></Link><button className="hx-text-link" onClick={() => print(item)} aria-label={t.print}><Printer size={17}/></button></div>
          </div>
        </article>)}
      </>}
    </main>
  </HotelFrame>;
};
export default GuestPortal;
