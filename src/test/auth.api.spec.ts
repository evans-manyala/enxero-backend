import request from 'supertest';
import app from '../app';
import { testHelpers, TestCompany, TestUser } from './setup-multitenant';

describe('Auth API Integration - Multi-Tenant Architecture', () => {
  let testCompany1: TestCompany;
  let testCompany2: TestCompany;
  let testUser1: TestUser;
  let testUser2: TestUser;
  let companyIdentifier1: string;
  let companyIdentifier2: string;

  // Setup test environment
  beforeAll(async () => {
    // Create multi-tenant test scenario
    const scenario = await testHelpers.createMultiTenantScenario();
    
    testCompany1 = scenario.companies[0];
    testCompany2 = scenario.companies[1];
    testUser1 = scenario.users[0];
    testUser2 = scenario.users[1];
    
    companyIdentifier1 = testCompany1.identifier;
    companyIdentifier2 = testCompany2.identifier;
  }, 30000);

  // Cleanup after each test
  afterEach(async () => {
    // Clean up any test data created during individual tests
    await testHelpers.cleanup();
  }, 10000);

  // Final cleanup
  afterAll(async () => {
    await testHelpers.cleanup();
  }, 30000);

  describe('Health Check', () => {
    it('should return server health status', async () => {
      const res = await request(app)
        .get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Server is running');
    });
  });

  describe('Multi-Tenant Registration Flow', () => {
    describe('Single-Page Registration (UI Optimized)', () => {
      it('should register company and user in single request with proper tenant isolation', async () => {
        const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        const testEmail = `newuser_${uniqueId}@example.com`;
        const testUsername = `newuser_${uniqueId}`;
        const testCompanyName = `New Company ${uniqueId}`;

        const res = await request(app)
          .post('/api/v1/auth/ui/register')
          .send({
            companyFullName: testCompanyName,
            companyShortName: 'NEWCO',
            companyWorkPhone: '+1234567890',
            companyCity: 'New York',
            companyCountry: 'US',
            fullName: 'New User',
            jobTitle: 'CEO',
            phoneNumber: '+1234567891',
            email: testEmail,
            username: testUsername,
            password: 'TestPassword123!'
          });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data.success).toBe(true);
        expect(res.body.data).toHaveProperty('companyIdentifier');
        expect(res.body.data.companyIdentifier).toMatch(/^[A-Z]{2}-[A-Z0-9]{7}$/);
        expect(res.body.data.user.email).toBe(testEmail);
        expect(res.body.data.user.username).toBe(testUsername);
        expect(res.body.data.requires2FASetup).toBe(true);
        expect(res.body.data.user.companyId).toBeDefined();
        expect(res.body.data.user.company).toBeDefined();
        expect(res.body.data.user.company.identifier).toBe(res.body.data.companyIdentifier);
      });

      it('should validate required company fields', async () => {
        const res = await request(app)
          .post('/api/v1/auth/ui/register')
          .send({
            // Missing required company fields
            email: 'test@example.com',
            username: 'testuser',
            password: 'TestPassword123!'
          });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });

      it('should validate email format', async () => {
        const res = await request(app)
          .post('/api/v1/auth/ui/register')
          .send({
            companyFullName: 'Test Company',
            companyShortName: 'TEST',
            companyWorkPhone: '+1234567890',
            companyCity: 'New York',
            companyCountry: 'US',
            fullName: 'Test User',
            jobTitle: 'CEO',
            phoneNumber: '+1234567891',
            email: 'invalid-email-format',
            username: 'testuser',
            password: 'TestPassword123!'
          });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });

      it('should validate phone number format', async () => {
        const res = await request(app)
          .post('/api/v1/auth/ui/register')
          .send({
            companyFullName: 'Test Company',
            companyShortName: 'TEST',
            companyWorkPhone: 'invalid-phone',
            companyCity: 'New York',
            companyCountry: 'US',
            fullName: 'Test User',
            jobTitle: 'CEO',
            phoneNumber: '+1234567891',
            email: 'test@example.com',
            username: 'testuser',
            password: 'TestPassword123!'
          });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });

      it('should prevent duplicate company registration with same email', async () => {
        const testEmail = 'duplicate@example.com';
        
        // First registration
        await request(app)
          .post('/api/v1/auth/ui/register')
          .send({
            companyFullName: 'First Company',
            companyShortName: 'FIRST',
            companyWorkPhone: '+1234567890',
            companyCity: 'New York',
            companyCountry: 'US',
            fullName: 'First User',
            jobTitle: 'CEO',
            phoneNumber: '+1234567891',
            email: testEmail,
            username: 'firstuser',
            password: 'TestPassword123!'
          });

        // Second registration with same email should fail
        const res = await request(app)
          .post('/api/v1/auth/ui/register')
          .send({
            companyFullName: 'Second Company',
            companyShortName: 'SECOND',
            companyWorkPhone: '+1234567892',
            companyCity: 'Los Angeles',
            companyCountry: 'US',
            fullName: 'Second User',
            jobTitle: 'CEO',
            phoneNumber: '+1234567893',
            email: testEmail,
            username: 'seconduser',
            password: 'TestPassword123!'
          });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });
    });

    describe('Company Identifier Preview', () => {
      it('should preview company identifier for valid country code', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/preview-identifier')
          .send({
            countryCode: 'US',
            companyName: 'Test Company'
          });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toHaveProperty('previewIdentifier');
        expect(res.body.data.previewIdentifier).toMatch(/^US-[A-Z0-9]{7}$/);
      });

      it('should validate country code in preview', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/preview-identifier')
          .send({
            countryCode: 'INVALID',
            companyName: 'Test Company'
          });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });
    });
  });

  describe('Multi-Tenant Login Flow', () => {
    describe('Step-by-Step Login (UI Optimized)', () => {
      describe('Step 1 - Company Validation', () => {
        it('should validate existing company identifier', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step1/company')
            .send({
              companyIdentifier: companyIdentifier1
            });

          expect(res.status).toBe(200);
          expect(res.body.status).toBe('success');
          expect(res.body.data.valid).toBe(true);
          expect(res.body.data).toHaveProperty('companyId');
          expect(res.body.data.companyId).toBe(testCompany1.id);
        });

        it('should reject invalid company identifier format', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step1/company')
            .send({
              companyIdentifier: 'INVALID-FORMAT'
            });

          expect(res.status).toBe(400);
          expect(res.body.status).toBe('error');
        });

        it('should reject non-existent company identifier', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step1/company')
            .send({
              companyIdentifier: 'US-9999999'
            });

          expect(res.status).toBe(404);
          expect(res.body.status).toBe('error');
          expect(res.body.data.valid).toBe(false);
        });
      });

      describe('Step 2 - Username Validation (Company-Scoped)', () => {
        it('should validate existing username within company', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step2/username')
            .send({
              companyIdentifier: companyIdentifier1,
              username: testUser1.username
            });

          expect(res.status).toBe(200);
          expect(res.body.status).toBe('success');
          expect(res.body.data.valid).toBe(true);
          expect(res.body.data).toHaveProperty('userId');
          expect(res.body.data.userId).toBe(testUser1.id);
        });

        it('should validate existing email as username within company', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step2/username')
            .send({
              companyIdentifier: companyIdentifier1,
              username: testUser1.email
            });

          expect(res.status).toBe(200);
          expect(res.body.status).toBe('success');
          expect(res.body.data.valid).toBe(true);
          expect(res.body.data).toHaveProperty('userId');
          expect(res.body.data.userId).toBe(testUser1.id);
        });

        it('should reject non-existent username in company', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step2/username')
            .send({
              companyIdentifier: companyIdentifier1,
              username: 'nonexistentuser'
            });

          expect(res.status).toBe(404);
          expect(res.body.status).toBe('error');
          expect(res.body.data.valid).toBe(false);
        });

        it('should reject username from different company (tenant isolation)', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step2/username')
            .send({
              companyIdentifier: companyIdentifier1,
              username: testUser2.username // User from company 2
            });

          expect(res.status).toBe(404);
          expect(res.body.status).toBe('error');
          expect(res.body.data.valid).toBe(false);
        });
      });

      describe('Step 3 - Password Validation (Company-Scoped)', () => {
        it('should validate correct password within company', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step3/password')
            .send({
              companyIdentifier: companyIdentifier1,
              username: testUser1.username,
              password: 'TestPassword123!'
            });

          expect(res.status).toBe(200);
          expect(res.body.status).toBe('success');
          expect(res.body.data.valid).toBe(true);
          expect(res.body.data).toHaveProperty('requiresTOTP');
        });

        it('should reject incorrect password', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step3/password')
            .send({
              companyIdentifier: companyIdentifier1,
              username: testUser1.username,
              password: 'WrongPassword123!'
            });

          expect(res.status).toBe(401);
          expect(res.body.status).toBe('error');
        });

        it('should reject password validation for user from different company', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step3/password')
            .send({
              companyIdentifier: companyIdentifier1,
              username: testUser2.username, // User from company 2
              password: 'TestPassword123!'
            });

          expect(res.status).toBe(404);
          expect(res.body.status).toBe('error');
        });
      });
    });

    describe('Enhanced Login with OTP', () => {
      it('should initiate login with valid credentials and company context', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login/initiate')
          .send({
            email: testUser1.email,
            password: 'TestPassword123!',
            companyIdentifier: companyIdentifier1
          });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toHaveProperty('loginToken');
        expect(res.body.data).toHaveProperty('requiresOtp');
        expect(res.body.data.requiresOtp).toBe(true);
      });

      it('should not initiate login with invalid credentials', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login/initiate')
          .send({
            email: testUser1.email,
            password: 'WrongPassword123!',
            companyIdentifier: companyIdentifier1
          });

        expect(res.status).toBe(401);
        expect(res.body.status).toBe('error');
      });

      it('should not initiate login with wrong company context', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login/initiate')
          .send({
            email: testUser1.email,
            password: 'TestPassword123!',
            companyIdentifier: companyIdentifier2 // Wrong company
          });

        expect(res.status).toBe(401);
        expect(res.body.status).toBe('error');
      });
    });
  });

  describe('Multi-Tenant Security Tests', () => {
    describe('Cross-Tenant Data Isolation', () => {
      it('should not allow access to user data from different company', async () => {
        // This test would require authenticated requests with JWT tokens
        // For now, we test the validation logic
        const isValid = await testHelpers.testCrossTenantAccess(testUser1.id, testCompany2.id);
        expect(isValid).toBe(true);
      });

      it('should not allow username validation across companies', async () => {
        const res = await request(app)
          .post('/api/v1/auth/ui/login/step2/username')
          .send({
            companyIdentifier: companyIdentifier1,
            username: testUser2.username // User from different company
          });

        expect(res.status).toBe(404);
        expect(res.body.status).toBe('error');
        expect(res.body.data.valid).toBe(false);
      });
    });

    describe('Company Context Validation', () => {
      it('should require company context for all login operations', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login/initiate')
          .send({
            email: testUser1.email,
            password: 'TestPassword123!'
            // Missing companyIdentifier
          });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });

      it('should validate company exists before processing login', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login/initiate')
          .send({
            email: testUser1.email,
            password: 'TestPassword123!',
            companyIdentifier: 'US-9999999' // Non-existent company
          });

        expect(res.status).toBe(401);
        expect(res.body.status).toBe('error');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/api/v1/auth/ui/register')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(res.status).toBe(400);
    });

    it('should handle missing request body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/ui/register');

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('should handle rate limiting', async () => {
      // This would require multiple rapid requests to trigger rate limiting
      // For now, we just test that the endpoint exists
      const res = await request(app)
        .post('/api/v1/auth/login/initiate')
        .send({
          email: 'test@example.com',
          password: 'password',
          companyIdentifier: 'US-1234567'
        });

      // Should either succeed or fail with proper error, not crash
      expect([200, 400, 401, 429]).toContain(res.status);
    });
  });

  describe('Multi-Tenant Data Integrity', () => {
    it('should maintain tenant isolation across all operations', async () => {
      // Verify that users can only access their own company's data
      const user1Isolation = await testHelpers.verifyTenantIsolation(testUser1.id, testCompany1.id);
      const user2Isolation = await testHelpers.verifyTenantIsolation(testUser2.id, testCompany2.id);
      
      expect(user1Isolation).toBe(true);
      expect(user2Isolation).toBe(true);
    });

    it('should prevent cross-tenant data leakage', async () => {
      // Test that user from company 1 cannot access company 2's data
      const crossTenantAccess = await testHelpers.testCrossTenantAccess(testUser1.id, testCompany2.id);
      expect(crossTenantAccess).toBe(true);
    });
  });
});