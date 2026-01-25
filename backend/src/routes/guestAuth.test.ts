import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../index'; // Assuming your express app is exported from index.ts
import request from 'supertest';
import { prisma } from '../db';

const RND = Math.random().toString(36).substring(7);
const GUEST_EMAIL = `test-guest-${RND}@example.com`;
const GUEST_PASSWORD = "password123";
let GUEST_TOKEN = "";

describe('Guest Authentication', () => {
  beforeAll(async () => {
    // Clean up any previous test data
    await prisma.guestAccount.deleteMany({ where: { email: GUEST_EMAIL } });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.guestAccount.deleteMany({ where: { email: GUEST_EMAIL } });
    await prisma.$disconnect();
  });

  it('should register a new guest account', async () => {
    const res = await request(app)
      .post('/api/guest-auth/register')
      .send({ email: GUEST_EMAIL, password: GUEST_PASSWORD });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    GUEST_TOKEN = res.body.token;
  });

  it('should login the new guest account', async () => {
    const res = await request(app)
      .post('/api/guest-auth/login')
      .send({ email: GUEST_EMAIL, password: GUEST_PASSWORD });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  describe('Password Reset', () => {
    let resetToken = '';

    it('should request a password reset and create a token', async () => {
      const res = await request(app)
        .post('/api/guest-auth/forgot-password')
        .send({ email: GUEST_EMAIL });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('If the email exists, a reset link will be sent.');

      const tokenEntry = await prisma.guestPasswordResetToken.findFirst({
        where: {
          guestAccount: {
            email: GUEST_EMAIL,
          },
        },
      });

      expect(tokenEntry).not.toBeNull();
      expect(tokenEntry?.token).toBeDefined();
      resetToken = tokenEntry!.token;
    });

    it('should reset the password with a valid token', async () => {
      const NEW_PASSWORD = "new_password_456";
      const res = await request(app)
        .post('/api/guest-auth/reset-password')
        .send({ token: resetToken, password: NEW_PASSWORD });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toEqual('Password has been reset. You can now log in.');

      // Verify the token has been deleted
      const tokenEntry = await prisma.guestPasswordResetToken.findFirst({
        where: { token: resetToken },
      });
      expect(tokenEntry).toBeNull();

      // Try to login with the new password
      const loginRes = await request(app)
        .post('/api/guest-auth/login')
        .send({ email: GUEST_EMAIL, password: NEW_PASSWORD });

      expect(loginRes.statusCode).toEqual(200);
      expect(loginRes.body).toHaveProperty('token');
    });

    it('should not reset password with an invalid token', async () => {
        const res = await request(app)
            .post('/api/guest-auth/reset-password')
            .send({ token: 'invalid-token', password: 'some-password' });

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toEqual('Invalid or expired token');
    });
  });
});
