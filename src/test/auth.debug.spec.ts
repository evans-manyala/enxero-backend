import request from 'supertest';
import app from '../app';
import { testHelpers } from './setup-multitenant';

describe('Auth API Debug', () => {
  afterAll(async () => {
    await testHelpers.cleanup();
  }, 30000);

  it('should test basic UI registration endpoint', async () => {
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    
    const registrationData = {
      companyFullName: `Test Company ${uniqueId}`,
      companyShortName: 'TEST',
      companyWorkPhone: '+1234567890',
      companyCity: 'New York',
      companyCountry: 'US',
      fullName: 'Test User',
      jobTitle: 'CEO',
      phoneNumber: '+1234567891',
      email: `testuser_${uniqueId}@example.com`,
      username: `testuser_${uniqueId}`,
      password: 'TestPassword123!'
    };
    
    const res = await request(app)
      .post('/api/v1/auth/ui/register')
      .send(registrationData);
    
    // Debug information will be in test output
    if (res.status !== 201) {
      throw new Error(`Registration failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }
    
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('companyIdentifier');
  });

  it('should test database connectivity from controller', async () => {
    const company = await testHelpers.createTestCompany({
      name: 'Debug Test Company',
      identifier: 'DEBUG-TEST'
    });
    
    const userRole = await testHelpers.createTestRole(company.id, {
      name: 'USER',
      permissions: ['read:profile', 'write:profile']
    });
    
    expect(company).toBeDefined();
    expect(userRole).toBeDefined();
    expect(company.id).toBeDefined();
    expect(userRole.companyId).toBe(company.id);
  });

  it('should test multi-tenant scenario creation', async () => {
    const scenario = await testHelpers.createMultiTenantScenario();
    
    expect(scenario.companies).toHaveLength(2);
    expect(scenario.users).toHaveLength(2);
    expect(scenario.roles).toHaveLength(2);
    
    // Verify tenant isolation
    const user1Isolation = await testHelpers.verifyTenantIsolation(scenario.users[0].id, scenario.companies[0].id);
    const user2Isolation = await testHelpers.verifyTenantIsolation(scenario.users[1].id, scenario.companies[1].id);
    
    expect(user1Isolation).toBe(true);
    expect(user2Isolation).toBe(true);
  });
});