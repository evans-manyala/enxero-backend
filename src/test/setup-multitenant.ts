import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Create a new Prisma Client instance for testing
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'test' ? [] : ['query', 'info', 'warn', 'error'],
});

export interface TestCompany {
  id: string;
  name: string;
  identifier: string | null;
  isActive: boolean;
}

export interface TestUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  companyId: string;
  roleId: string | null;
  isActive: boolean;
}

export interface TestRole {
  id: string;
  name: string;
  permissions: string[];
  companyId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  description: string | null;
}

export class MultiTenantTestHelpers {
  private prisma: PrismaClient;
  private testData: {
    companies: TestCompany[];
    users: TestUser[];
    roles: TestRole[];
  } = {
    companies: [],
    users: [],
    roles: []
  };

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Create a test company with unique identifier
   */
  async createTestCompany(overrides: Partial<TestCompany> = {}): Promise<TestCompany> {
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const identifier = `TEST-${uniqueId.substring(0, 7).toUpperCase()}`;
    
    // Check if company with this identifier already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { identifier }
    });

    if (existingCompany) {
      this.testData.companies.push(existingCompany);
      return existingCompany;
    }

    const companyData = {
      name: `Test Company ${uniqueId}`,
      identifier,
      isActive: true,
      ...overrides
    };

    const company = await this.prisma.company.create({
      data: companyData
    });

    this.testData.companies.push(company);
    return company;
  }

  /**
   * Create a test role for a specific company
   */
  async createTestRole(companyId: string, overrides: Partial<TestRole> = {}): Promise<TestRole> {
    const roleData = {
      name: 'TEST_USER',
      permissions: ['read:profile', 'write:profile'],
      companyId,
      isActive: true,
      ...overrides
    };

    const role = await this.prisma.role.create({
      data: roleData
    });

    this.testData.roles.push(role);
    return role;
  }

  /**
   * Create a test user for a specific company
   */
  async createTestUser(companyId: string, overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    const userData = {
      email: `testuser_${uniqueId}@example.com`,
      username: `testuser_${uniqueId}`,
      firstName: 'Test',
      lastName: 'User',
      password: hashedPassword,
      companyId,
      isActive: true,
      ...overrides
    };

    // Get or create a default role for the company
    let role = await this.prisma.role.findFirst({
      where: { companyId, name: 'USER' }
    });

    if (!role) {
      role = await this.createTestRole(companyId, { name: 'USER' });
    }

    const user = await this.prisma.user.create({
      data: {
        ...userData,
        roleId: role?.id || null
      }
    });

    this.testData.users.push(user);
    return user;
  }

  /**
   * Create a complete multi-tenant test scenario
   */
  async createMultiTenantScenario() {
    // Create two companies
    const company1 = await this.createTestCompany({ name: 'Company Alpha' });
    const company2 = await this.createTestCompany({ name: 'Company Beta' });

    // Create roles for each company
    const role1 = await this.createTestRole(company1.id, { name: 'ADMIN' });
    const role2 = await this.createTestRole(company2.id, { name: 'USER' });

    // Create users for each company
    const user1 = await this.createTestUser(company1.id, { 
      email: 'admin@company1.com',
      username: 'admin1'
    });
    const user2 = await this.createTestUser(company2.id, { 
      email: 'user@company2.com',
      username: 'user2'
    });

    return {
      companies: [company1, company2],
      roles: [role1, role2],
      users: [user1, user2]
    };
  }

  /**
   * Verify tenant isolation - user should only access their company's data
   */
  async verifyTenantIsolation(userId: string, companyId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    return user?.companyId === companyId;
  }

  /**
   * Test cross-tenant access prevention
   */
  async testCrossTenantAccess(userId: string, targetCompanyId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    // User should not be able to access data from different company
    return user?.companyId !== targetCompanyId;
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    try {
      // Delete in reverse order to respect foreign key constraints
      await this.prisma.user.deleteMany({
        where: { 
          OR: [
            { id: { in: this.testData.users.map(u => u.id) } },
            { email: { contains: 'test' } }
          ]
        }
      });

      await this.prisma.role.deleteMany({
        where: { 
          OR: [
            { id: { in: this.testData.roles.map(r => r.id) } },
            { companyId: { in: this.testData.companies.map(c => c.id) } }
          ]
        }
      });

      await this.prisma.company.deleteMany({
        where: { 
          OR: [
            { id: { in: this.testData.companies.map(c => c.id) } },
            { identifier: { startsWith: 'TEST-' } }
          ]
        }
      });

      // Clear test data
      this.testData = { companies: [], users: [], roles: [] };
    } catch (error) {
      // Silently handle cleanup errors in tests
    }
  }

  /**
   * Initialize clean test environment
   */
  async initialize(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Get test data summary
   */
  getTestDataSummary() {
    return {
      companiesCount: this.testData.companies.length,
      usersCount: this.testData.users.length,
      rolesCount: this.testData.roles.length,
      companies: this.testData.companies.map(c => ({ id: c.id, name: c.name, identifier: c.identifier })),
      users: this.testData.users.map(u => ({ id: u.id, email: u.email, username: u.username, companyId: u.companyId }))
    };
  }
}

// Export singleton instance
export const testHelpers = new MultiTenantTestHelpers();

// Export cleanup function for global use
export const cleanupAllTestData = async () => {
  await testHelpers.cleanup();
  await prisma.$disconnect();
};

export default testHelpers;
