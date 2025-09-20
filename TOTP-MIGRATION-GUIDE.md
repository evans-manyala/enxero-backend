# Migration Guide: SMS OTP to TOTP Authentication

## Overview

This guide helps you migrate from SMS OTP authentication to TOTP (Time-based One-Time Password) authentication using authenticator apps.

## Why Migrate to TOTP?

### ✅ Advantages of TOTP

- **Better Security**: No dependency on SMS infrastructure
- **Offline Capability**: Works without internet connection
- **Cost Effective**: No SMS charges
- **Industry Standard**: Used by Google, GitHub, AWS, etc.
- **User Friendly**: Faster than SMS delivery

### ❌ SMS OTP Limitations

- SMS delivery delays or failures
- SIM swapping attacks
- Carrier dependency
- Higher operational costs
- Network coverage issues

## Migration Strategy

### Phase 1: Parallel Implementation (Current State)

Both authentication methods are available:

**TOTP Authentication** (Recommended):

```
POST /api/v1/auth/totp/login
POST /api/v1/auth/totp/verify
```

**SMS OTP** (Legacy - On Ice):

```
POST /api/v1/auth/login-initiate
POST /api/v1/auth/login-verify
```

### Phase 2: Gradual User Migration

1. **New Users**: Mandatory TOTP setup during registration
2. **Existing Users**: Optional TOTP setup with incentives
3. **Admin Users**: Force TOTP for high-privilege accounts
4. **Gradual Sunset**: Phase out SMS OTP over 6 months

### Phase 3: Complete Migration

1. **Disable SMS OTP endpoints**
2. **Remove SMS-related dependencies**
3. **Update documentation**
4. **Monitor adoption metrics**

## Implementation Changes

### 1. Frontend Changes

#### Before (SMS OTP):

```typescript
// Step 1: Login initiate
const response = await fetch("/api/v1/auth/login-initiate", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

// Step 2: Enter SMS code
const otpResponse = await fetch("/api/v1/auth/login-verify", {
  method: "POST",
  body: JSON.stringify({ loginToken, otpCode }),
});
```

#### After (TOTP):

```typescript
// Step 1: Login initiate
const response = await fetch("/api/v1/auth/totp/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

// Step 2: Enter authenticator code
if (response.data.requiresTOTP) {
  const totpResponse = await fetch("/api/v1/auth/totp/verify", {
    method: "POST",
    body: JSON.stringify({ loginToken, totpCode }),
  });
}
```

### 2. User Experience Changes

#### TOTP Setup Flow:

1. **Setup Initiation**: User clicks "Enable 2FA"
2. **QR Code Display**: Show QR code and manual entry key
3. **App Installation**: Guide user to install authenticator app
4. **Code Verification**: User enters 6-digit code from app
5. **Backup Codes**: Display backup codes for safekeeping
6. **Confirmation**: 2FA enabled successfully

#### Login Flow Changes:

1. **Same Login**: Email/password entry unchanged
2. **TOTP Prompt**: "Enter code from authenticator app" instead of "Enter SMS code"
3. **Faster Experience**: No waiting for SMS delivery
4. **Backup Option**: Backup codes for emergency access

### 3. Error Handling Updates

#### Before (SMS):

```typescript
// SMS-specific errors
"SMS delivery failed";
"Phone number not verified";
"SMS rate limit exceeded";
```

#### After (TOTP):

```typescript
// TOTP-specific errors
"Invalid authenticator code";
"2FA not set up";
"Maximum verification attempts exceeded";
"Time synchronization issue";
```

## Database Migration

### Schema Changes

No database migration required! The existing schema already supports TOTP:

```sql
-- Existing columns in users table
twoFactorSecret     VARCHAR(255),    -- Stores TOTP secret
twoFactorEnabled    BOOLEAN,         -- 2FA status
backupCodes         TEXT[],          -- Backup codes array
```

### Data Migration

For existing users:

1. **Keep existing data**: No changes to user records
2. **Optional setup**: Users can enable TOTP when ready
3. **Graceful fallback**: Login works without 2FA initially

## User Communication

### Migration Announcement

**Email Template:**

```
Subject: Enhanced Security: New Authenticator App Support

Dear [User],

We're upgrading our security with authenticator app support!

What's New:
✅ Faster login with authenticator apps
✅ Works offline - no more waiting for SMS
✅ More secure than SMS codes
✅ Industry-standard security

Action Required:
- Set up your authenticator app in Account Settings
- Download Google Authenticator, Authy, or Microsoft Authenticator
- Your SMS login will continue working during transition

Questions? Contact support@enxero.com

Best regards,
Enxero Security Team
```

### Setup Instructions

**Help Documentation:**

```markdown
# Setting Up Authenticator App

## Step 1: Download an App

- Google Authenticator (iOS/Android)
- Authy (iOS/Android/Desktop)
- Microsoft Authenticator (iOS/Android)

## Step 2: Enable 2FA

1. Go to Account Settings → Security
2. Click "Enable Two-Factor Authentication"
3. Scan QR code with your authenticator app
4. Enter the 6-digit code from your app
5. Save backup codes in a secure location

## Step 3: Login with New Method

1. Enter email and password as usual
2. When prompted, open your authenticator app
3. Enter the current 6-digit code
4. Complete login

## Backup Codes

- Save backup codes securely
- Each code can only be used once
- Generate new codes if needed
```

## Testing Strategy

### 1. Unit Tests

```typescript
// Test TOTP verification
describe("TOTP Authentication", () => {
  it("should verify valid TOTP codes");
  it("should reject expired codes");
  it("should handle backup codes");
  it("should enforce rate limits");
});
```

### 2. Integration Tests

```typescript
// Test complete login flow
describe("Login Flow", () => {
  it("should complete login with TOTP");
  it("should handle fallback scenarios");
  it("should track security events");
});
```

### 3. User Acceptance Testing

- [ ] QR code scanning works on mobile devices
- [ ] Manual entry works when QR fails
- [ ] Backup codes provide emergency access
- [ ] Error messages are clear and helpful
- [ ] Setup flow is intuitive

## Monitoring & Metrics

### Success Metrics

```sql
-- TOTP adoption rate
SELECT
  COUNT(CASE WHEN twoFactorEnabled = true THEN 1 END) * 100.0 / COUNT(*) as adoption_rate
FROM users
WHERE createdAt >= '2025-09-01';

-- Login success rate
SELECT
  COUNT(CASE WHEN action = 'LOGIN_COMPLETED' THEN 1 END) * 100.0 /
  COUNT(CASE WHEN action = 'LOGIN_INITIATED' THEN 1 END) as success_rate
FROM user_activities
WHERE createdAt >= CURRENT_DATE - INTERVAL '7 days';

-- 2FA setup completion rate
SELECT
  COUNT(CASE WHEN action = '2FA_ENABLED' THEN 1 END) * 100.0 /
  COUNT(CASE WHEN action = '2FA_SETUP_INITIATED' THEN 1 END) as setup_completion_rate
FROM user_activities;
```

### Alert Thresholds

- TOTP setup failure rate > 10%
- Login success rate < 95%
- Backup code usage spike (potential security issue)
- High number of 2FA disable requests

## Rollback Plan

### Emergency Rollback

If TOTP causes issues:

1. **Immediate**: Redirect TOTP endpoints to SMS OTP
2. **Database**: No rollback needed (SMS data preserved)
3. **Frontend**: Feature flag to switch back to SMS
4. **Communication**: Notify users of temporary change

### Rollback Implementation

```typescript
// Feature flag approach
const USE_TOTP = process.env.FEATURE_TOTP_ENABLED === "true";

async function handleLogin(req, res) {
  if (USE_TOTP) {
    return totpAuthService.initiateLogin(req.body);
  } else {
    return enhancedAuthService.initiateLogin(req.body);
  }
}
```

## Timeline

### Week 1-2: Development & Testing

- ✅ TOTP service implementation
- ✅ API endpoints creation
- ✅ Unit test coverage
- [ ] Integration testing
- [ ] Security review

### Week 3-4: Frontend Integration

- [ ] UI components for TOTP setup
- [ ] Login flow updates
- [ ] Error handling improvements
- [ ] User documentation

### Week 5-6: Beta Testing

- [ ] Internal team testing
- [ ] Select user group beta
- [ ] Feedback collection
- [ ] Bug fixes and improvements

### Week 7-8: Gradual Rollout

- [ ] 10% user rollout
- [ ] Monitor metrics
- [ ] 50% user rollout
- [ ] Full rollout

### Week 9-12: SMS Sunset

- [ ] Deprecation notices
- [ ] Forced migration for inactive users
- [ ] SMS endpoint deactivation
- [ ] Code cleanup

## Support & Training

### User Support Scripts

```
Q: My phone was lost/broken, how do I access my account?
A: Use one of your backup codes to login, then set up 2FA on your new device.

Q: The authenticator code isn't working?
A: Check that your device time is correct. Try waiting for the next code (30 seconds).

Q: Can I use multiple devices?
A: Currently one device per account. Save backup codes for emergency access.

Q: How do I disable 2FA?
A: Go to Account Settings → Security → Disable 2FA (requires password confirmation).
```

### Admin Training

- How to assist users with 2FA issues
- When to reset 2FA for users
- Security incident response procedures
- Monitoring dashboard usage

## Security Considerations

### Enhanced Security

- **Secret Storage**: Base32 encoded, never exposed after setup
- **Time Window**: 30-second TOTP validity with ±60 second tolerance
- **Rate Limiting**: Max 5 attempts per login session
- **Audit Logging**: All 2FA events logged for security monitoring

### Risk Mitigation

- **Backup Codes**: 10 single-use codes for device loss
- **Password Reset**: Separate flow, not dependent on 2FA
- **Admin Override**: Support can disable 2FA for account recovery
- **Session Management**: Existing session security unchanged

## Conclusion

The TOTP implementation provides:

- ✅ Enhanced security over SMS OTP
- ✅ Better user experience
- ✅ Cost savings on SMS fees
- ✅ Industry-standard authentication
- ✅ Backward compatibility during transition

The migration preserves all existing functionality while adding robust 2FA capabilities that scale with your security needs.
