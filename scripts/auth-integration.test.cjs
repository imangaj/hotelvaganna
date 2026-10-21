const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");
const requireBackend = createRequire(path.resolve(__dirname, "../backend/package.json"));
// Use only against the isolated CI database created in the workflow.
process.env.VITEST = "1";
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
