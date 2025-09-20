import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

// Create a new Prisma Client instance for testing
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'test' ? [] : ['query', 'info', 'warn', 'error'],
});

// Global test state
let isSetupComplete = false;
let testCompanyId: string;

// Clean up the database before all tests
beforeAll(async () => {
  await setupTestEnvironment();
  isSetupComplete = true;
}, 30000); // 30 second timeout for setup

// Clean up between each test to prevent data pollution
beforeEach(async () => {
  if (isSetupComplete) {
    await cleanupTestData();
  }
}, 10000); // 10 second timeout for cleanup

// Disconnect Prisma after all tests
afterAll(async () => {
  await cleanupDatabase();
  await prisma.$disconnect();
}, 30000);

// Setup test environment with required company and roles
async function setupTestEnvironment() {
  await cleanupDatabase();
  
  // Create a test company first (required for roles and users)
  const testCompany = await prisma.company.create({
    data: {
      name: 'Test Company',
      identifier: 'TEST_COMPANY',
      isActive: true,
    },
  });
  testCompanyId = testCompany.id;
  
  // Create essential roles for testing
  const roles = [
    {
      name: 'USER',
      description: 'Default user role',
      permissions: ['read:profile', 'write:profile'],
      isActive: true,
      companyId: testCompanyId,
    },
    {
      name: 'ADMIN',
      description: 'Administrator role',
      permissions: [
        'read:all', 'write:all', 'delete:all', 
        'manage:users', 'manage:roles', 'manage:companies',
        'read:audit', 'write:audit', 'read:system', 'write:system'
      ],
      isActive: true,
      companyId: testCompanyId,
    },
    {
      name: 'EMPLOYEE_MANAGER',
      description: 'Employee manager role',
      permissions: ['read:employees', 'write:employees', 'manage:employees'],
      isActive: true,
      companyId: testCompanyId,
    }
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { 
        name_companyId: { 
          name: roleData.name, 
          companyId: testCompanyId 
        } 
      },
      update: roleData,
      create: roleData,
    });
  }
}

// Clean up test data between tests (preserves company and roles)
async function cleanupTestData() {
  if (!testCompanyId) return;

  try {
    // Delete in order to respect foreign key constraints
    await prisma.failedLoginAttempt.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.userSession.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.userActivity.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.formSubmission.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.formResponse.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.formField.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.form.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.notification.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.payrollRecord.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.payrollPeriod.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.payrollConfig.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.leaveRequest.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.leaveBalance.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.leaveType.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.file.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.auditLog.deleteMany(); // AuditLog doesn't have companyId
    await prisma.integration.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.employee.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.refreshToken.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.user.deleteMany({ where: { companyId: testCompanyId } });
    
    // Clean up test-created roles (preserve essential ones)
    await prisma.role.deleteMany({
      where: {
        companyId: testCompanyId,
        name: {
          notIn: ['USER', 'ADMIN', 'EMPLOYEE_MANAGER']
        }
      }
    });
  } catch (error) {
    // Continue even if cleanup fails
  }
}

// Complete database cleanup (for teardown)
async function cleanupDatabase() {
  try {
    // Delete in order to respect foreign key constraints
    await prisma.failedLoginAttempt.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.userActivity.deleteMany();
    await prisma.formSubmission.deleteMany();
    await prisma.formResponse.deleteMany();
    await prisma.formField.deleteMany();
    await prisma.form.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.payrollRecord.deleteMany();
    await prisma.payrollPeriod.deleteMany();
    await prisma.payrollConfig.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.leaveBalance.deleteMany();
    await prisma.leaveType.deleteMany();
    await prisma.file.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.integration.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.company.deleteMany();
  } catch (error) {
    // Continue even if cleanup fails
  }
}

// Helper functions for tests
export const testHelpers = {
  prisma,
  getTestCompanyId: () => testCompanyId,
  
  // Create a test user with specific role
  async createTestUser(roleType: 'USER' | 'ADMIN' | 'EMPLOYEE_MANAGER' = 'USER') {
    const role = await prisma.role.findUnique({ 
      where: { 
        name_companyId: { 
          name: roleType, 
          companyId: testCompanyId 
        } 
      } 
    });
    if (!role) {
      throw new Error(`Role ${roleType} not found`);
    }

    const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    return await prisma.user.create({
      data: {
        email: `test_${uniqueId}@example.com`,
        username: `test_${uniqueId}`,
        password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "password"
        firstName: 'Test',
        lastName: 'User',
        roleId: role.id,
        companyId: testCompanyId,
        isActive: true,
      },
      include: { role: true, company: true },
    });
  },

  // Create a test company (separate from the main test company)
  async createTestCompany() {
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    return await prisma.company.create({
      data: {
        name: `Test Company ${uniqueId}`,
        identifier: `TEST_${uniqueId}`,
        isActive: true,
      },
    });
  },

  // Generate unique test email
  generateTestEmail() {
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    return `test_${uniqueId}@example.com`;
  },

  // Clean specific test data
  async cleanupTestUser(email: string) {
    await prisma.user.deleteMany({ where: { email } });
  },

  async cleanupTestCompany(id: string) {
    await prisma.company.delete({ where: { id } });
  },
};

// Export the prisma client for direct use in tests
export { prisma };
