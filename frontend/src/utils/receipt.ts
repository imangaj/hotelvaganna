type BookingLike = {
  id: number;
  bookingNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalPrice: number;
  paidAmount?: number;
  bookingStatus?: string;
  paymentStatus?: string;
  source?: string;
  breakfastCount?: number;
  parkingIncluded?: boolean;
  guest?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  room?: { roomNumber?: string; roomType?: string; breakfastPrice?: number };
  property?: { name?: string; address?: string; city?: string; country?: string; phone?: string; email?: string };
  notes?: string;
};

type ProfileLike = {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  contentJson?: any;
  policies?: string;
};

type ReceiptOptions = {
  booking: BookingLike;
  profile?: ProfileLike | null;
  currencySymbol?: string;
  locale?: string;
  language?: "en" | "it" | "zh";
  cityTaxPerPersonPerNight?: number;
  breakfastUnitPrice?: number;
  parkingUnitPrice?: number;
  rulesTitle?: string;
  rulesContent?: string;
};

const getLocaleForLanguage = (language?: "en" | "it" | "zh") => {
  if (language === "it") return "it-IT";
  if (language === "zh") return "zh-CN";
  return "en-US";
};

const getLabels = (language?: "en" | "it" | "zh") => {
  switch (language) {
    case "it":
      return {
        receiptTitle: "Ricevuta Prenotazione",
        guest: "Ospite",
        stay: "Soggiorno",
        checkIn: "Check-in",
        checkOut: "Check-out",
        nights: "Notti",
        room: "Camera",
        guests: "Ospiti",
        dailyRates: "Tariffe Giornaliere",
        date: "Data",
        breakfast: "Colazione",
        parking: "Parcheggio",
        cityTax: "Tassa di soggiorno",
        total: "Totale",
        summary: "Riepilogo",
        roomSubtotal: "Subtotale camera",
        grandTotal: "Totale complessivo",
        payment: "Pagamento",
        paid: "Pagato",
        balanceDue: "Da pagare",
        status: "Stato",
        reservationStatus: "Stato prenotazione",
        role: "Ruolo",
        source: "Fonte",
        cityTaxNotice: "La tassa di soggiorno è",
        cityTaxHotel: "La tassa di soggiorno si paga in hotel.",
        signature: "Firma",
      };
    case "zh":
      return {
        receiptTitle: "预订收据",
        guest: "客人",
        stay: "住宿",
        checkIn: "入住",
        checkOut: "退房",
        nights: "晚数",
        room: "房型",
        guests: "人数",
        dailyRates: "每日价格",
        date: "日期",
        breakfast: "早餐",
        parking: "停车",
        cityTax: "城市税",
        total: "合计",
        summary: "汇总",
        roomSubtotal: "房费小计",
        grandTotal: "总计",
        payment: "付款",
        paid: "已付",
        balanceDue: "待付",
        status: "状态",
        reservationStatus: "预订状态",
        role: "角色",
        source: "来源",
        cityTaxNotice: "城市税为",
        cityTaxHotel: "城市税需在酒店支付。",
        signature: "签名",
      };
    default:
      return {
        receiptTitle: "Reservation Receipt",
        guest: "Guest",
        stay: "Stay",
        checkIn: "Check-in",
        checkOut: "Check-out",
        nights: "Nights",
        room: "Room",
        guests: "Guests",
        dailyRates: "Daily Rates",
        date: "Date",
        breakfast: "Breakfast",
        parking: "Parking",
        cityTax: "City Tax",
        total: "Total",
        summary: "Summary",
        roomSubtotal: "Room subtotal",
        grandTotal: "Grand total",
        payment: "Payment",
        paid: "Paid",
        balanceDue: "Balance due",
        status: "Status",
        reservationStatus: "Reservation status",
        role: "Role",
        source: "Source",
        cityTaxNotice: "City tax is",
        cityTaxHotel: "City tax must be paid at the hotel.",
        signature: "Signature",
      };
  }
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const formatMoney = (value: number, currencySymbol: string) => `${currencySymbol}${value.toFixed(2)}`;

const resolveLogoUrl = (logoUrl?: string) => {
  if (!logoUrl) return "";
  if (/^https?:\/\//i.test(logoUrl) || /^data:/i.test(logoUrl)) return logoUrl;
  if (typeof window !== "undefined") return `${window.location.origin}${logoUrl}`;
  return logoUrl;
};

const formatDate = (dateStr: string, locale: string) =>
  new Date(dateStr).toLocaleDateString(locale, { timeZone: "Europe/Rome" });

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
};

export const buildReservationReceiptHtml = (options: ReceiptOptions) => {
  const {
    booking,
    profile,
    currencySymbol = "€",
    locale,
    language,
    cityTaxPerPersonPerNight = 0,
    breakfastUnitPrice = 7,
    parkingUnitPrice = 20,
    rulesTitle,
    rulesContent,
  } = options;

  const labels = getLabels(language);
  const resolvedLocale = locale || getLocaleForLanguage(language);

  const breakfastUnit =
    typeof breakfastUnitPrice === "number"
      ? breakfastUnitPrice
      : profile?.contentJson?.receipt?.breakfastUnitPrice ?? 7;

  const hotel = {
    name: profile?.name || booking.property?.name || "Hotel",
    address: profile?.address || booking.property?.address || "",
    city: profile?.city || booking.property?.city || "",
    country: profile?.country || booking.property?.country || "",
    phone: profile?.phone || booking.property?.phone || "",
    email: profile?.email || booking.property?.email || "",
    logoUrl: resolveLogoUrl(profile?.logoUrl || "/logo-192.png"),
  };

  const checkIn = new Date(booking.checkInDate);
  const checkOut = new Date(booking.checkOutDate);
  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY));

  const breakfastCount = booking.breakfastCount || 0;
  const breakfastPrice = booking.room?.breakfastPrice ?? breakfastUnit;
  const breakfastTotal = breakfastCount > 0 ? breakfastPrice * breakfastCount * nights : 0;
  const parkingTotal = booking.parkingIncluded ? parkingUnitPrice * nights : 0;
  const cityTaxTotal = cityTaxPerPersonPerNight > 0
    ? cityTaxPerPersonPerNight * booking.numberOfGuests * nights
    : 0;

  const baseRoomTotal = Math.max((booking.totalPrice || 0) - breakfastTotal - parkingTotal, 0);
  const basePerNight = nights ? baseRoomTotal / nights : baseRoomTotal;

  const grandTotal = booking.totalPrice || 0;
  const paidAmount = booking.paidAmount || 0;
  const balanceDue = Math.max(grandTotal - paidAmount, 0);

  const dailyRows = Array.from({ length: nights }).map((_, index) => {
    const date = addDays(booking.checkInDate, index);
    const breakfastDaily = breakfastCount > 0 ? breakfastPrice * breakfastCount : 0;
    const parkingDaily = booking.parkingIncluded ? parkingUnitPrice : 0;
    const cityTaxDaily = cityTaxPerPersonPerNight > 0 ? cityTaxPerPersonPerNight * booking.numberOfGuests : 0;
    const dailyTotal = basePerNight + breakfastDaily + parkingDaily + cityTaxDaily;

    return `
      <tr>
        <td>${date.toLocaleDateString(resolvedLocale, { timeZone: "Europe/Rome", weekday: "short", day: "2-digit", month: "short" })}</td>
        <td class="right">${formatMoney(basePerNight, currencySymbol)}</td>
        <td class="right">${breakfastCount > 0 ? formatMoney(breakfastDaily, currencySymbol) : "-"}</td>
        <td class="right">${booking.parkingIncluded ? formatMoney(parkingDaily, currencySymbol) : "-"}</td>
        <td class="right">${cityTaxPerPersonPerNight > 0 ? formatMoney(cityTaxDaily, currencySymbol) : "-"}</td>
        <td class="right total">${formatMoney(dailyTotal, currencySymbol)}</td>
      </tr>
    `;
  }).join("");

  const reservationId = booking.bookingNumber || `#${booking.id}`;
  const guestName = `${booking.guest?.firstName || ""} ${booking.guest?.lastName || ""}`.trim();
  const roomName = booking.room?.roomType || "Room";
  const source = booking.source || "";
  const reservationRole = /booking|expedia|airbnb|ota/i.test(source)
    ? "OTA"
    : /walk|phone/i.test(source)
      ? "Walk-in / Phone"
      : "Direct";

  return `
  <html>
    <head>
      <title>Receipt ${reservationId}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; font-size: 16px; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 10px; }
        .brand { display: flex; gap: 12px; align-items: center; }
        .logo { height: 48px; }
        .hotel-name { font-size: 18px; font-weight: 700; }
        .muted { color: #6b7280; font-size: 12px; }
        .section { margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
        .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { padding: 6px 4px; border-bottom: 1px solid #e5e7eb; }
        th { text-align: left; background: #f9fafb; }
        td.right, th.right { text-align: right; }
        .total { font-weight: 700; }
        .badge { display: inline-block; padding: 3px 6px; border-radius: 999px; font-size: 11px; background: #f3f4f6; }
        .city-tax-total { font-size: 18px; font-weight: 700; color: #111827; }
        .city-tax-note { color: #6b7280; font-size: 12px; }
        .footer { margin-top: 18px; font-size: 11px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          ${hotel.logoUrl ? `<img class="logo" src="${hotel.logoUrl}" />` : ""}
          <div>
            <div class="hotel-name">${hotel.name}</div>
            <div class="muted">${hotel.address} ${hotel.city ? `, ${hotel.city}` : ""} ${hotel.country || ""}</div>
            <div class="muted">${hotel.phone ? `T: ${hotel.phone}` : ""} ${hotel.email ? ` · ${hotel.email}` : ""}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div class="title">${labels.receiptTitle}</div>
          <div class="muted">${reservationId}</div>
        </div>
      </div>

      <div class="section grid">
        <div class="card">
          <div class="title">${labels.guest}</div>
          <div class="row"><span>Name</span><span>${guestName || labels.guest}</span></div>
          <div class="row"><span>Email</span><span>${booking.guest?.email || "-"}</span></div>
          <div class="row"><span>Phone</span><span>${booking.guest?.phone || "-"}</span></div>
        </div>
        <div class="card">
          <div class="title">${labels.stay}</div>
          <div class="row"><span>${labels.checkIn}</span><span>${formatDate(booking.checkInDate, resolvedLocale)}</span></div>
          <div class="row"><span>${labels.checkOut}</span><span>${formatDate(booking.checkOutDate, resolvedLocale)}</span></div>
          <div class="row"><span>${labels.nights}</span><span>${nights}</span></div>
          <div class="row"><span>${labels.room}</span><span>${roomName}</span></div>
          <div class="row"><span>${labels.guests}</span><span>${booking.numberOfGuests}</span></div>
        </div>
      </div>

      <div class="section card">
        <div class="title">${labels.dailyRates}</div>
        <table>
          <thead>
            <tr>
              <th>${labels.date}</th>
              <th class="right">${labels.room}</th>
              <th class="right">${labels.breakfast}</th>
              <th class="right">${labels.parking}</th>
              <th class="right">${labels.cityTax}</th>
              <th class="right">${labels.total}</th>
            </tr>
          </thead>
          <tbody>
            ${dailyRows}
          </tbody>
        </table>
      </div>

      <div class="section grid">
        <div class="card">
          <div class="title">${labels.summary}</div>
          <div class="row"><span>${labels.roomSubtotal}</span><span>${formatMoney(baseRoomTotal, currencySymbol)}</span></div>
          ${breakfastCount > 0 ? `<div class="row"><span>${labels.breakfast}</span><span>${formatMoney(breakfastTotal, currencySymbol)}</span></div>` : ""}
          ${booking.parkingIncluded ? `<div class="row"><span>${labels.parking}</span><span>${formatMoney(parkingTotal, currencySymbol)}</span></div>` : ""}
          ${cityTaxPerPersonPerNight > 0 ? `<div class="row"><span>${labels.cityTax}</span><span>${formatMoney(cityTaxTotal, currencySymbol)}</span></div>` : ""}
          <div class="row total"><span>${labels.grandTotal}</span><span>${formatMoney(grandTotal, currencySymbol)}</span></div>
        </div>
        <div class="card">
          <div class="title">${labels.payment}</div>
          <div class="row"><span>${labels.paid}</span><span>${formatMoney(paidAmount, currencySymbol)}</span></div>
          <div class="row total"><span>${labels.balanceDue}</span><span>${formatMoney(balanceDue, currencySymbol)}</span></div>
          <div class="row"><span>${labels.status}</span><span class="badge">${booking.paymentStatus || "PENDING"}</span></div>
          <div class="row"><span>${labels.reservationStatus}</span><span class="badge">${booking.bookingStatus || "CONFIRMED"}</span></div>
          <div class="row"><span>${labels.role}</span><span>${reservationRole}</span></div>
          <div class="row"><span>${labels.source}</span><span>${booking.source || "-"}</span></div>
        </div>
      </div>

      ${cityTaxPerPersonPerNight > 0 ? `
      <div class="section card">
        <div class="title">${labels.cityTax}</div>
        <div class="city-tax-total">${formatMoney(cityTaxTotal, currencySymbol)}</div>
        <div class="city-tax-note">${labels.cityTaxNotice} ${cityTaxPerPersonPerNight} euro per person per night.</div>
        <div class="city-tax-note">${labels.cityTaxHotel}</div>
      </div>
      ` : ""}

      ${rulesContent ? `
      <div class="section card">
        <div class="title">${rulesTitle || "Hotel Rules"}</div>
        <div style="white-space: pre-wrap; font-size: 13px; line-height: 1.5; color: #374151;">
          ${rulesContent}
        </div>
      </div>
      ` : ""}

      <div class="section card">
        <div class="title">${labels.signature}</div>
        <div style="height: 60px; border-bottom: 1px solid #e5e7eb;"></div>
      </div>

    </body>
  </html>
  `;
};
