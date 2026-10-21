import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CalendarDays, Users, BedDouble, Check, ShieldCheck, Coffee, Car, ChevronLeft, MapPin } from "lucide-react";
import apiClient from "../api/apiClient";
import { useLanguage } from "../contexts/LanguageContext";
import { HotelFrame, RoomPhoto } from "./HotelFrame";
import { hotelCopy } from "./hotelCopy";
import { localDate, roomImage } from "./hotelMedia";

type RoomType = { id: number; name: string; description?: string; maxGuests: number };
type AvailableRoom = RoomType & { roomTypeId: number; totalPrice: number; availableCount: number; breakfastAvailable: boolean; assignableRoomIds: number[] };
type Search = { checkIn: string; checkOut: string; guests: number; rooms: number };
const localeFor = (language: string) => language === "it" ? "it-IT" : language === "zh" ? "zh-CN" : "en-GB";

const SearchForm: React.FC<{ value: Search; onChange: (value: Search) => void; onSubmit: () => void; busy?: boolean }> = ({ value, onChange, onSubmit, busy }) => {
  const { language } = useLanguage(); const t = hotelCopy[language];
  return <form className="hx-search" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
    <label><span><CalendarDays size={14}/>{t.checkIn}</span><input aria-label={t.checkIn} type="date" value={value.checkIn} min={localDate()} required onChange={e => onChange({ ...value, checkIn: e.target.value })}/></label>
    <label><span><CalendarDays size={14}/>{t.checkOut}</span><input aria-label={t.checkOut} type="date" value={value.checkOut} min={value.checkIn || localDate()} required onChange={e => onChange({ ...value, checkOut: e.target.value })}/></label>
    <label><span><Users size={14}/>{t.guests}</span><select aria-label={t.guests} value={value.guests} onChange={e => onChange({ ...value, guests: +e.target.value })}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i+1}>{i+1}</option>)}</select></label>
    <label><span><BedDouble size={14}/>{t.roomCount}</span><select aria-label={t.roomCount} value={value.rooms} onChange={e => onChange({ ...value, rooms: +e.target.value })}>{[1,2,3,4,5].map(i => <option key={i}>{i}</option>)}</select></label>
    <button className="hx-button" disabled={busy} type="submit">{busy ? t.searching : t.search}<ArrowRight size={18}/></button>
  </form>;
};

const PublicSite: React.FC = () => {
  const { language } = useLanguage(); const t = hotelCopy[language]; const locale = localeFor(language);
  const location = useLocation(); const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [profile, setProfile] = useState<any>(null);
  const [catalogue, setCatalogue] = useState<RoomType[]>([]);
  const [catalogueError, setCatalogueError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState<Search>({ checkIn: params.get("checkIn") || localDate(), checkOut: params.get("checkOut") || localDate(1), guests: +(params.get("guests") || 2), rooms: +(params.get("rooms") || 1) });
  const [results, setResults] = useState<AvailableRoom[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [guest, setGuest] = useState<any>(null);
  const [guestChecking, setGuestChecking] = useState(false);
  const [selected, setSelected] = useState<AvailableRoom | null>(null);
  const [step, setStep] = useState(1);
  const [breakfast, setBreakfast] = useState(false);
  const [parking, setParking] = useState(false);
  const [checkInName, setCheckInName] = useState("");
  const [additionalNames, setAdditionalNames] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmedIds, setConfirmedIds] = useState<number[]>([]);
  const finalizing = useRef("");
  const requestNumber = useRef(0);
  const isBooking = location.pathname === "/booking";
  const isRooms = location.pathname.startsWith("/rooms");
  const roomId = Number(location.pathname.split("/")[2]);
  const detailRoom = catalogue.find(room => room.id === roomId);
  const isPolicy = location.pathname === "/policies";
  const localized = (value: any, fallback = "") => typeof value === "string" ? value : value?.[language] || value?.en || fallback;
  const title = localized(profile?.contentJson?.i18n?.websiteTitle, profile?.websiteTitle || profile?.name || "Hotel Valganna");
  const rules = localized(profile?.contentJson?.i18n?.rules?.content, profile?.contentJson?.rules?.content || profile?.policies || "");
  const money = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(amount);
  const date = (value: string) => new Date(value + "T12:00:00").toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  const nights = Math.max(1, Math.round((Date.parse(search.checkOut) - Date.parse(search.checkIn)) / 86400000) || 1);
  const breakfastPrice = 7;
  const parkingPrice = 20;
  const roomTotal = (selected?.totalPrice || 0) * search.rooms;
  const breakfastTotal = breakfast && selected?.breakfastAvailable ? breakfastPrice * search.guests * nights : 0;
  const parkingTotal = parking ? parkingPrice * nights : 0;
  const total = roomTotal + breakfastTotal + parkingTotal;
  const confirmationPath = confirmedIds.length === 1 ? "/guest/reservations/" + confirmedIds[0] + "?confirmed=1" : "/guest?confirmed=" + confirmedIds.join(",");

  useEffect(() => {
    let active = true;
    Promise.allSettled([apiClient.get("/hotel-profile"), apiClient.get("/public/room-types", { params: { propertyId: 1 } })]).then(([hotel, rooms]) => {
      if (!active) return;
      if (hotel.status === "fulfilled") setProfile(hotel.value.data);
      if (rooms.status === "fulfilled") setCatalogue(rooms.value.data || []); else setCatalogueError(true);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("guestToken");
    if (!token) { setGuest(null); return; }
    setGuestChecking(true);
    apiClient.get("/guest-auth/me", { headers: { Authorization: "Bearer " + token } }).then(({ data }) => {
      if (active && localStorage.getItem("guestToken") === token) { setGuest(data); setCheckInName([data.firstName, data.lastName].filter(Boolean).join(" ")); }
    }).catch(() => { if (active) setGuest(null); }).finally(() => { if (active) setGuestChecking(false); });
    const expired = () => { setGuest(null); setPaying(false); };
    window.addEventListener("guest-session-expired", expired);
    return () => { active = false; window.removeEventListener("guest-session-expired", expired); };
  }, [location.pathname]);

  const validSearch = (value: Search) => /^\d{4}-\d{2}-\d{2}$/.test(value.checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(value.checkOut) && value.checkIn >= localDate() && value.checkOut > value.checkIn && value.guests >= value.rooms && value.rooms >= 1 && value.rooms <= 5 && value.guests <= 12;
  const queryFor = (value: Search) => new URLSearchParams({ checkIn: value.checkIn, checkOut: value.checkOut, guests: String(value.guests), rooms: String(value.rooms) }).toString();
  const findRooms = async (value: Search) => {
    const sequence = ++requestNumber.current;
    if (!validSearch(value)) { setError(t.datesError); setSearching(false); return; }
    setSearching(true); setSearched(false); setError(""); setSelected(null); setStep(1);
    try {
      const response = await apiClient.get("/public/search", { params: { propertyId: 1, ...value } });
      if (requestNumber.current !== sequence) return;
      const available = (response.data || []).filter((room: AvailableRoom) => room.availableCount >= value.rooms);
      setResults(available);
      const wanted = Number(new URLSearchParams(window.location.search).get("room_type"));
      const match = available.find((room: AvailableRoom) => room.roomTypeId === wanted);
      if (match) { setSelected(match); setStep(2); }
    } catch { if (requestNumber.current === sequence) setError(t.error); }
    finally { if (requestNumber.current === sequence) { setSearching(false); setSearched(true); } }
  };
  useEffect(() => {
    if (!isBooking || params.has("session_id")) return;
    const value = { checkIn: params.get("checkIn") || localDate(), checkOut: params.get("checkOut") || localDate(1), guests: +(params.get("guests") || 2), rooms: +(params.get("rooms") || 1) };
    setSearch(value); findRooms(value);
  }, [isBooking, location.search]);
  const submitSearch = () => {
    if (!validSearch(search)) { setError(t.datesError); return; }
    const next = "/booking?" + queryFor(search);
    if (location.pathname + location.search === next) findRooms(search); else navigate(next);
  };

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (params.get("stripe") === "cancel") { setError(t.cancelledPayment); setPaying(false); return; }
    if (!sessionId || params.get("stripe") !== "success" || finalizing.current === sessionId) return;
    finalizing.current = sessionId;
    const finish = async () => {
      setConfirming(true); setError("");
      try {
        const raw = sessionStorage.getItem("pendingBooking");
        if (!raw) throw new Error("Booking details are unavailable. Contact reception with your payment reference.");
        const pending = JSON.parse(raw);
        setSearch({ checkIn: pending.checkIn, checkOut: pending.checkOut, guests: pending.guests, rooms: pending.roomCount });
        const token = localStorage.getItem("guestToken");
        if (!token) throw new Error(t.loginRequired);
        const verify = await apiClient.get("/payments/verify-session", { params: { session_id: sessionId } });
        if (verify.data?.status !== "paid") throw new Error(t.error);
        const ids: number[] = [];
        for (let i = 0; i < pending.roomCount; i++) {
          const count = Math.floor(pending.guests / pending.roomCount) + (i === 0 ? pending.guests % pending.roomCount : 0);
          const bookingTotal = pending.roomPrice + (pending.wantsBreakfast ? pending.PRICE_BREAKFAST * count * pending.nights : 0) + (pending.wantsParking && i === 0 ? pending.PRICE_PARKING * pending.nights : 0);
          const result = await apiClient.post("/bookings", {
            guestId: pending.guestId, propertyId: pending.propertyId, roomId: pending.roomIds[i],
            checkInDate: pending.checkIn, checkOutDate: pending.checkOut, numberOfGuests: count,
            breakfastCount: pending.wantsBreakfast ? count : 0, parkingIncluded: pending.wantsParking && i === 0,
            source: "website", totalPrice: bookingTotal, paidAmount: bookingTotal,
            checkoutKey: sessionId + ":" + pending.roomIds[i],
            notes: [pending.checkInName ? "Check-in guest: " + pending.checkInName : "", pending.additionalGuestNames ? "Additional guests: " + pending.additionalGuestNames : ""].filter(Boolean).join(" | "),
          }, { headers: { Authorization: "Bearer " + token } });
          ids.push(result.data.id);
        }
        setConfirmedIds(ids);
        sessionStorage.removeItem("pendingBooking");
        window.history.replaceState({}, document.title, "/booking");
      } catch (error: any) {
        setError(error.message || t.error);
      } finally { setConfirming(false); }
    };
    finish();
  }, [location.search]);
  useEffect(() => {
    if (!confirmedIds.length) return;
    const timer = window.setTimeout(() => navigate(confirmationPath), 4500);
    return () => window.clearTimeout(timer);
  }, [confirmedIds, confirmationPath, navigate]);

  const startPayment = async () => {
    if (paying || !selected || !guest) return;
    const token = localStorage.getItem("guestToken");
    if (!token) { setGuest(null); return; }
    if (!checkInName.trim() || !accepted) { setError(t.nameRequired); return; }
    if (selected.assignableRoomIds.length < search.rooms) { setError(t.noRooms); return; }
    setPaying(true); setError("");
    const pending = {
      guestId: guest.guestId, guestDetails: guest, checkInName: checkInName.trim(), additionalGuestNames: additionalNames.trim(),
      checkIn: search.checkIn, checkOut: search.checkOut, roomTypeName: selected.name, roomCount: search.rooms, guests: search.guests,
      wantsBreakfast: breakfast && selected.breakfastAvailable, wantsParking: parking,
      roomIds: selected.assignableRoomIds.slice(0, search.rooms), propertyId: 1, roomPrice: selected.totalPrice,
      PRICE_BREAKFAST: breakfastPrice, PRICE_PARKING: parkingPrice, nights,
    };
    try {
      sessionStorage.setItem("pendingBooking", JSON.stringify(pending));
      const response = await apiClient.post("/payments/checkout-session", {
        amount: total, currency: "eur", customerEmail: guest.email,
        description: selected.name + " × " + search.rooms + " (" + search.checkIn + " – " + search.checkOut + ")",
      }, { headers: { Authorization: "Bearer " + token } });
      if (!response.data?.url) throw new Error(t.error);
      window.location.assign(response.data.url);
    } catch { setError(t.error); setPaying(false); }
  };

  const catalogueCards = (items: RoomType[]) => items.map(room => <article className="hx-catalogue-card hx-reveal" key={room.id}>
    <Link className="hx-photo-link" to={"/rooms/" + room.id}><RoomPhoto src={roomImage(room.name)} name={room.name}/><span className="hx-photo-arrow"><ArrowUpRight size={22}/></span></Link>
    <div><span className="hx-eyebrow">{t.upTo} {room.maxGuests} {t.people}</span><h3><Link to={"/rooms/" + room.id}>{room.name}</Link></h3><p>{room.description || t.roomFallback}</p><Link className="hx-text-link" to={"/rooms/" + room.id}>{t.discover}<ArrowRight size={16}/></Link></div>
  </article>);

  const summary = selected && <aside className="hx-booking-summary">
    <RoomPhoto src={roomImage(selected.name)} name={selected.name}/>
    <div><p className="hx-eyebrow">{t.summary}</p><h3>{selected.name}</h3><p>{date(search.checkIn)} — {date(search.checkOut)}</p><p>{nights} {t.nights} · {search.guests} {t.people} · {search.rooms} {t.roomCount.toLowerCase()}</p>
      <dl><div><dt>{t.yourRoom}</dt><dd>{money(roomTotal)}</dd></div>{breakfastTotal > 0 && <div><dt>{t.breakfast}</dt><dd>{money(breakfastTotal)}</dd></div>}{parkingTotal > 0 && <div><dt>{t.parking}</dt><dd>{money(parkingTotal)}</dd></div>}<div className="hx-summary-total"><dt>{t.stayTotal}</dt><dd>{money(total)}</dd></div></dl><p className="hx-fine">{t.tax}</p>
    </div>
  </aside>;

  if (loading) return <HotelFrame><main className="hx-container hx-loading" role="status"><span className="hx-loader"/>{t.loading}</main></HotelFrame>;
  return <HotelFrame profile={profile}>
    {confirmedIds.length ? <main className="hx-success hx-container" aria-live="polite"><span className="hx-success-icon"><Check size={40}/></span><p className="hx-eyebrow">{t.statusConfirmed}</p><h1>{t.confirmed}</h1><p>{t.welcome}</p><p className="hx-fine">{t.emailPending}</p><Link to={confirmationPath} className="hx-button">{t.viewReservation}<ArrowRight size={18}/></Link><p className="hx-fine">{t.redirect}</p></main> :
    confirming ? <main className="hx-success hx-container" role="status"><span className="hx-loader"/><h1>{t.confirming}</h1></main> :
    isBooking ? <main className="hx-container hx-booking-page">
      <div className="hx-page-heading"><p className="hx-eyebrow">{title} · MILANO</p><h1>{t.choose}</h1></div>
      <SearchForm value={search} onChange={setSearch} onSubmit={submitSearch} busy={searching}/>
      <ol className="hx-steps">{[t.yourRoom, t.details, t.payment].map((label, i) => <li key={i} className={step >= i+1 ? "active" : ""}><span>{i+1}</span>{label}</li>)}</ol>
      {error && <div className="hx-alert" role="alert">{error}<button onClick={() => { if (params.has("session_id")) window.location.reload(); else findRooms(search); }}>{t.retry}</button></div>}
      {searching ? <div className="hx-results-layout" aria-busy="true" role="status"><div><p className="hx-eyebrow">{t.searching}</p>{[1,2,3].map(i => <div key={i} className="hx-skeleton-card"><div className="hx-shimmer"/><div><span className="hx-shimmer"/><span className="hx-shimmer"/><span className="hx-shimmer"/></div></div>)}</div></div> :
      selected && step > 1 ? <div className="hx-results-layout"><section className="hx-checkout hx-reveal">
        <button className="hx-text-link" onClick={() => { setStep(1); setSelected(null); setError(""); }}><ChevronLeft size={16}/>{t.back}</button>
        {guestChecking ? <p role="status">{t.loading}</p> : !guest ? <div className="hx-login-prompt"><ShieldCheck size={32}/><h2>{t.loginRequired}</h2><p>{t.loginNote}</p><Link className="hx-button" to={"/guest?returnTo=" + encodeURIComponent("/booking?" + queryFor(search) + "&room_type=" + selected.roomTypeId)}>{t.loginRequired}<ArrowRight size={18}/></Link></div> :
        step === 2 ? <form onSubmit={e => { e.preventDefault(); if (!accepted || !checkInName.trim()) { setError(t.nameRequired); return; } setError(""); setStep(3); }}>
          <p className="hx-eyebrow">02 · {t.details}</p><h2>{t.extras}</h2>
          <p className="hx-account-email">{guest.firstName} {guest.lastName} · {guest.email}</p>
          <div className="hx-field"><label htmlFor="check-in-name">{t.checkInName}</label><input id="check-in-name" required autoComplete="name" value={checkInName} onChange={e => setCheckInName(e.target.value)}/></div>
          <div className="hx-field"><label htmlFor="additional-names">{t.additional}</label><input id="additional-names" value={additionalNames} onChange={e => setAdditionalNames(e.target.value)}/></div>
          {selected.breakfastAvailable && <label className="hx-extra"><Coffee/><span>{t.breakfast}<small>{money(breakfastPrice)} / {t.people} / {t.nights}</small></span><input type="checkbox" checked={breakfast} onChange={e => setBreakfast(e.target.checked)}/></label>}
          <label className="hx-extra"><Car/><span>{t.parking}<small>{money(parkingPrice)} / {t.nights}</small></span><input type="checkbox" checked={parking} onChange={e => setParking(e.target.checked)}/></label>
          <details className="hx-rules"><summary>{t.rules}</summary><p>{rules || t.roomFallback}</p></details>
          <label className="hx-accept"><input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)}/><span>{t.accept}</span></label>
          <button type="submit" className="hx-button">{t.continue}<ArrowRight size={18}/></button>
        </form> : <div><p className="hx-eyebrow">03 · {t.payment}</p><h2>{t.payment}</h2><div className="hx-payment-note"><ShieldCheck size={32}/><p>{t.stripe}</p><div className="hx-card-brands">VISA · Mastercard · AMEX</div></div><div className="hx-checkout-actions"><button className="hx-button hx-button-outline" onClick={() => setStep(2)}>{t.back}</button><button className="hx-button" disabled={paying} onClick={startPayment}>{paying ? t.loading : t.pay}<ArrowRight size={18}/></button></div></div>}
      </section>{summary}</div> :
      <div className="hx-results-layout"><section aria-label={t.availability}><div className="hx-section-top"><h2>{t.availability}</h2><span className="hx-fine">{results.length} {t.rooms.toLowerCase()}</span></div>{searched && !results.length && !error && <div className="hx-empty"><BedDouble size={38}/><h2>{t.noRooms}</h2><a href={"mailto:" + (profile?.email || "hotel.valganna@libero.it")} className="hx-text-link">{t.contact}<ArrowUpRight size={16}/></a></div>}
        {results.map(room => <article key={room.roomTypeId} className="hx-result-card hx-reveal">
          <Link className="hx-result-photo" to={"/rooms/" + room.roomTypeId}><RoomPhoto src={roomImage(room.name)} name={room.name}/></Link>
          <div className="hx-result-info"><p className="hx-eyebrow"><Users size={13}/>{t.upTo} {room.maxGuests} {t.people}</p><h2>{room.name}</h2><p>{room.description || t.roomFallback}</p><Link className="hx-text-link" to={"/rooms/" + room.roomTypeId}>{t.discover}<ArrowUpRight size={15}/></Link><div className="hx-result-price"><div><small>{t.stayTotal} · {search.rooms} {t.roomCount.toLowerCase()}</small><strong>{money(room.totalPrice * search.rooms)}</strong><small>{nights} {t.nights} · {search.guests} {t.people}</small></div><button className="hx-button" onClick={() => { setSelected(room); setStep(2); setAccepted(false); setBreakfast(false); setParking(false); setError(""); window.scrollTo({ top: 240, behavior: "smooth" }); }}>{t.select}<ArrowRight size={17}/></button></div></div>
        </article>)}
      </section><aside className="hx-stay-note"><MapPin size={24}/><h3>{title}</h3><p>{profile?.address}<br/>{profile?.city}</p><hr/><p>{t.tax}</p><Link to="/policies" className="hx-text-link">{t.rules}<ArrowUpRight size={15}/></Link></aside></div>}
    </main> :
    isRooms ? <main className="hx-container hx-catalogue-page">
      <div className="hx-page-heading"><p className="hx-eyebrow">MILANO · {t.rooms}</p><h1>{detailRoom ? detailRoom.name : t.intro}</h1><p>{detailRoom ? detailRoom.description || t.roomFallback : t.roomIntro}</p></div>
      {catalogueError && <div role="alert" className="hx-alert">{t.error}<button onClick={() => window.location.reload()}>{t.retry}</button></div>}
      {roomId && !detailRoom && !catalogueError ? <p>{t.error}</p> : detailRoom ? <>
        <RoomPhoto className="hx-room-detail-hero" src={roomImage(detailRoom.name)} name={detailRoom.name} eager/>
        <div className="hx-room-detail-body"><section><p className="hx-eyebrow">{t.upTo} {detailRoom.maxGuests} {t.people}</p><h2>{detailRoom.name}</h2><p>{detailRoom.description || t.roomFallback}</p><p>{t.tax}</p><Link className="hx-text-link" to="/rooms"><ChevronLeft size={16}/>{t.rooms}</Link></section><aside><h3>{t.book}</h3><p>{t.roomFallback}</p><Link className="hx-button" to={"/booking?room_type=" + detailRoom.id}>{t.search}<ArrowRight size={18}/></Link></aside></div>
      </> : <div className="hx-catalogue-grid">{catalogueCards(catalogue)}</div>}
    </main> :
    isPolicy ? <main className="hx-container hx-policy"><p className="hx-eyebrow">{title}</p><h1>{t.rules}</h1><p>{rules || t.roomFallback}</p><Link to="/booking" className="hx-button">{t.book}<ArrowRight size={18}/></Link></main> :
    <>
      <section className="hx-hero"><RoomPhoto className="hx-hero-image" src={profile?.contentJson?.hero?.image || "/banner.png"} name={title} eager/><div className="hx-hero-shade"/><div className="hx-hero-content"><p className="hx-eyebrow">{t.eyebrow}</p><h1>{localized(profile?.contentJson?.i18n?.hero?.title, t.hero)}</h1><p>{localized(profile?.contentJson?.i18n?.hero?.subtitle, profile?.contentJson?.hero?.subtitle || t.roomIntro)}</p><Link className="hx-hero-link" to="/rooms">{t.viewRooms}<ArrowUpRight size={19}/></Link></div><span className="hx-hero-caption">45°30′ N · 9°09′ E</span></section>
      <div className="hx-container hx-home-search"><SearchForm value={search} onChange={setSearch} onSubmit={submitSearch}/>{error && <p className="hx-alert" role="alert">{error}</p>}</div>
      <main>
        <section className="hx-container hx-home-intro"><p className="hx-eyebrow">MILANO, CON CALMA.</p><div><h2>{localized(profile?.contentJson?.i18n?.about?.title, profile?.contentJson?.about?.title || t.intro)}</h2><p>{localized(profile?.contentJson?.i18n?.about?.content, profile?.contentJson?.about?.content || profile?.description || t.roomIntro)}</p></div></section>
        <section className="hx-container hx-home-rooms"><div className="hx-section-top"><div><p className="hx-eyebrow">{t.rooms}</p><h2>{t.intro}</h2></div><Link className="hx-text-link" to="/rooms">{t.viewRooms}<ArrowUpRight size={17}/></Link></div>{catalogueError ? <div className="hx-alert">{t.error}</div> : <div className="hx-catalogue-grid">{catalogueCards(catalogue.slice(0,3))}</div>}</section>
        <section className="hx-arrival"><div className="hx-container"><div><p className="hx-eyebrow">{t.address}</p><h2>{t.welcome}</h2><p>{profile?.address} · {profile?.city || "Milano"}</p><p>{t.roomIntro}</p><a className="hx-button hx-button-outline" href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([profile?.name, profile?.address, profile?.city].filter(Boolean).join(" "))} target="_blank" rel="noreferrer">{t.address}<ArrowUpRight size={18}/></a></div><RoomPhoto src="/banner.png" name={title}/></div></section>
      </main>
    </>}
  </HotelFrame>;
};
export default PublicSite;
