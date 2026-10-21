import { roomImage } from "../public/hotelMedia";
import { hotelCopy } from "../public/hotelCopy";
import { hotelCompany } from "../public/hotelCompany";

type BookingLike = {
  id: number; bookingNumber?: string; checkInDate: string; checkOutDate: string; numberOfGuests: number;
  totalPrice: number; paidAmount?: number; bookingStatus?: string; paymentStatus?: string; source?: string;
  breakfastCount?: number; parkingIncluded?: boolean; createdAt?: string;
  guest?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  room?: { roomNumber?: string; roomType?: string; breakfastPrice?: number };
  property?: { name?: string; address?: string; city?: string; country?: string; phone?: string; email?: string };
  notes?: string;
};
type ProfileLike = { name?: string; address?: string; city?: string; country?: string; phone?: string; email?: string; logoUrl?: string; contentJson?: any; policies?: string; checkInTime?: string; checkOutTime?: string };
type ReceiptOptions = {
  booking: BookingLike; profile?: ProfileLike | null; currencySymbol?: string; locale?: string;
  language?: "en" | "it" | "zh"; cityTaxPerPersonPerNight?: number; breakfastUnitPrice?: number;
  parkingUnitPrice?: number; rulesTitle?: string; rulesContent?: string;
};
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
const imageUrl = (value: string) => {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "https://hotelvalganna.it";
    const url = new URL(value, base);
    return /^https?:$/.test(url.protocol) ? escapeHtml(url.href) : "";
  } catch { return ""; }
};

export const buildReservationReceiptHtml = (options: ReceiptOptions): string => {
  const { booking, profile, language = "en", rulesContent = "", rulesTitle, cityTaxPerPersonPerNight = 0 } = options;
  const t = hotelCopy[language];
  const locale = options.locale || (language === "it" ? "it-IT" : language === "zh" ? "zh-CN" : "en-GB");
  const money = (value: number) => escapeHtml(new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(value));
  const date = (value: string) => escapeHtml(new Date(value).toLocaleDateString(locale, { timeZone: "Europe/Rome", day: "numeric", month: "long", year: "numeric" }));
  const labels = language === "it" ? { title: "Conferma di prenotazione", guest: "Ospite", email: "Email", phone: "Telefono", reference: "Riferimento", taxRate: "Tariffa indicata per persona, per notte", issued: "Documento di conferma della prenotazione, non documento fiscale." } :
    language === "zh" ? { title: "预订确认单", guest: "住客", email: "邮箱", phone: "电话", reference: "预订编号", taxRate: "所示每人每晚税率", issued: "此文件为预订确认单，并非税务发票。" } :
    { title: "Reservation confirmation", guest: "Guest", email: "Email", phone: "Phone", reference: "Booking reference", taxRate: "Listed rate per person, per night", issued: "Booking confirmation; this is not a tax invoice." };
  const hotel = {
    name: profile?.name || booking.property?.name || "Hotel Valganna",
    address: profile?.address || booking.property?.address || "",
    city: profile?.city || booking.property?.city || "",
    phone: profile?.phone || booking.property?.phone || "",
    email: profile?.email || booking.property?.email || "hotel.valganna@libero.it",
  };
  const nights = Math.max(1, Math.round((Date.parse(booking.checkOutDate) - Date.parse(booking.checkInDate)) / 86400000));
  const guest = [booking.guest?.firstName, booking.guest?.lastName].filter(Boolean).join(" ") || labels.guest;
  const reference = booking.bookingNumber || "#" + booking.id;
  const paid = Number(booking.paidAmount || 0);
  const balance = Math.max(0, booking.totalPrice - paid);
  const status = (value?: string) => ({ CONFIRMED: t.statusConfirmed, CANCELLED: t.cancelled, CHECKED_IN: t.checkedIn, CHECKED_OUT: t.checkedOut, PAID: t.paid, PARTIAL: t.partial, PENDING: t.pending }[value || ""] || value || t.pending);
  const row = (name: string, value: unknown) => '<div class="fact"><dt>' + escapeHtml(name) + '</dt><dd>' + escapeHtml(value || "—") + '</dd></div>';
  const extraNames = booking.notes?.match(/Additional guests:\s*([^|]+)/i)?.[1]?.trim();
  const checkInName = booking.notes?.match(/Check-in guest:\s*([^|]+)/i)?.[1]?.trim();
  return '<!doctype html><html lang="' + language + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(labels.title + " · " + reference) + '</title><style>' +
  '@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;background:#f1f0e9;color:#263d32;font:12px/1.65 Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{max-width:850px;margin:30px auto;background:#fffdf9;padding:38px 42px}.top{display:flex;align-items:center;justify-content:space-between;gap:25px;border-bottom:1px solid #d9dfd2;padding-bottom:24px}.brand{display:flex;align-items:center;gap:12px}.brand img{height:45px;width:45px;object-fit:contain}.hotel-name{font:25px Georgia,serif}.eyebrow{font-size:8px;letter-spacing:.19em;text-transform:uppercase;color:#73816b}.reference{text-align:right;font-size:11px}.reference strong{font-size:14px;display:block}.title{margin:28px 0 22px}.title h1{font:35px/1.15 Georgia,serif;margin:9px 0}.title p{margin:0;color:#6b7963}.hero{height:155px;width:100%;object-fit:cover;border-radius:6px;display:block}.room-line{display:flex;justify-content:space-between;gap:25px;align-items:center;padding:17px 0;border-bottom:1px solid #d9dfd2}.room-line h2{font:23px Georgia,serif;margin:0}.pill{padding:5px 10px;border:1px solid #cbd8c2;border-radius:20px;font-size:9px}.columns{display:grid;grid-template-columns:1.2fr 1fr;gap:35px;margin:25px 0}.columns>section{min-width:0}h3{font:20px Georgia,serif;margin:0 0 17px}dl{margin:0}.fact{margin:0 0 13px}.fact dt{font-size:9px;color:#77816f}.fact dd{margin:3px 0 0;font-size:12px;overflow-wrap:anywhere}.dates{display:grid;grid-template-columns:1fr 1fr;gap:25px;margin-top:8px}.payment{background:#edf0e6;padding:24px;border-radius:6px;align-self:start}.amount{display:flex;justify-content:space-between;gap:20px;padding:7px 0;font-size:12px}.amount.total{font:23px Georgia,serif;margin-bottom:16px;border-bottom:1px solid #ccd7c1;padding-bottom:18px}.amount.balance{font-weight:700}.notice{font-size:9px;color:#6f7b66;line-height:1.7;margin-top:18px}.arrival{border-top:1px solid #d9dfd2;padding-top:20px}.arrival p{margin:5px 0;font-size:11px}.rules{margin-top:23px;border-top:1px solid #d9dfd2;padding-top:20px}.rules p{white-space:pre-wrap;font-size:10px;line-height:1.7;color:#66745e}.foot{margin-top:30px;padding-top:15px;border-top:1px solid #d9dfd2;font-size:8px;color:#77816f;display:flex;justify-content:space-between;gap:25px}.greeting{font:21px Georgia,serif;margin-top:25px}@media print{body{background:white}.sheet{margin:0;padding:0;max-width:none}.top,.room-line,.columns,.arrival,.foot{break-inside:avoid}.rules{break-inside:auto}.hero{height:135px}h3{break-after:avoid}}@media screen and (max-width:600px){.sheet{padding:22px;margin:0}.columns{grid-template-columns:1fr}.top{align-items:start}.brand img{display:none}.hotel-name{font-size:20px}.title h1{font-size:29px}.foot{flex-direction:column}}' +
  '</style></head><body><main class="sheet"><header class="top"><div class="brand"><img src="' + imageUrl(profile?.logoUrl || "/logo-192.png") + '" alt=""><div><div class="hotel-name">' + escapeHtml(hotel.name) + '</div><div class="eyebrow">MILANO, ITALIA</div></div></div><div class="reference"><span class="eyebrow">' + escapeHtml(labels.reference) + '</span><strong>' + escapeHtml(reference) + '</strong></div></header>' +
  '<section class="title"><p class="eyebrow">' + escapeHtml(labels.title) + '</p><h1>' + escapeHtml(booking.bookingStatus === "CANCELLED" ? t.cancelled : t.welcome) + '</h1><p>' + escapeHtml(guest) + ' · ' + nights + ' ' + escapeHtml(t.nights) + ' · ' + booking.numberOfGuests + ' ' + escapeHtml(t.people) + '</p></section>' +
  '<img class="hero" src="' + imageUrl(roomImage(booking.room?.roomType)) + '" alt="' + escapeHtml(booking.room?.roomType || hotel.name) + '"><div class="room-line"><h2>' + escapeHtml(booking.room?.roomType || t.yourRoom) + '</h2><span class="pill">' + escapeHtml(status(booking.bookingStatus)) + '</span></div>' +
  '<div class="columns"><section><h3>' + escapeHtml(t.summary) + '</h3><dl class="dates"><div class="fact"><dt>' + escapeHtml(t.checkIn) + '</dt><dd>' + date(booking.checkInDate) + (profile?.checkInTime ? '<br>' + escapeHtml(profile.checkInTime) : "") + '</dd></div><div class="fact"><dt>' + escapeHtml(t.checkOut) + '</dt><dd>' + date(booking.checkOutDate) + (profile?.checkOutTime ? '<br>' + escapeHtml(profile.checkOutTime) : "") + '</dd></div></dl><dl>' + row(labels.guest, guest) + (checkInName ? row(t.checkInName, checkInName) : "") + (extraNames ? row(t.additional, extraNames) : "") + row(labels.email, booking.guest?.email) + row(labels.phone, booking.guest?.phone) + (booking.breakfastCount ? row(t.breakfast, booking.breakfastCount + " " + t.people) : "") + (booking.parkingIncluded ? row(t.parking, "✓") : "") + '</dl></section>' +
  '<section class="payment"><h3>' + escapeHtml(t.payment) + '</h3><div class="amount total"><span>' + escapeHtml(t.stayTotal) + '</span><span>' + money(booking.totalPrice) + '</span></div><div class="amount"><span>' + escapeHtml(t.paid) + '</span><span>' + money(paid) + '</span></div><div class="amount balance"><span>' + escapeHtml(t.balance) + '</span><span>' + money(balance) + '</span></div><p class="notice">' + escapeHtml(status(booking.paymentStatus)) + '<br>' + escapeHtml(t.tax) + (cityTaxPerPersonPerNight > 0 ? '<br>' + escapeHtml(labels.taxRate) + ': ' + money(cityTaxPerPersonPerNight) : "") + '</p></section></div>' +
  '<section class="arrival"><h3>' + escapeHtml(t.hotelInfo) + '</h3><p>' + escapeHtml([hotel.address, hotel.city].filter(Boolean).join(", ")) + '</p><p>' + escapeHtml([hotel.phone, hotel.email].filter(Boolean).join(" · ")) + '</p></section>' +
  (rulesContent ? '<section class="rules"><h3>' + escapeHtml(rulesTitle || t.rules) + '</h3><p>' + escapeHtml(rulesContent) + '</p></section>' : "") +
  '<p class="greeting">' + escapeHtml(t.welcome) + '</p><footer class="foot"><span>' + escapeHtml(hotelCompany.name) + '<br>P. IVA / C.F. ' + escapeHtml(hotelCompany.vatNumber) + '</span><span>' + escapeHtml(labels.issued) + '</span></footer></main></body></html>';
};

export const printReservationReceipt = async (options: ReceiptOptions): Promise<void> => {
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Allow popups to print your reservation");
  popup.document.open();
  popup.document.write(buildReservationReceiptHtml(options));
  popup.document.close();
  const images = Array.from(popup.document.images).map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  }));
  await Promise.race([
    Promise.all([...images, popup.document.fonts?.ready || Promise.resolve()]),
    new Promise(resolve => window.setTimeout(resolve, 6000)),
  ]);
  if (!popup.closed) { popup.focus(); popup.print(); }
};
