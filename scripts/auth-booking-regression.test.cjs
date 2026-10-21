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
    "export const sendBookingEmails": "globalThis.sendBookingEmails",
  }, {
    process: { env: { SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "sender@example.com", SMTP_PASS: "test-only", ...env } },
    nodemailer: { createTransport: value => { config = value; return { sendMail }; } },
  });
  return { send: context.sendBookingEmails, config: () => config };
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
  await assert.rejects(m.send(payload), /SMTP_HOST/);
});
