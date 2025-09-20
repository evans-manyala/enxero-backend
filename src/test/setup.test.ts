import { testHelpers } from './setup-multitenant';

describe('Multi-Tenant Test Setup', () => {
  afterAll(async () => {
    await testHelpers.cleanup();
  }, 30000);

  it('should create test company and roles', async () => {
    const company = await testHelpers.createTestCompany({
      name: 'Test Company',
      identifier: 'TEST-COMP'
    });
    
    expect(company).toBeDefined();
    expect(company.id).toBeDefined();
    expect(company.name).toBe('Test Company');
    expect(company.identifier).toBe('TEST-COMP');
    
    const userRole = await testHelpers.createTestRole(company.id, {
      name: 'USER',
      permissions: ['read:profile', 'write:profile']
    });
    expect(userRole).toBeDefined();
    expect(userRole.name).toBe('USER');
    expect(userRole.companyId).toBe(company.id);
    
    const adminRole = await testHelpers.createTestRole(company.id, {
      name: 'ADMIN',
      permissions: ['read:all', 'write:all', 'delete:all']
    });
    expect(adminRole).toBeDefined();
    expect(adminRole.name).toBe('ADMIN');
    expect(adminRole.companyId).toBe(company.id);
  });

  it('should create test user with proper company association', async () => {
    const company = await testHelpers.createTestCompany({
      name: 'User Test Company',
      identifier: 'USER-TEST'
    });
    
    const role = await testHelpers.createTestRole(company.id, {
      name: 'USER',
      permissions: ['read:profile', 'write:profile']
    });
    
    const testUser = await testHelpers.createTestUser(company.id, {
      email: 'setup-test@example.com',
      username: 'setup-test'
    });
    
    expect(testUser).toBeDefined();
    expect(testUser.email).toBe('setup-test@example.com');
    expect(testUser.username).toBe('setup-test');
    expect(testUser.companyId).toBe(company.id);
  });

  it('should verify tenant isolation', async () => {
    // Create two companies
    const company1 = await testHelpers.createTestCompany({ name: 'Company 1' });
    const company2 = await testHelpers.createTestCompany({ name: 'Company 2' });
    
    // Create users for each company
    const user1 = await testHelpers.createTestUser(company1.id, { email: 'user1@company1.com' });
    const user2 = await testHelpers.createTestUser(company2.id, { email: 'user2@company2.com' });
    
    // Verify isolation
    const user1Isolation = await testHelpers.verifyTenantIsolation(user1.id, company1.id);
    const user2Isolation = await testHelpers.verifyTenantIsolation(user2.id, company2.id);
    const crossTenantAccess = await testHelpers.testCrossTenantAccess(user1.id, company2.id);
    
    expect(user1Isolation).toBe(true);
    expect(user2Isolation).toBe(true);
    expect(crossTenantAccess).toBe(true);
  });

  it('should create multi-tenant scenario', async () => {
    const scenario = await testHelpers.createMultiTenantScenario();
    
    expect(scenario.companies).toHaveLength(2);
    expect(scenario.users).toHaveLength(2);
    expect(scenario.roles).toHaveLength(2);
    
    // Verify each user belongs to their respective company
    expect(scenario.users[0].companyId).toBe(scenario.companies[0].id);
    expect(scenario.users[1].companyId).toBe(scenario.companies[1].id);
  });
});