const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { stripTypeScriptTypes } = require("node:module");
const root = path.resolve(__dirname, "..");

function load(file, replacements = {}, globals = {}) {
  let code = fs.readFileSync(path.join(root, file), "utf8");
  for (const [from, to] of Object.entries(replacements)) code = code.replace(from, to);
  code = code.replace(/\bexport (?=(?:class|const|function|interface|type)\b)/g, "");
  code = stripTypeScriptTypes(code, { mode: "strip" });
  const context = { console, process: { env: {} }, setTimeout: (fn) => fn(), ...globals };
  vm.runInNewContext(code, context, { filename: file });
  return context;
}

function client() {
  const callbacks = {};
  const values = new Map([["token", "staff"], ["user", "{}"], ["guestToken", "guest"]]);
  const events = [];
  load("frontend/src/api/apiClient.ts", {
    'import axios, { AxiosInstance } from "axios";': "",
    "import.meta.env.VITE_API_URL": "undefined",
    "export default apiClient;": "",
  }, {
    axios: { create: () => ({ interceptors: {
      request: { use: fn => callbacks.request = fn },
      response: { use: (ok, error) => callbacks.error = error },
    } }) },
    localStorage: { getItem: key => values.get(key) || null, removeItem: key => values.delete(key) },
    window: { dispatchEvent: event => events.push(event.type) },
    Event: class { constructor(type) { this.type = type; } },
  });
  return { ...callbacks, values, events };
}

test("PMS requests attach staff token; public and guest login never inherit it", () => {
  const c = client();
  assert.equal(c.request({ url: "/users", headers: {} }).headers.Authorization, "Bearer staff");
  for (const url of ["/guest-auth/login", "/auth/login", "/hotel-profile", "/public/search"]) {
    assert.equal(c.request({ url, headers: {} }).headers.Authorization, undefined);
  }
  assert.equal(c.request({ url: "/guest-auth/bookings", headers: { Authorization: "Bearer guest" } }).headers.Authorization, "Bearer guest");
});

test("Expired staff session is cleared without touching guest or language storage", async () => {
  const c = client();
  c.values.set("language", "it");
  await assert.rejects(c.error({ response: { status: 401 }, config: { url: "/users", headers: { Authorization: "Bearer staff" } } }));
  assert.equal(c.values.has("token"), false);
  assert.equal(c.values.has("user"), false);
  assert.equal(c.values.get("guestToken"), "guest");
  assert.equal(c.values.get("language"), "it");
  assert.deepEqual(c.events, ["staff-session-expired"]);
});

test("Expired guest session leaves PMS login intact", async () => {
  const c = client();
  await assert.rejects(c.error({ response: { status: 401 }, config: { url: "/guest-auth/bookings", headers: { Authorization: "Bearer guest" } } }));
  assert.equal(c.values.has("guestToken"), false);
  assert.equal(c.values.get("token"), "staff");
  assert.deepEqual(c.events, ["guest-session-expired"]);
});

test("Older failures and network errors do not erase a fresh login", async () => {
  const c = client();
  await assert.rejects(c.error({ response: { status: 401 }, config: { url: "/users", headers: { Authorization: "Bearer old-staff" } } }));
  await assert.rejects(c.error({ config: { url: "/users", headers: { Authorization: "Bearer staff" } } }));
  assert.equal(c.values.get("token"), "staff");
  assert.equal(c.events.length, 0);
});

test("Signing and verification share one environment-aware secret resolver", () => {
  const context = load("backend/src/utils/authConfig.ts", {
    'import "dotenv/config";': "",
    "export const getJwtSecret": "globalThis.getJwtSecret",
  });
  assert.equal(context.getJwtSecret(), context.getJwtSecret(true));
  context.process.env.JWT_SECRET = "configured";
  assert.equal(context.getJwtSecret(), "configured");
  assert.equal(context.getJwtSecret(true), "configured");
  context.process.env.GUEST_JWT_SECRET = "guest-secret";
  assert.equal(context.getJwtSecret(true), "guest-secret");
  context.process.env = { NODE_ENV: "production" };
  assert.throws(() => context.getJwtSecret(), /JWT_SECRET/);
});

const payload = {
  bookingNumber: "BK-test", checkInDate: new Date("2026-11-01T14:00:00Z"),
  checkOutDate: new Date("2026-11-03T10:00:00Z"), totalPrice: 250,
  guestEmail: "guest@example.com", guestName: "<script>guest</script>",
  guestPhone: "+39 123", numberOfGuests: 2, hotelEmail: "hotel@example.com",
};

function mailer(sendMail, env = {}) {
  let config;
  const context = load("backend/src/utils/mailer.ts", {
    'import nodemailer from "nodemailer";': "",
    'import axios from "axios";': "",
    "export const sendBookingEmails": "globalThis.sendBookingEmails",
    "export const sendBookingEmail": "globalThis.sendBookingEmail",
  }, {
    process: { env: { SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "sender@example.com", SMTP_PASS: "test-only", ...env } },
    nodemailer: { createTransport: value => { config = value; return { sendMail }; } },
    axios: { post: async () => { throw new Error("Unexpected HTTP delivery in SMTP test"); } },
  });
  return { send: context.sendBookingEmails, sendOne: context.sendBookingEmail, config: () => config };
}

test("Hotel receives full reservation even when guest delivery fails", async () => {
  const sent = [];
  const m = mailer(async mail => {
    sent.push(mail);
    if (mail.to === "guest@example.com") throw new Error("Recipient rejected");
    return { rejected: [] };
  }, { BOOKING_NOTIFICATION_EMAIL: "reception@example.com" });
  await assert.rejects(m.send(payload), /failed for guest/);
  const hotel = sent.filter(mail => mail.to === "reception@example.com");
  assert.equal(hotel.length, 1);
  assert.equal(hotel[0].replyTo, payload.guestEmail);
  assert.match(hotel[0].text, /Guests: 2/);
  assert.match(hotel[0].text, /Phone: \+39 123/);
  assert.match(hotel[0].text, /guest@example.com/);
  assert.ok(hotel[0].html.includes("&lt;script&gt;"));
  assert.ok(!hotel[0].html.includes("<script>"));
  assert.equal(sent.filter(mail => mail.to === "guest@example.com").length, 3);
  assert.equal(m.config().secure, false);
});

test("Transient hotel SMTP failure retries only hotel; TLS follows port 465", async () => {
  const sent = [];
  let attempts = 0;
  const m = mailer(async mail => {
    sent.push(mail);
    if (mail.to === payload.hotelEmail && ++attempts === 1) throw new Error("Temporary");
    return { rejected: [] };
  }, { SMTP_PORT: "465" });
  await m.send(payload);
  assert.equal(attempts, 2);
  assert.equal(sent.filter(mail => mail.to === payload.guestEmail).length, 1);
  assert.equal(m.config().secure, true);
});

test("Missing SMTP configuration is an explicit failure", async () => {
  const m = mailer(async () => assert.fail("Must not send"), { SMTP_PASS: "" });
  await assert.rejects(m.sendOne(payload, "HOTEL"), /SMTP_HOST/);
});

test("HTTPS mail uses the verified sender and a stable idempotency key", async () => {
  const requests = [];
  const context = load("backend/src/utils/mailer.ts", {
    'import nodemailer from "nodemailer";': "",
    'import axios from "axios";': "",
    "export const sendBookingEmail": "globalThis.sendBookingEmail",
  }, {
    process: { env: { MAIL_PROVIDER: "resend", RESEND_API_KEY: "private-test-key", MAIL_FROM: "Hotel Valganna <reservations@hotelvalganna.it>" } },
    axios: { post: async (url, data, config) => { requests.push({ url, data, config }); return { data: { id: "provider-id" } }; } },
  });
  assert.equal(await context.sendBookingEmail(payload, "GUEST", "booking-delivery-10"), "provider-id");
  assert.equal(requests[0].url, "https://api.resend.com/emails");
  assert.equal(requests[0].data.to[0], payload.guestEmail);
  assert.equal(requests[0].data.reply_to, payload.hotelEmail);
  assert.equal(requests[0].config.headers["Idempotency-Key"], "booking-delivery-10");
  assert.ok(!requests[0].data.html.includes("<script>"));
});

test("Provider errors are sanitized before they reach queue logs", async () => {
  const context = load("backend/src/utils/mailer.ts", {
    'import nodemailer from "nodemailer";': "",
    'import axios from "axios";': "",
    "export const sendBookingEmail": "globalThis.sendBookingEmail",
  }, {
    process: { env: { MAIL_PROVIDER: "resend", RESEND_API_KEY: "private-test-key", MAIL_FROM: "reservations@example.test" } },
    axios: { post: async () => { const error = new Error("Bearer private-test-key"); error.response = { status: 403 }; throw error; } },
  });
  await assert.rejects(context.sendBookingEmail(payload, "HOTEL", "booking-delivery-11"), error => {
    assert.equal(error.code, "EMAIL_API_HTTP_403");
    assert.ok(!error.message.includes("private-test-key"));
    return true;
  });
});

test("Room photo mappings match the real category, with a neutral fallback", () => {
  const context = load("frontend/src/public/hotelMedia.ts", { "export const roomImage": "globalThis.roomImage", "export const safeReturnPath": "globalThis.safeReturnPath" });
  assert.equal(context.roomImage("Matrimoniale piccola"), "/matrimoniale%20piccola.jpg");
  assert.equal(context.roomImage("Familiare"), "/familiare.jpg");
  assert.equal(context.roomImage("unconfigured category"), "/banner.png");
  assert.equal(context.safeReturnPath("//evil.test"), null);
  assert.equal(context.safeReturnPath("/booking-malicious"), null);
  assert.equal(context.safeReturnPath("/booking?rooms=2"), "/booking?rooms=2");
});

test("Printable confirmations escape personal content and use recorded payment totals", () => {
  const copy = load("frontend/src/public/hotelCopy.ts", {
    'import { Language } from "../i18n/translations";': "",
    "export const hotelCopy: Record<Language, typeof en>": "globalThis.hotelCopy",
  });
  const context = load("frontend/src/utils/receipt.ts", {
    'import { roomImage } from "../public/hotelMedia";': "",
    'import { hotelCopy } from "../public/hotelCopy";': "",
    'import { hotelCompany } from "../public/hotelCompany";': "",
    "export const buildReservationReceiptHtml": "globalThis.buildReservationReceiptHtml",
  }, {
    hotelCopy: copy.hotelCopy,
    hotelCompany: { name: "Hotel Valganna", vatNumber: "03192130965" },
    roomImage: () => "/familiare.jpg",
    URL, Intl, Date,
    window: { location: { origin: "https://hotelvalganna.it" } },
  });
  const html = context.buildReservationReceiptHtml({
    booking: {
      id: 1, bookingNumber: "BK-actual", checkInDate: "2026-11-01T14:00:00Z", checkOutDate: "2026-11-03T10:00:00Z",
      totalPrice: 250, paidAmount: 150, numberOfGuests: 2, room: { roomType: "Familiare" },
      guest: { firstName: "<script>guest</script>", email: "guest@example.test" },
    },
    language: "en", rulesContent: "<img src=x onerror=alert(1)>",
  });
  assert.ok(html.includes("https://hotelvalganna.it/familiare.jpg"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("€250.00"));
  assert.ok(html.includes("€150.00"));
  assert.ok(html.includes("€100.00"));
  assert.ok(!html.includes("Daily Rates"));
});
