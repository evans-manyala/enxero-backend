# TOTP-Based 2FA Authentication Implementation

## Overview

This implementation replaces SMS OTP with Time-based One-Time Password (TOTP) authentication using authenticator apps like Google Authenticator, Authy, or Microsoft Authenticator.

## Features

### ✅ Implemented Features

1. **TOTP-based Login Flow**

   - Password + TOTP verification
   - Graceful fallback for users without 2FA
   - Backup codes support
   - Account lockout after failed attempts

2. **2FA Setup & Management**

   - QR code generation for easy setup
   - Manual secret key entry option
   - Backup codes generation (10 codes)
   - 2FA enable/disable functionality
   - 2FA status checking

3. **Security Features**

   - 15-minute login session timeout
   - Maximum 5 verification attempts
   - Time window tolerance (±2 time steps)
   - Backup code single-use enforcement
   - Password confirmation for sensitive operations

4. **Database Integration**
   - Uses existing Prisma schema
   - Stores 2FA secrets securely
   - Tracks backup code usage
   - Audit logging for all 2FA activities

## API Endpoints

### Authentication Endpoints

#### 1. Initiate Login

```
POST /api/v1/auth/totp/login
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (2FA Required):**

```json
{
  "status": "success",
  "message": "Enter the 6-digit code from your authenticator app",
  "data": {
    "loginToken": "abc123...",
    "requiresTOTP": true,
    "expiresAt": "2025-09-02T12:15:00Z",
    "email": "us**@example.com"
  }
}
```

**Response (No 2FA):**

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "user": {
      "id": "user-id",
      "email": "user@example.com"
      // ... other user data
    }
  }
}
```

#### 2. Verify TOTP Code

```
POST /api/v1/auth/totp/verify
```

**Request:**

```json
{
  "loginToken": "abc123...",
  "totpCode": "123456"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "twoFactorEnabled": true,
      "twoFactorSetupRequired": false
    }
  }
}
```

### 2FA Management Endpoints

#### 3. Setup 2FA

```
POST /api/v1/auth/totp/setup
Authorization: Bearer <access-token>
```

**Response:**

```json
{
  "status": "success",
  "message": "2FA setup initiated. Scan the QR code with your authenticator app.",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "manualEntryKey": "JBSWY3DPEHPK3PXP",
    "backupCodes": ["ABC12345", "DEF67890", ...]
  }
}
```

#### 4. Enable 2FA

```
POST /api/v1/auth/totp/enable
Authorization: Bearer <access-token>
```

**Request:**

```json
{
  "totpCode": "123456"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "2FA enabled successfully. Save your backup codes in a safe place.",
  "data": {
    "backupCodes": [
      { "code": "ABC12345", "used": false },
      { "code": "DEF67890", "used": false }
    ]
  }
}
```

#### 5. Disable 2FA

```
POST /api/v1/auth/totp/disable
Authorization: Bearer <access-token>
```

**Request:**

```json
{
  "password": "CurrentPassword123!"
}
```

#### 6. Generate New Backup Codes

```
POST /api/v1/auth/totp/backup-codes
Authorization: Bearer <access-token>
```

**Request:**

```json
{
  "password": "CurrentPassword123!"
}
```

#### 7. Get 2FA Status

```
GET /api/v1/auth/totp/status
Authorization: Bearer <access-token>
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "enabled": true,
    "setupRequired": false,
    "hasBackupCodes": true,
    "backupCodesCount": 8
  }
}
```

## Database Schema Changes

The implementation uses the existing database schema with these fields:

```prisma
model User {
  // ... existing fields
  twoFactorSecret     String?              @db.VarChar(255)
  twoFactorEnabled    Boolean              @default(false)
  twoFactorSetupRequired Boolean           @default(true)
  backupCodes         String[]
  // ... other fields
}
```

## Frontend Integration

### Login Flow

1. **Step 1:** User enters email/password
2. **Step 2:** If `requiresTOTP: true`, show TOTP input field
3. **Step 3:** User enters 6-digit code from authenticator app
4. **Step 4:** Complete login with tokens

### 2FA Setup Flow

1. **Setup:** Call `/api/v1/auth/totp/setup`
2. **Display:** Show QR code and manual entry key
3. **Verify:** User scans QR code and enters verification code
4. **Enable:** Call `/api/v1/auth/totp/enable` with code
5. **Backup:** Show backup codes for user to save

## Migration from SMS OTP

### 1. Keep SMS OTP "On Ice"

The SMS OTP functionality is preserved in the existing modules:

- `/src/modules/otp/` - SMS OTP service (inactive)
- `/src/modules/auth/services/enhanced-auth.service.ts` - Email OTP login

### 2. Update Authentication Method

Replace calls to SMS OTP endpoints with TOTP endpoints:

**Before (SMS OTP):**

```typescript
// Login initiation
POST / api / v1 / auth / login - initiate;

// OTP verification
POST / api / v1 / auth / login - verify;
```

**After (TOTP):**

```typescript
// Login initiation
POST / api / v1 / auth / totp / login;

// TOTP verification
POST / api / v1 / auth / totp / verify;
```

### 3. Update Registration Flow

The registration process now includes mandatory 2FA setup in step 3:

```typescript
// Step 3: 2FA Setup (updated to use TOTP)
const result = await registrationService.registerStep3({
  sessionToken,
  twoFactorToken, // 6-digit TOTP code
  backupCodes, // Optional: generated if not provided
});
```

## Security Considerations

### ✅ Security Features

1. **Secure Secret Storage**

   - TOTP secrets stored as base32 encoded strings
   - Secrets never exposed in API responses after setup

2. **Backup Code Security**

   - Single-use backup codes
   - Codes removed after use
   - Password required to regenerate

3. **Session Management**

   - 15-minute login session timeout
   - Session invalidation after max attempts
   - Secure session token generation

4. **Rate Limiting**
   - Maximum 5 verification attempts per session
   - Account lockout after repeated failures
   - Audit logging for security events

### 🔒 Best Practices

1. **User Education**

   - Instruct users to save backup codes securely
   - Recommend multiple authenticator apps
   - Provide manual entry key as QR fallback

2. **Recovery Process**

   - Backup codes for device loss scenarios
   - Admin-assisted 2FA reset process
   - Clear documentation for users

3. **Monitoring**
   - Log all 2FA setup/disable events
   - Monitor failed verification attempts
   - Alert on suspicious activities

## Testing

### Manual Testing Steps

1. **Setup 2FA:**

   ```bash
   # 1. Login and get access token
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'

   # 2. Setup 2FA
   curl -X POST http://localhost:3001/api/v1/auth/totp/setup \
     -H "Authorization: Bearer <access-token>"

   # 3. Scan QR code in authenticator app
   # 4. Enable 2FA with code from app
   curl -X POST http://localhost:3001/api/v1/auth/totp/enable \
     -H "Authorization: Bearer <access-token>" \
     -H "Content-Type: application/json" \
     -d '{"totpCode":"123456"}'
   ```

2. **Test Login Flow:**

   ```bash
   # 1. Initiate login
   curl -X POST http://localhost:3001/api/v1/auth/totp/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'

   # 2. Verify with TOTP code
   curl -X POST http://localhost:3001/api/v1/auth/totp/verify \
     -H "Content-Type: application/json" \
     -d '{"loginToken":"<login-token>","totpCode":"123456"}'
   ```

### Automated Tests

Create test files in `/src/modules/auth/services/__tests__/`:

```typescript
// totp-auth.service.spec.ts
describe("TOTPAuthService", () => {
  it("should initiate login successfully");
  it("should verify TOTP code correctly");
  it("should handle backup codes");
  it("should enforce rate limiting");
  // ... more tests
});
```

## Configuration

### Environment Variables

No additional environment variables required. Uses existing JWT configuration:

```env
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Dependencies

Additional packages installed:

```json
{
  "dependencies": {
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "@types/speakeasy": "^2.0.10",
    "@types/qrcode": "^1.5.2"
  }
}
```

## Troubleshooting

### Common Issues

1. **QR Code Not Generating**

   - Check if `qrcode` package is installed
   - Verify secret generation in setup endpoint

2. **TOTP Codes Not Working**

   - Check device time synchronization
   - Verify secret encoding (base32)
   - Ensure 30-second time window alignment

3. **Login Session Expired**
   - Sessions expire after 15 minutes
   - User must restart login flow
   - Clear expired sessions from database

### Debug Logging

Enable debug logging for TOTP operations:

```typescript
logger.debug("TOTP verification attempt", {
  userId,
  timestamp: new Date(),
  timeWindow: speakeasy.totp.time({}),
});
```

## Future Enhancements

### Planned Features

1. **Multi-Device Support**

   - Allow multiple TOTP devices per user
   - Device management interface
   - Named device identification

2. **Advanced Security**

   - Hardware security key support (WebAuthn)
   - Risk-based authentication
   - Geolocation-based verification

3. **Admin Features**

   - Force 2FA for all users
   - 2FA adoption reporting
   - Bulk 2FA reset capabilities

4. **Recovery Options**
   - Email-based 2FA reset
   - Security questions fallback
   - Admin-assisted recovery workflow
