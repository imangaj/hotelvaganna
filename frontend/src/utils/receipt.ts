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
};

type ReceiptOptions = {
  booking: BookingLike;
  profile?: ProfileLike | null;
  currencySymbol?: string;
  locale?: string;
  cityTaxPerPersonPerNight?: number;
  breakfastUnitPrice?: number;
  parkingUnitPrice?: number;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const formatMoney = (value: number, currencySymbol: string) => `${currencySymbol}${value.toFixed(2)}`;

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
    locale = "it-IT",
    cityTaxPerPersonPerNight = 0,
    breakfastUnitPrice = 7,
    parkingUnitPrice = 20,
  } = options;

  const hotel = {
    name: profile?.name || booking.property?.name || "Hotel",
    address: profile?.address || booking.property?.address || "",
    city: profile?.city || booking.property?.city || "",
    country: profile?.country || booking.property?.country || "",
    phone: profile?.phone || booking.property?.phone || "",
    email: profile?.email || booking.property?.email || "",
    logoUrl: profile?.logoUrl || "",
  };

  const checkIn = new Date(booking.checkInDate);
  const checkOut = new Date(booking.checkOutDate);
  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY));

  const breakfastCount = booking.breakfastCount || 0;
  const breakfastPrice = booking.room?.breakfastPrice ?? breakfastUnitPrice;
  const breakfastTotal = breakfastCount > 0 ? breakfastPrice * breakfastCount * nights : 0;
  const parkingTotal = booking.parkingIncluded ? parkingUnitPrice * nights : 0;
  const cityTaxTotal = cityTaxPerPersonPerNight > 0
    ? cityTaxPerPersonPerNight * booking.numberOfGuests * nights
    : 0;

  const baseRoomTotal = Math.max((booking.totalPrice || 0) - breakfastTotal - parkingTotal, 0);
  const basePerNight = nights ? baseRoomTotal / nights : baseRoomTotal;

  const grandTotal = (booking.totalPrice || 0) + cityTaxTotal;
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
        <td>${date.toLocaleDateString(locale, { timeZone: "Europe/Rome", weekday: "short", day: "2-digit", month: "short" })}</td>
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
        @page { size: A4; margin: 18mm; }
        * { box-sizing: border-box; }
        body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 16px; }
        .brand { display: flex; gap: 12px; align-items: center; }
        .logo { height: 48px; }
        .hotel-name { font-size: 18px; font-weight: 700; }
        .muted { color: #6b7280; font-size: 12px; }
        .section { margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
        .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; }
        th { text-align: left; background: #f9fafb; }
        td.right, th.right { text-align: right; }
        .total { font-weight: 700; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 11px; background: #f3f4f6; }
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
          <div class="title">Reservation Receipt</div>
          <div class="muted">${reservationId}</div>
        </div>
      </div>

      <div class="section grid">
        <div class="card">
          <div class="title">Guest</div>
          <div class="row"><span>Name</span><span>${guestName || "Guest"}</span></div>
          <div class="row"><span>Email</span><span>${booking.guest?.email || "-"}</span></div>
          <div class="row"><span>Phone</span><span>${booking.guest?.phone || "-"}</span></div>
        </div>
        <div class="card">
          <div class="title">Stay</div>
          <div class="row"><span>Check-in</span><span>${formatDate(booking.checkInDate, locale)}</span></div>
          <div class="row"><span>Check-out</span><span>${formatDate(booking.checkOutDate, locale)}</span></div>
          <div class="row"><span>Nights</span><span>${nights}</span></div>
          <div class="row"><span>Room</span><span>${roomName}</span></div>
          <div class="row"><span>Guests</span><span>${booking.numberOfGuests}</span></div>
        </div>
      </div>

      <div class="section card">
        <div class="title">Daily Rates</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th class="right">Room</th>
              <th class="right">Breakfast</th>
              <th class="right">Parking</th>
              <th class="right">City Tax</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${dailyRows}
          </tbody>
        </table>
      </div>

      <div class="section grid">
        <div class="card">
          <div class="title">Summary</div>
          <div class="row"><span>Room subtotal</span><span>${formatMoney(baseRoomTotal, currencySymbol)}</span></div>
          ${breakfastCount > 0 ? `<div class="row"><span>Breakfast</span><span>${formatMoney(breakfastTotal, currencySymbol)}</span></div>` : ""}
          ${booking.parkingIncluded ? `<div class="row"><span>Parking</span><span>${formatMoney(parkingTotal, currencySymbol)}</span></div>` : ""}
          ${cityTaxPerPersonPerNight > 0 ? `<div class="row"><span>City tax</span><span>${formatMoney(cityTaxTotal, currencySymbol)}</span></div>` : ""}
          <div class="row total"><span>Grand total</span><span>${formatMoney(grandTotal, currencySymbol)}</span></div>
        </div>
        <div class="card">
          <div class="title">Payment</div>
          <div class="row"><span>Paid</span><span>${formatMoney(paidAmount, currencySymbol)}</span></div>
          <div class="row total"><span>Balance due</span><span>${formatMoney(balanceDue, currencySymbol)}</span></div>
          <div class="row"><span>Status</span><span class="badge">${booking.paymentStatus || "PENDING"}</span></div>
          <div class="row"><span>Reservation status</span><span class="badge">${booking.bookingStatus || "CONFIRMED"}</span></div>
          <div class="row"><span>Role</span><span>${reservationRole}</span></div>
          <div class="row"><span>Source</span><span>${booking.source || "-"}</span></div>
        </div>
      </div>

      <div class="footer">
        This receipt is generated by the property management system and formatted for A4 printing.
      </div>
    </body>
  </html>
  `;
};
