const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");
const requireBackend = createRequire(path.resolve(__dirname, "../backend/package.json"));
// Use only against the isolated CI database created in the workflow.
process.env.VITEST = "1";
process.env.MAIL_PROVIDER = "resend";
process.env.RESEND_API_KEY = "";
process.env.MAIL_FROM = "";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "ci-only-staff-secret";
process.env.GUEST_JWT_SECRET = "ci-only-guest-secret";
const { app } = requireBackend("./dist/index.js");
const { PrismaClient } = requireBackend("@prisma/client");
const bcrypt = requireBackend("bcryptjs");
const jwt = requireBackend("jsonwebtoken");

test("Real staff and guest login restore separate identities and complete reservation history", async () => {
  const prisma = new PrismaClient();
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const suffix = Date.now();
  const email = `guest-${suffix}@example.test`;
  const staffEmail = `staff-${suffix}@example.test`;
  const request = async (route, token, data) => {
    const response = await fetch(base + route, {
      method: data ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    return { status: response.status, data: await response.json(), cache: response.headers.get("cache-control") };
  };
  let property;
  try {
    const hash = await bcrypt.hash("test-password", 10);
    await prisma.user.create({ data: { email: staffEmail, name: "CI Admin", role: "ADMIN", password: hash } });
    await prisma.guestAccount.create({ data: { email, firstName: "CI", lastName: "Guest", phone: "123", passwordHash: hash } });
    const guest = await prisma.guest.create({ data: { email, firstName: "CI", lastName: "Guest" } });
    property = await prisma.property.create({ data: { name: `CI-${suffix}`, address: "Test", city: "Milan", country: "Italy" } });
    const roomType = await prisma.roomType.create({ data: { name: `CI-${suffix}`, maxGuests: 2, basePrice: 100 } });
    const room = await prisma.room.create({ data: { roomNumber: "101", propertyId: property.id, roomTypeId: roomType.id } });
    for (const [index, start, end] of [[0, "2020-01-01", "2020-01-03"], [1, "2030-01-01", "2030-01-03"]]) {
      await prisma.booking.create({ data: {
        bookingNumber: `CI-${suffix}-${index}`, propertyId: property.id, roomId: room.id, guestId: guest.id,
        checkInDate: new Date(start), checkOutDate: new Date(end), numberOfGuests: 1, totalPrice: 200, source: "website",
      } });
    }
    const staffLogin = await request("/auth/login", null, { email: staffEmail, password: "test-password" });
    assert.equal(staffLogin.status, 200);
    const staffToken = staffLogin.data.token;
    assert.equal((await request("/auth/me", staffToken)).data.role, "ADMIN");
    assert.equal((await request("/users", staffToken)).status, 200);
    assert.equal((await request("/guest-accounts", staffToken)).status, 200);
    const expired = jwt.sign({ userId: staffLogin.data.user.id }, process.env.JWT_SECRET, { expiresIn: -1 });
    assert.equal((await request("/auth/me", expired)).status, 401);
    const login = await request("/guest-auth/login", null, { email, password: "test-password" });
    assert.equal(login.status, 200);
    const guestToken = login.data.token;
    assert.equal((await request("/guest-auth/me", guestToken)).data.email, email);
    // A new request with the saved token reproduces reopening the portal.
    const history = await request("/guest-auth/bookings", guestToken);
    assert.equal(history.status, 200);
    assert.equal(history.cache, "no-store");
    assert.equal(history.data.length, 2);
    assert.ok(history.data.every(booking => booking.guest.email === email));
    assert.equal((await request("/users", guestToken)).status, 401);
    assert.equal((await request("/guest-auth/bookings", staffToken)).status, 401);
    assert.equal((await request("/guest-auth/login", null, { email, password: "wrong-password" })).status, 401);

    const catalogue = await request("/public/room-types?propertyId=" + property.id);
    assert.equal(catalogue.status, 200);
    assert.equal(catalogue.data[0].name, roomType.name);
    assert.equal(catalogue.data[0].maxGuests, 2);
    assert.equal(catalogue.data[0].roomNumber, undefined);
    assert.equal((await request("/public/search?propertyId=1&checkIn=bad&checkOut=bad")).status, 400);
    const input = {
      propertyId: property.id, roomId: room.id, guestId: guest.id, checkInDate: "2031-01-01",
      checkOutDate: "2031-01-03", numberOfGuests: 1, totalPrice: 200, paidAmount: 200,
      source: "website", checkoutKey: "cs_test_repeatable:" + room.id,
    };
    const created = await request("/bookings", guestToken, input);
    assert.equal(created.status, 201);
    const repeated = await request("/bookings", guestToken, input);
    assert.equal(repeated.status, 200);
    assert.equal(repeated.data.id, created.data.id);
    const jobs = await prisma.bookingEmailDelivery.findMany({ where: { bookingId: created.data.id } });
    assert.equal(jobs.length, 2);
    assert.deepEqual(jobs.map(job => job.recipientType).sort(), ["GUEST", "HOTEL"]);
    assert.equal(jobs.find(job => job.recipientType === "HOTEL").recipientEmail, "hotel.valganna@libero.it");
    assert.equal(jobs.find(job => job.recipientType === "GUEST").recipientEmail, email);
    assert.ok(jobs.every(job => job.sentAt === null));
    // Confirm queued work survives a new database-client connection and was not recreated on refresh.
    const restartedClient = new PrismaClient();
    assert.equal(await restartedClient.bookingEmailDelivery.count({ where: { bookingId: created.data.id } }), 2);
    await restartedClient.$disconnect();
    // Allow the intentionally unconfigured worker to record safe failure codes, not secrets.
    let failuresRecorded = false;
    for (let i = 0; i < 100; i++) {
      const pending = await prisma.bookingEmailDelivery.findMany({ where: { bookingId: created.data.id } });
      if (pending.every(job => job.attempts > 0 && job.leaseUntil === null)) {
        assert.ok(pending.every(job => job.lastError === "RESEND_API_KEY_AND_MAIL_FROM_REQUIRED"));
        failuresRecorded = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(failuresRecorded, "Worker must persist diagnostic failures for both recipients");

  } finally {
    await new Promise(resolve => server.close(resolve));
    if (property) {
      await prisma.booking.deleteMany({ where: { propertyId: property.id } });
      await prisma.room.deleteMany({ where: { propertyId: property.id } });
      await prisma.property.delete({ where: { id: property.id } });
    }
    await prisma.roomType.deleteMany({ where: { name: `CI-${suffix}` } });
    await prisma.guest.deleteMany({ where: { email } });
    await prisma.guestAccount.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email: staffEmail } });
    await prisma.$disconnect();
  }
});
