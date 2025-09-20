import request from 'supertest';
import app from '../app';
import { testHelpers, TestCompany, TestUser } from './setup-multitenant';

describe('Auth API - Utility and Support Functions', () => {
  let testCompany: TestCompany;
  let testUser: TestUser;

  beforeAll(async () => {
    const scenario = await testHelpers.createMultiTenantScenario();
    testCompany = scenario.companies[0];
    testUser = scenario.users[0];
  }, 30000);

  afterAll(async () => {
    await testHelpers.cleanup();
  }, 30000);

  describe('Workspace Management Functions', () => {
    describe('Workspace Access Checks', () => {
      it('should check workspace access for valid user', async () => {
        const res = await request(app)
          .post('/api/v1/auth/workspace/check-access')
          .send({
            userId: testUser.id
          });

        expect([200, 400, 404]).toContain(res.status);
        
        if (res.status === 200) {
          expect(res.body.status).toBe('success');
          expect(res.body.data).toBeDefined();
        }
      });

      it('should handle non-existent user for workspace access', async () => {
        const res = await request(app)
          .post('/api/v1/auth/workspace/check-access')
          .send({
            userId: 'non-existent-user-id'
          });

        expect([400, 404]).toContain(res.status);
        expect(res.body.status).toBe('error');
      });

      it('should validate required userId parameter', async () => {
        const res = await request(app)
          .post('/api/v1/auth/workspace/check-access')
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });

      it('should handle invalid userId format', async () => {
        const res = await request(app)
          .post('/api/v1/auth/workspace/check-access')
          .send({
            userId: 'invalid-uuid-format'
          });

        expect([400, 404]).toContain(res.status);
      });
    });

    describe('User Workspaces Retrieval', () => {
      it('should get workspaces for valid user email', async () => {
        const res = await request(app)
          .get(`/api/v1/auth/workspaces/${testUser.email}`);

        expect([200, 404]).toContain(res.status);
        
        if (res.status === 200) {
          expect(res.body.status).toBe('success');
          expect(res.body.data).toHaveProperty('workspaces');
          expect(Array.isArray(res.body.data.workspaces)).toBe(true);
          expect(res.body.data).toHaveProperty('totalCount');
        }
      });

      it('should handle non-existent email for workspaces', async () => {
        const res = await request(app)
          .get('/api/v1/auth/workspaces/nonexistent@example.com');

        expect([200, 404]).toContain(res.status);
        
        if (res.status === 200) {
          // Should return empty workspaces array
          expect(res.body.data.workspaces).toHaveLength(0);
        }
      });

      it('should handle invalid email format in workspaces endpoint', async () => {
        const res = await request(app)
          .get('/api/v1/auth/workspaces/invalid-email-format');

        expect([400, 404]).toContain(res.status);
      });

      it('should handle special characters in email parameter', async () => {
        const specialEmail = encodeURIComponent('user+test@example.com');
        const res = await request(app)
          .get(`/api/v1/auth/workspaces/${specialEmail}`);

        expect([200, 400, 404]).toContain(res.status);
      });
    });
  });

  describe('Registration Support Functions', () => {
    describe('Registration Status Checks', () => {
      it('should get registration status for any email', async () => {
        const res = await request(app)
          .get(`/api/v1/auth/register/status/${testUser.email}`);

        expect([200, 404]).toContain(res.status);
        
        if (res.status === 200) {
          expect(res.body.status).toBe('success');
          expect(res.body.data).toBeDefined();
        }
      });

      it('should handle non-existent email in status check', async () => {
        const res = await request(app)
          .get('/api/v1/auth/register/status/nonexistent@example.com');

        expect([200, 404]).toContain(res.status);
      });

      it('should handle invalid email format in status check', async () => {
        const res = await request(app)
          .get('/api/v1/auth/register/status/invalid-email');

        expect([400, 404]).toContain(res.status);
      });

      it('should handle encoded email in status check', async () => {
        const encodedEmail = encodeURIComponent('test+registration@example.com');
        const res = await request(app)
          .get(`/api/v1/auth/register/status/${encodedEmail}`);

        expect([200, 400, 404]).toContain(res.status);
      });
    });

    describe('Email Resend Functions', () => {
      it('should handle registration email resend request', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/resend-email')
          .send({
            sessionToken: 'mock_session_token',
            step: 1
          });

        expect([200, 400, 401]).toContain(res.status);
        
        if (res.status === 400) {
          expect(res.body.status).toBe('error');
        }
      });

      it('should validate required fields for email resend', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/resend-email')
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });

      it('should validate step parameter for email resend', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/resend-email')
          .send({
            sessionToken: 'mock_session_token',
            step: 'invalid_step'
          });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });

      it('should handle invalid session token for email resend', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/resend-email')
          .send({
            sessionToken: '',
            step: 1
          });

        expect([400, 401]).toContain(res.status);
        expect(res.body.status).toBe('error');
      });

      it('should handle login OTP resend request', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login/resend-otp')
          .send({
            loginToken: 'mock_login_token'
          });

        expect([200, 400, 401]).toContain(res.status);
        
        if (res.status === 400 || res.status === 401) {
          expect(res.body.status).toBe('error');
        }
      });

      it('should validate login token for OTP resend', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login/resend-otp')
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });

      it('should handle empty login token for OTP resend', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login/resend-otp')
          .send({
            loginToken: ''
          });

        expect([400, 401]).toContain(res.status);
        expect(res.body.status).toBe('error');
      });
    });
  });

  describe('Company Identifier Functions', () => {
    describe('Company Identifier Preview', () => {
      it('should generate preview for valid country and company name', async () => {
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
        expect(res.body.data).toHaveProperty('format');
        expect(res.body.data).toHaveProperty('example');
      });

      it('should handle different country codes', async () => {
        const countryCodes = ['CA', 'GB', 'DE', 'FR', 'AU'];
        
        for (const countryCode of countryCodes) {
          const res = await request(app)
            .post('/api/v1/auth/register/preview-identifier')
            .send({
              countryCode: countryCode,
              companyName: 'Test Company'
            });

          expect(res.status).toBe(200);
          expect(res.body.data.previewIdentifier).toMatch(new RegExp(`^${countryCode}-[A-Z0-9]{7}$`));
        }
      });

      it('should reject invalid country codes', async () => {
        const invalidCodes = ['USA', 'XX', 'us', '12', 'A1'];
        
        for (const code of invalidCodes) {
          const res = await request(app)
            .post('/api/v1/auth/register/preview-identifier')
            .send({
              countryCode: code,
              companyName: 'Test Company'
            });

          expect(res.status).toBe(400);
          expect(res.body.status).toBe('error');
        }
      });

      it('should handle missing required fields for preview', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/preview-identifier')
          .send({});

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });

      it('should handle empty company name for preview', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/preview-identifier')
          .send({
            countryCode: 'US',
            companyName: ''
          });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });

      it('should handle very long company names', async () => {
        const longName = 'Very Long Company Name That Exceeds Normal Limits '.repeat(10);
        
        const res = await request(app)
          .post('/api/v1/auth/register/preview-identifier')
          .send({
            countryCode: 'US',
            companyName: longName
          });

        // Should either truncate or reject gracefully
        expect([200, 400]).toContain(res.status);
        
        if (res.status === 200) {
          expect(res.body.data.previewIdentifier).toMatch(/^US-[A-Z0-9]{7}$/);
        }
      });
    });
  });

  describe('API Health and Monitoring', () => {
    it('should respond to health check', async () => {
      const res = await request(app)
        .get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Server is running');
    });

    it('should handle invalid routes gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/auth/nonexistent-endpoint');

      expect(res.status).toBe(404);
    });

    it('should handle invalid HTTP methods', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/register/step1')
        .send({});

      expect([404, 405]).toContain(res.status);
    });
  });

  describe('Content Type and Format Validation', () => {
    it('should require JSON content type for POST requests', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/step1')
        .set('Content-Type', 'text/plain')
        .send('plain text data');

      expect([400, 415]).toContain(res.status);
    });

    it('should handle missing content type header', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/step1')
        .send({
          companyName: 'Test Company',
          countryCode: 'US',
          phoneNumber: '+1234567890',
          ownerEmail: 'test@example.com',
          ownerFirstName: 'Test',
          ownerLastName: 'User'
        });

      // Should either accept or reject gracefully
      expect([201, 400, 415]).toContain(res.status);
    });

    it('should handle malformed JSON gracefully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/step1')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json"}');

      expect(res.status).toBe(400);
    });

    it('should handle empty request body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/step1')
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle minimum valid data lengths', async () => {
      const minData = {
        companyName: 'A', // Minimum 1 character
        countryCode: 'US',
        phoneNumber: '+1234567890',
        ownerEmail: 'a@b.co',
        ownerFirstName: 'A',
        ownerLastName: 'B'
      };

      const res = await request(app)
        .post('/api/v1/auth/register/step1')
        .send(minData);

      // Should either accept or provide clear validation error
      expect([201, 400]).toContain(res.status);
    });

    it('should handle maximum reasonable data lengths', async () => {
      const maxData = {
        companyName: 'A'.repeat(100), // Reasonable maximum
        countryCode: 'US',
        phoneNumber: '+1234567890',
        ownerEmail: 'test@example.com',
        ownerFirstName: 'A'.repeat(50),
        ownerLastName: 'B'.repeat(50)
      };

      const res = await request(app)
        .post('/api/v1/auth/register/step1')
        .send(maxData);

      // Should handle reasonable data sizes
      expect([201, 400]).toContain(res.status);
    });

    it('should reject unreasonably large payloads', async () => {
      const hugeData = {
        companyName: 'A'.repeat(10000),
        countryCode: 'US',
        phoneNumber: '+1234567890',
        ownerEmail: 'test@example.com',
        ownerFirstName: 'A'.repeat(1000),
        ownerLastName: 'B'.repeat(1000)
      };

      const res = await request(app)
        .post('/api/v1/auth/register/step1')
        .send(hugeData);

      // Should reject with appropriate error
      expect([400, 413]).toContain(res.status);
    });
  });
});