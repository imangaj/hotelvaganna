# Guest Password Reset Feature

This document explains the forgot/reset password functionality for guest users in the PMS system.

## Overview

The password reset feature allows guest users to securely reset their passwords via email. When email is not configured (DEV mode), reset links are displayed in the console and UI for testing.

## Architecture

### Backend Components

**Database Schema** (`backend/prisma/schema.prisma`):
- Added `passwordResetToken` (String?) - stores secure random token
- Added `passwordResetExpires` (DateTime?) - token expiry timestamp (1 hour)

**API Endpoints**:

1. **POST `/api/guest-auth/forgot-password`**
   - Request: `{ "email": "user@example.com" }`
   - Generates a secure 64-character hex token (32 bytes random)
   - Sets expiry to 1 hour from now
   - Sends password reset email (or logs link in DEV mode)
   - Returns same response regardless of email existence (security)
   - Response: `{ "message": "If an account exists...", "devMode": true, "resetLink": "..." }`

2. **POST `/api/guest-auth/reset-password`**
   - Request: `{ "token": "...", "newPassword": "..." }`
   - Validates token exists and hasn't expired
   - Hashes new password with bcrypt (10 rounds)
   - Clears token and expiry (one-time use)
   - Response: `{ "message": "Password reset successful..." }`

**Email Service** (`backend/src/utils/mailer.ts`):
- `sendPasswordResetEmail()` function sends formatted email with reset link
- Falls back to console logging when SMTP not configured
- Uses environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

### Frontend Components

**Guest Portal** (`frontend/src/public/GuestPortal.tsx`):
- Added "Forgot your password?" link on login screen
- Shows forgot password form with email input
- Displays success message and DEV mode reset link when applicable
- "Back to login" button to return to login form

**Reset Password Page** (`frontend/src/public/ResetPassword.tsx`):
- Standalone page at `/reset-password?token=<token>`
- Form with new password and confirm password fields
- Client-side validation (min 6 characters, passwords match)
- Shows success message and redirects to guest portal after 3 seconds

**API Integration** (`frontend/src/api/endpoints.ts`):
```typescript
guestAuthAPI.forgotPassword({ email: string })
guestAuthAPI.resetPassword({ token: string, newPassword: string })
```

## Security Features

✅ **Token Security**:
- 32-byte random tokens (64 hex characters)
- Stored hashed in database
- 1-hour expiration
- One-time use (cleared after successful reset)

✅ **No Information Leakage**:
- Same response for existing and non-existing emails
- Error messages don't reveal user existence
- Expired/invalid tokens return same error

✅ **Password Security**:
- Minimum 6 characters (configurable)
- Bcrypt hashing with 10 rounds
- Never sent via email

## DEV / Testing Mode

When SMTP is not configured, the system enters DEV mode:

1. **Console Output**: Reset links are logged to backend console:
   ```
   [DEV MODE] Password reset link for user@example.com:
   http://localhost:3000/reset-password?token=abc123...
   ```

2. **UI Display**: Reset link is shown in the frontend:
   - Yellow/amber notification box with DEV MODE label
   - Clickable link for easy testing
   - Instructions for developers

3. **API Response**: Includes `devMode: true` and `resetLink` in response

## Email Provider Integration

To enable production email sending:

### 1. Configure SMTP Environment Variables

Create or update `.env` in the `backend` directory:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Frontend URL for reset links
FRONTEND_URL=https://yourdomain.com
```

### 2. Provider-Specific Setup

**Gmail**:
- Use App Passwords (not regular password)
- Enable 2FA first
- Generate app password at: https://myaccount.google.com/apppasswords
- Use `smtp.gmail.com` port `587`

**SendGrid**:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>
```

**Mailgun**:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=<your-mailgun-password>
```

**AWS SES**:
```env
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=<your-ses-access-key-id>
SMTP_PASS=<your-ses-secret-access-key>
```

### 3. Test Email Sending

```bash
curl -X POST http://localhost:5000/api/guest-auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Check your email inbox for the reset link.

## Usage Flow

### For Guests:

1. **Forgot Password**:
   - Go to guest portal login
   - Click "Forgot your password?"
   - Enter email address
   - Submit form

2. **Check Email**:
   - Look for email with subject "Password Reset Request"
   - Click the reset link (or copy to browser)
   - Link expires in 1 hour

3. **Reset Password**:
   - Enter new password (min 6 characters)
   - Confirm new password
   - Submit form
   - Redirected to login page

4. **Login**:
   - Use new password to login

### Testing (DEV Mode):

1. Request password reset
2. Copy reset link from:
   - Backend console logs
   - Frontend UI (yellow box)
3. Open link in browser
4. Set new password
5. Login with new password

## API Examples

### Request Password Reset

```bash
curl -X POST http://localhost:5000/api/guest-auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"guest@example.com"}'

# Response (DEV mode):
{
  "message": "If an account exists with this email, a password reset link has been sent.",
  "devMode": true,
  "resetLink": "http://localhost:3000/reset-password?token=abc123..."
}
```

### Reset Password with Token

```bash
curl -X POST http://localhost:5000/api/guest-auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token":"abc123...",
    "newPassword":"newSecurePassword123"
  }'

# Response:
{
  "message": "Password reset successful. You can now login with your new password."
}
```

### Test New Password

```bash
curl -X POST http://localhost:5000/api/guest-auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"guest@example.com",
    "password":"newSecurePassword123"
  }'

# Response:
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "guest": { "email": "guest@example.com" }
}
```

## Error Handling

| Scenario | Response |
|----------|----------|
| Email not provided | `400 "Email is required"` |
| Invalid token | `400 "Invalid or expired reset token"` |
| Expired token | `400 "Invalid or expired reset token"` |
| Token already used | `400 "Invalid or expired reset token"` |
| Password too short | `400 "Password must be at least 6 characters long"` |
| Server error | `500 "Failed to process request"` |

## Database Migration

The feature requires a database migration to add password reset fields:

```bash
cd backend
npm run prisma:migrate
```

Migration name: `add_password_reset_fields`

Changes:
- Adds `passwordResetToken` (nullable string)
- Adds `passwordResetExpires` (nullable datetime)

## Troubleshooting

### Reset Link Not Working

- Check token hasn't expired (1 hour limit)
- Verify token hasn't been used already
- Ensure frontend URL is correct in `.env`

### Email Not Sending

- Verify SMTP credentials in `.env`
- Check SMTP server allows connections
- Review backend console for error messages
- Test with DEV mode first

### Token Generation Issues

- Ensure `crypto` module is available (Node.js built-in)
- Check database write permissions
- Verify Prisma schema is up to date

## Future Enhancements

Potential improvements:

- Rate limiting on forgot password requests
- Multiple email templates
- Custom token expiry time
- Email verification before reset
- Password strength requirements
- Account lockout after failed attempts
- Email notification when password changed

## Security Considerations

⚠️ **Important**:
- Never log passwords or tokens in production
- Always use HTTPS in production
- Rotate SMTP credentials regularly
- Monitor for abuse/spam
- Implement rate limiting
- Consider CAPTCHA for forgot password form
