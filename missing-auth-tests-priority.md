# Missing Auth Test Coverage - Priority Implementation

## High Priority (Security Critical)

### 1. TOTP/2FA Management Tests
```typescript
// Add to auth.api.spec.ts or create auth.2fa.spec.ts

describe('2FA Management', () => {
  test('should setup 2FA for authenticated user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/2fa/setup')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    
    expect(res.body.data).toHaveProperty('qrCode');
    expect(res.body.data).toHaveProperty('secret');
  });

  test('should enable 2FA with valid TOTP code', async () => {
    const res = await request(app)
      .post('/api/v1/auth/2fa/enable')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ totpCode: '123456' })
      .expect(200);
  });

  test('should complete TOTP login flow', async () => {
    const res = await request(app)
      .post('/api/v1/auth/ui/login/step4/totp')
      .send({
        companyIdentifier: 'US-1234567',
        username: 'testuser',
        totpToken: '123456'
      })
      .expect(200);
    
    expect(res.body.data).toHaveProperty('accessToken');
  });
});
```

### 2. Enhanced Login Verification Tests
```typescript
describe('Enhanced Login Verification', () => {
  test('should verify OTP and complete login', async () => {
    // First initiate login
    const initRes = await request(app)
      .post('/api/v1/auth/login/initiate')
      .send({
        email: 'test@example.com',
        password: 'password'
      });
    
    // Then verify OTP
    const res = await request(app)
      .post('/api/v1/auth/login/verify')
      .send({
        loginToken: initRes.body.data.loginToken,
        otpCode: '123456'
      })
      .expect(200);
    
    expect(res.body.data).toHaveProperty('accessToken');
  });
});
```

## Medium Priority (Feature Completeness)

### 3. Multi-Step Registration Tests
```typescript
describe('Multi-Step Registration Flow', () => {
  test('should complete step 1 - company details', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register/step1')
      .send({
        companyName: 'Test Company',
        countryCode: 'US',
        phoneNumber: '+1234567890',
        ownerEmail: 'owner@test.com',
        ownerFirstName: 'John',
        ownerLastName: 'Doe'
      })
      .expect(201);
    
    expect(res.body.data).toHaveProperty('sessionToken');
    expect(res.body.data).toHaveProperty('companyIdentifier');
  });

  test('should complete step 2 - credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register/step2')
      .send({
        sessionToken: 'session_token',
        username: 'testuser',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
      .expect(200);
  });

  test('should complete step 3 - 2FA setup', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register/step3')
      .send({
        sessionToken: 'session_token',
        twoFactorToken: '123456'
      })
      .expect(200);
  });
});
```

### 4. Workspace Management Tests
```typescript
describe('Workspace Management', () => {
  test('should check workspace access', async () => {
    const res = await request(app)
      .post('/api/v1/auth/workspace/check-access')
      .send({ userId: 'user-id' })
      .expect(200);
  });

  test('should get user workspaces', async () => {
    const res = await request(app)
      .get('/api/v1/auth/workspaces/test@example.com')
      .expect(200);
    
    expect(res.body.data).toHaveProperty('workspaces');
  });
});
```

## Low Priority (Utility Functions)

### 5. Support Function Tests
```typescript
describe('Support Functions', () => {
  test('should resend registration email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register/resend-email')
      .send({
        sessionToken: 'session_token',
        step: 1
      })
      .expect(200);
  });

  test('should resend login OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login/resend-otp')
      .send({ loginToken: 'login_token' })
      .expect(200);
  });

  test('should get registration status', async () => {
    const res = await request(app)
      .get('/api/v1/auth/register/status/test@example.com')
      .expect(200);
  });
});
```

## Implementation Strategy

1. **Week 1**: Implement High Priority tests (2FA & Enhanced Login)
2. **Week 2**: Add Multi-Step Registration tests
3. **Week 3**: Complete Workspace Management tests
4. **Week 4**: Add Support Function tests

## Test Data Requirements

You'll need to create additional test helpers for:
- Mock TOTP code generation
- Session token management
- Email verification mocking
- 2FA setup simulation

## Security Considerations

- Test rate limiting on all OTP endpoints
- Verify tenant isolation in all multi-tenant operations
- Test authentication bypass attempts
- Validate input sanitization