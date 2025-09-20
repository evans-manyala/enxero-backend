import request from 'supertest';
import app from '../app';
import { testHelpers } from './setup-multitenant';

describe('Auth API Integration - Multi-Tenant (Standalone)', () => {
  let testCompany: any;
  let testUser: any;

  beforeAll(async () => {
    // Create a test company and user for standalone tests
    testCompany = await testHelpers.createTestCompany({
      name: 'Standalone Test Company',
      identifier: 'STANDALONE-TEST'
    });
    
    testUser = await testHelpers.createTestUser(testCompany.id, {
      email: 'standalone@test.com',
      username: 'standalone_user'
    });
  }, 30000);

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
      it('should register company and user in single request', async () => {
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
      }, 30000);

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
              companyIdentifier: testCompany.identifier
            });

          expect(res.status).toBe(200);
          expect(res.body.status).toBe('success');
          expect(res.body.data.valid).toBe(true);
          expect(res.body.data).toHaveProperty('companyId');
          expect(res.body.data.companyId).toBe(testCompany.id);
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
              companyIdentifier: testCompany.identifier,
              username: testUser.username
            });

          expect(res.status).toBe(200);
          expect(res.body.status).toBe('success');
          expect(res.body.data.valid).toBe(true);
          expect(res.body.data).toHaveProperty('userId');
          expect(res.body.data.userId).toBe(testUser.id);
        });

        it('should validate existing email as username within company', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step2/username')
            .send({
              companyIdentifier: testCompany.identifier,
              username: testUser.email
            });

          expect(res.status).toBe(200);
          expect(res.body.status).toBe('success');
          expect(res.body.data.valid).toBe(true);
          expect(res.body.data).toHaveProperty('userId');
          expect(res.body.data.userId).toBe(testUser.id);
        });

        it('should reject non-existent username in company', async () => {
          const res = await request(app)
            .post('/api/v1/auth/ui/login/step2/username')
            .send({
              companyIdentifier: testCompany.identifier,
              username: 'nonexistentuser'
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
              companyIdentifier: testCompany.identifier,
              username: testUser.username,
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
              companyIdentifier: testCompany.identifier,
              username: testUser.username,
              password: 'WrongPassword123!'
            });

          expect(res.status).toBe(401);
          expect(res.body.status).toBe('error');
        });
      });
    });

    describe('Enhanced Login with OTP', () => {
      it('should initiate login with valid credentials and company context', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login/initiate')
          .send({
            email: testUser.email,
            password: 'TestPassword123!',
            companyIdentifier: testCompany.identifier
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
            email: testUser.email,
            password: 'WrongPassword123!',
            companyIdentifier: testCompany.identifier
          });

        expect(res.status).toBe(401);
        expect(res.body.status).toBe('error');
      });

      it('should not initiate login with wrong company context', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login/initiate')
          .send({
            email: testUser.email,
            password: 'TestPassword123!',
            companyIdentifier: 'US-9999999' // Non-existent company
          });

        expect(res.status).toBe(401);
        expect(res.body.status).toBe('error');
      });
    });
  });

  describe('Multi-Tenant Security Tests', () => {
    describe('Tenant Isolation', () => {
      it('should maintain tenant isolation', async () => {
        // Verify that the test user belongs to the correct company
        const userIsolation = await testHelpers.verifyTenantIsolation(testUser.id, testCompany.id);
        expect(userIsolation).toBe(true);
      });

      it('should prevent cross-tenant access', async () => {
        // Create another company to test cross-tenant access
        const otherCompany = await testHelpers.createTestCompany({
          name: 'Other Company',
          identifier: 'OTHER-COMP'
        });
        
        const crossTenantAccess = await testHelpers.testCrossTenantAccess(testUser.id, otherCompany.id);
        expect(crossTenantAccess).toBe(true);
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
  });
});