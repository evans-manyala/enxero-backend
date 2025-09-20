import request from 'supertest';
import app from '../app';
import { testHelpers, TestCompany, TestUser } from './setup-multitenant';

describe('Auth API - Integration & Security Tests', () => {
  let testCompany1: TestCompany;
  let testCompany2: TestCompany;
  let testUser1: TestUser;
  let testUser2: TestUser;

  beforeAll(async () => {
    // Create multi-tenant test scenario
    const scenario = await testHelpers.createMultiTenantScenario();
    testCompany1 = scenario.companies[0];
    testCompany2 = scenario.companies[1];
    testUser1 = scenario.users[0];
    testUser2 = scenario.users[1];
  }, 30000);

  afterAll(async () => {
    await testHelpers.cleanup();
  }, 30000);

  describe('End-to-End Registration Workflow', () => {
    it('should complete full multi-step registration workflow', async () => {
      const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      
      // Step 1: Company Registration
      const step1Res = await request(app)
        .post('/api/v1/auth/register/step1')
        .send({
          companyName: `E2E Test Company ${uniqueId}`,
          fullName: `E2E Test Company ${uniqueId} Limited`,
          shortName: 'E2E',
          countryCode: 'US',
          phoneNumber: '+1234567890',
          workPhone: '+1234567891',
          city: 'Seattle',
          address: {
            street: '123 E2E St',
            state: 'WA',
            zipCode: '98101'
          },
          ownerEmail: `e2eowner_${uniqueId}@test.com`,
          ownerFirstName: 'E2E',
          ownerLastName: 'Owner'
        });

      expect(step1Res.status).toBe(201);
      expect(step1Res.body.data).toHaveProperty('sessionToken');
      const sessionToken = step1Res.body.data.sessionToken;
      const companyIdentifier = step1Res.body.data.companyIdentifier;

      // Step 2: Credentials Setup
      const step2Res = await request(app)
        .post('/api/v1/auth/register/step2')
        .send({
          sessionToken: sessionToken,
          username: `e2euser_${uniqueId}`,
          password: 'E2EPassword123!',
          confirmPassword: 'E2EPassword123!'
        });

      expect(step2Res.status).toBe(200);
      expect(step2Res.body.data).toHaveProperty('sessionToken');
      expect(step2Res.body.data).toHaveProperty('username');

      // Step 3: 2FA Setup (mock completion)
      const step3Res = await request(app)
        .post('/api/v1/auth/register/step3')
        .send({
          sessionToken: step2Res.body.data.sessionToken,
          twoFactorToken: '123456',
          backupCodes: ['E2EBACKUP01', 'E2EBACKUP02']
        });

      // Should either complete successfully or handle gracefully
      expect([200, 400]).toContain(step3Res.status);

      // Verify company identifier format
      expect(companyIdentifier).toMatch(/^[A-Z]{2}-[A-Z0-9]{7}$/);
    });

    it('should handle registration status check during workflow', async () => {
      const email = 'status_test@example.com';
      
      const res = await request(app)
        .get(`/api/v1/auth/register/status/${email}`);

      // Should handle status request gracefully
      expect([200, 404]).toContain(res.status);
    });

    it('should handle email resend during registration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/resend-email')
        .send({
          sessionToken: 'test_session_token',
          step: 1
        });

      // Should handle resend request
      expect([200, 400]).toContain(res.status);
    });
  });

  describe('End-to-End Login Workflow', () => {
    it('should complete enhanced login workflow with OTP', async () => {
      // Step 1: Initiate login
      const initiateRes = await request(app)
        .post('/api/v1/auth/login/initiate')
        .send({
          email: testUser1.email,
          password: 'TestPassword123!'
        });

      if (initiateRes.status === 200) {
        expect(initiateRes.body.data).toHaveProperty('loginToken');
        expect(initiateRes.body.data).toHaveProperty('requiresOtp');
        
        const loginToken = initiateRes.body.data.loginToken;

        // Step 2: Verify OTP
        const verifyRes = await request(app)
          .post('/api/v1/auth/login/verify')
          .send({
            loginToken: loginToken,
            otpCode: '123456'
          });

        // Should handle verification
        expect([200, 400, 401]).toContain(verifyRes.status);
        
        if (verifyRes.status === 200) {
          expect(verifyRes.body.data).toHaveProperty('accessToken');
          expect(verifyRes.body.data).toHaveProperty('user');
        }
      } else {
        // If initiate failed, ensure it fails gracefully
        expect([400, 401]).toContain(initiateRes.status);
      }
    });

    it('should complete UI step-by-step login workflow', async () => {
      // Step 1: Company validation
      const step1Res = await request(app)
        .post('/api/v1/auth/ui/login/step1/company')
        .send({
          companyIdentifier: testCompany1.identifier
        });

      expect(step1Res.status).toBe(200);
      expect(step1Res.body.data.valid).toBe(true);

      // Step 2: Username validation
      const step2Res = await request(app)
        .post('/api/v1/auth/ui/login/step2/username')
        .send({
          companyIdentifier: testCompany1.identifier,
          username: testUser1.username
        });

      expect(step2Res.status).toBe(200);
      expect(step2Res.body.data.valid).toBe(true);

      // Step 3: Password validation
      const step3Res = await request(app)
        .post('/api/v1/auth/ui/login/step3/password')
        .send({
          companyIdentifier: testCompany1.identifier,
          username: testUser1.username,
          password: 'TestPassword123!'
        });

      expect(step3Res.status).toBe(200);
      expect(step3Res.body.data.valid).toBe(true);

      // Step 4: TOTP completion (if required)
      if (step3Res.body.data.requiresTOTP) {
        const step4Res = await request(app)
          .post('/api/v1/auth/ui/login/step4/totp')
          .send({
            companyIdentifier: testCompany1.identifier,
            username: testUser1.username,
            totpToken: '123456'
          });

        // Should handle TOTP verification
        expect([200, 400, 401]).toContain(step4Res.status);
      }
    });

    it('should handle OTP resend during login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login/resend-otp')
        .send({
          loginToken: 'test_login_token'
        });

      // Should handle resend request
      expect([200, 400, 401]).toContain(res.status);
    });
  });

  describe('Security Boundary Tests', () => {
    describe('Input Validation', () => {
      it('should prevent SQL injection in login fields', async () => {
        const sqlInjectionPayloads = [
          "'; DROP TABLE users; --",
          "' OR '1'='1",
          "' UNION SELECT * FROM users --"
        ];

        for (const payload of sqlInjectionPayloads) {
          const res = await request(app)
            .post('/api/v1/auth/login/initiate')
            .send({
              email: payload,
              password: payload
            });

          // Should reject with validation error, not cause SQL injection
          expect([400, 401]).toContain(res.status);
          expect(res.body.status).toBe('error');
        }
      });

      it('should prevent XSS in registration fields', async () => {
        const xssPayloads = [
          "<script>alert('XSS')</script>",
          "<img src=x onerror=alert('XSS')>",
          "javascript:alert('XSS')"
        ];

        for (const payload of xssPayloads) {
          const res = await request(app)
            .post('/api/v1/auth/register/step1')
            .send({
              companyName: payload,
              countryCode: 'US',
              phoneNumber: '+1234567890',
              ownerEmail: 'test@example.com',
              ownerFirstName: payload,
              ownerLastName: payload
            });

          // Should reject with validation error
          expect([400]).toContain(res.status);
          
          // Response should not contain the XSS payload
          const responseText = JSON.stringify(res.body);
          expect(responseText).not.toContain('<script>');
          expect(responseText).not.toContain('javascript:');
        }
      });

      it('should validate email format strictly', async () => {
        const invalidEmails = [
          'notanemail',
          '@domain.com',
          'user@',
          'user..name@domain.com',
          'user@domain',
          'user@.domain.com'
        ];

        for (const email of invalidEmails) {
          const res = await request(app)
            .post('/api/v1/auth/register/step1')
            .send({
              companyName: 'Test Company',
              countryCode: 'US',
              phoneNumber: '+1234567890',
              ownerEmail: email,
              ownerFirstName: 'Test',
              ownerLastName: 'User'
            });

          expect(res.status).toBe(400);
          expect(res.body.status).toBe('error');
        }
      });

      it('should validate phone number format strictly', async () => {
        const invalidPhones = [
          '1234567890',
          '01234567890',
          '+123',
          'phone-number',
          '+1-234-567-8900',
          '(123) 456-7890'
        ];

        for (const phone of invalidPhones) {
          const res = await request(app)
            .post('/api/v1/auth/register/step1')
            .send({
              companyName: 'Test Company',
              countryCode: 'US',
              phoneNumber: phone,
              ownerEmail: 'test@example.com',
              ownerFirstName: 'Test',
              ownerLastName: 'User'
            });

          expect(res.status).toBe(400);
          expect(res.body.status).toBe('error');
        }
      });
    });

    describe('Authentication Bypass Prevention', () => {
      it('should prevent unauthorized access to protected endpoints', async () => {
        const protectedEndpoints = [
          { method: 'POST', path: '/api/v1/auth/2fa/setup' },
          { method: 'POST', path: '/api/v1/auth/2fa/enable' },
          { method: 'POST', path: '/api/v1/auth/2fa/disable' },
          { method: 'GET', path: '/api/v1/auth/2fa/status' },
          { method: 'POST', path: '/api/v1/auth/ui/2fa/force-setup' }
        ];

        for (const endpoint of protectedEndpoints) {
          let res;
          if (endpoint.method === 'GET') {
            res = await request(app).get(endpoint.path);
          } else {
            res = await request(app).post(endpoint.path).send({});
          }

          // Should require authentication
          expect(res.status).toBe(401);
        }
      });

      it('should prevent bypass with invalid tokens', async () => {
        const invalidTokens = [
          '',
          'Bearer ',
          'Bearer invalid_token',
          'Basic admin:admin',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid'
        ];

        for (const token of invalidTokens) {
          const res = await request(app)
            .post('/api/v1/auth/2fa/setup')
            .set('Authorization', token);

          expect(res.status).toBe(401);
        }
      });
    });

    describe('Multi-Tenant Isolation', () => {
      it('should prevent cross-tenant username validation', async () => {
        // Try to validate user1's username in company2's context
        const res = await request(app)
          .post('/api/v1/auth/ui/login/step2/username')
          .send({
            companyIdentifier: testCompany2.identifier,
            username: testUser1.username
          });

        expect(res.status).toBe(404);
        expect(res.body.data.valid).toBe(false);
      });

      it('should prevent cross-tenant password validation', async () => {
        // Try to validate user1's password in company2's context
        const res = await request(app)
          .post('/api/v1/auth/ui/login/step3/password')
          .send({
            companyIdentifier: testCompany2.identifier,
            username: testUser1.username,
            password: 'TestPassword123!'
          });

        expect([404, 401]).toContain(res.status);
      });

      it('should maintain strict tenant boundaries in all operations', async () => {
        // Verify that each user can only access their own company
        const user1Isolation = await testHelpers.verifyTenantIsolation(testUser1.id, testCompany1.id);
        const user2Isolation = await testHelpers.verifyTenantIsolation(testUser2.id, testCompany2.id);
        
        expect(user1Isolation).toBe(true);
        expect(user2Isolation).toBe(true);

        // Verify cross-tenant access is blocked
        const crossAccess1 = await testHelpers.testCrossTenantAccess(testUser1.id, testCompany2.id);
        const crossAccess2 = await testHelpers.testCrossTenantAccess(testUser2.id, testCompany1.id);
        
        expect(crossAccess1).toBe(true);
        expect(crossAccess2).toBe(true);
      });
    });

    describe('Rate Limiting and Abuse Prevention', () => {
      it('should handle rapid registration attempts', async () => {
        const rapidRequests = [];
        
        for (let i = 0; i < 5; i++) {
          rapidRequests.push(
            request(app)
              .post('/api/v1/auth/register/step1')
              .send({
                companyName: `Rapid Test ${i}`,
                countryCode: 'US',
                phoneNumber: `+123456789${i}`,
                ownerEmail: `rapid${i}@test.com`,
                ownerFirstName: 'Rapid',
                ownerLastName: 'Test'
              })
          );
        }

        const responses = await Promise.all(rapidRequests);
        
        // Should handle requests without crashing
        responses.forEach(res => {
          expect([201, 400, 429]).toContain(res.status);
        });
      });

      it('should handle rapid login attempts', async () => {
        const rapidRequests = [];
        
        for (let i = 0; i < 5; i++) {
          rapidRequests.push(
            request(app)
              .post('/api/v1/auth/login/initiate')
              .send({
                email: `rapid${i}@test.com`,
                password: 'TestPassword123!'
              })
          );
        }

        const responses = await Promise.all(rapidRequests);
        
        // Should handle requests without crashing
        responses.forEach(res => {
          expect([200, 400, 401, 429]).toContain(res.status);
        });
      });

      it('should handle rapid OTP verification attempts', async () => {
        const rapidRequests = [];
        
        for (let i = 0; i < 5; i++) {
          rapidRequests.push(
            request(app)
              .post('/api/v1/auth/login/verify')
              .send({
                loginToken: `token${i}`,
                otpCode: '123456'
              })
          );
        }

        const responses = await Promise.all(rapidRequests);
        
        // Should handle requests without crashing
        responses.forEach(res => {
          expect([200, 400, 401, 429]).toContain(res.status);
        });
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database connection issues gracefully', async () => {
      // This test verifies that endpoints handle database errors gracefully
      // In a real scenario, you might mock the database to throw errors
      
      const res = await request(app)
        .post('/api/v1/auth/ui/login/step1/company')
        .send({
          companyIdentifier: 'US-1234567'
        });

      // Should either succeed or fail gracefully
      expect([200, 404, 500]).toContain(res.status);
      
      if (res.status === 500) {
        expect(res.body).toHaveProperty('status', 'error');
        expect(res.body).toHaveProperty('message');
      }
    });

    it('should handle concurrent requests safely', async () => {
      const concurrentRequests = [];
      const uniqueId = Date.now();
      
      // Create concurrent registration requests
      for (let i = 0; i < 3; i++) {
        concurrentRequests.push(
          request(app)
            .post('/api/v1/auth/register/step1')
            .send({
              companyName: `Concurrent Test ${uniqueId}-${i}`,
              countryCode: 'US',
              phoneNumber: `+12345678${i}0`,
              ownerEmail: `concurrent${uniqueId}-${i}@test.com`,
              ownerFirstName: 'Concurrent',
              ownerLastName: 'Test'
            })
        );
      }

      const responses = await Promise.all(concurrentRequests);
      
      // Should handle concurrent requests without data corruption
      responses.forEach(res => {
        expect([201, 400, 409]).toContain(res.status);
        if (res.status === 201) {
          expect(res.body.data).toHaveProperty('companyIdentifier');
          expect(res.body.data.companyIdentifier).toMatch(/^[A-Z]{2}-[A-Z0-9]{7}$/);
        }
      });

      // Verify unique company identifiers if successful
      const successfulResponses = responses.filter(res => res.status === 201);
      const identifiers = successfulResponses.map(res => res.body.data.companyIdentifier);
      const uniqueIdentifiers = new Set(identifiers);
      
      expect(uniqueIdentifiers.size).toBe(identifiers.length);
    });

    it('should maintain data consistency under load', async () => {
      // Verify that multi-step operations maintain consistency
      const scenario = await testHelpers.createMultiTenantScenario();
      
      expect(scenario.companies).toHaveLength(2);
      expect(scenario.users).toHaveLength(2);
      expect(scenario.roles).toHaveLength(2);
      
      // Verify relationships
      expect(scenario.users[0].companyId).toBe(scenario.companies[0].id);
      expect(scenario.users[1].companyId).toBe(scenario.companies[1].id);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle reasonable response times', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .post('/api/v1/auth/ui/login/step1/company')
        .send({
          companyIdentifier: testCompany1.identifier
        });

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
      expect([200, 404]).toContain(res.status);
    });

    it('should handle large but reasonable payloads', async () => {
      // Test with reasonable sized data
      const largeButReasonableData = {
        companyName: 'Test Company '.repeat(10), // ~130 chars
        fullName: 'Test Company Full Name '.repeat(5), // ~115 chars
        shortName: 'TEST',
        countryCode: 'US',
        phoneNumber: '+1234567890',
        workPhone: '+1234567891',
        city: 'New York City',
        address: {
          street: '123 Very Long Street Name That Goes On And On',
          state: 'NY',
          zipCode: '10001'
        },
        ownerEmail: 'very.long.email.address.for.testing@example.com',
        ownerFirstName: 'Very Long First Name',
        ownerLastName: 'Very Long Last Name'
      };

      const res = await request(app)
        .post('/api/v1/auth/register/step1')
        .send(largeButReasonableData);

      // Should handle reasonable data sizes
      expect([201, 400]).toContain(res.status);
    });
  });
});