import request from 'supertest';
import app from '../app';
import { testHelpers } from './setup-multitenant';

describe('Auth API - Improved Multi-Tenant Tests', () => {
  let testCompany: any;
  let testUser: any;

  beforeAll(async () => {
    // Create a test company and user
    testCompany = await testHelpers.createTestCompany();
    testUser = await testHelpers.createTestUser(testCompany.id);
  }, 30000);

  afterAll(async () => {
    await testHelpers.cleanup();
  }, 30000);

  describe('Company Registration', () => {
    it('should create company with unique identifier', async () => {
      const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      
      const res = await request(app)
        .post('/api/v1/auth/ui/register')
        .send({
          companyFullName: `Test Company ${uniqueId}`,
          companyShortName: 'TEST',
          companyWorkPhone: '+1234567890',
          companyCity: 'New York',
          companyCountry: 'US',
          fullName: 'Test User',
          jobTitle: 'CEO',
          phoneNumber: '+1234567891',
          email: `test_${uniqueId}@example.com`,
          username: `testuser_${uniqueId}`,
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.companyIdentifier).toMatch(/^[A-Z]{2}-[A-Z0-9]{7}$/);
    });
  });

  describe('User Authentication', () => {
    it('should authenticate user within company context', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login/initiate')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
          companyIdentifier: testCompany.identifier
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('loginToken');
    });
  });
});

