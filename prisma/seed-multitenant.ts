import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting multi-tenant database seeding...');

  // Helper function to generate proper company identifier
  function generateCompanyIdentifier(countryCode: string, shortName: string): string {
    // Take first 4 characters of shortName, uppercase, remove special chars
    const cleanShortName = shortName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
    // Generate 2 random digits
    const randomDigits = Math.floor(10 + Math.random() * 90); // 10-99
    // Format: ISO + 4 letters + 2 digits = 8 characters total
    return `${countryCode}${cleanShortName}${randomDigits}`;
  }

  // Create Demo Company 1
  const company1 = await prisma.company.create({
    data: {
      name: 'TechCorp Solutions',
      identifier: generateCompanyIdentifier('US', 'TechCorp'), // US + TECH + 2 digits = US + 6 chars
      fullName: 'TechCorp Solutions Ltd',
      shortName: 'TechCorp',
      workPhone: '+1-555-0101',
      city: 'San Francisco',
      countryCode: 'US',
      phoneNumber: '+1-555-0101',
      isActive: true,
    },
  });
  console.log('✅ Created company:', company1.name, 'with identifier:', company1.identifier);

  // Create Demo Company 2
  const company2 = await prisma.company.create({
    data: {
      name: 'Global Innovations Inc',
      identifier: generateCompanyIdentifier('US', 'GlobalInn'), // US + GLOB + 2 digits = US + 6 chars
      fullName: 'Global Innovations Incorporated',
      shortName: 'GlobalInn',
      workPhone: '+1-555-0202',
      city: 'New York',
      countryCode: 'US',
      phoneNumber: '+1-555-0202',
      isActive: true,
    },
  });
  console.log('✅ Created company:', company2.name);

  // Create roles for Company 1
  const adminRole1 = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: 'Administrator with full access',
      permissions: ['*'],
      companyId: company1.id,
      isActive: true,
    },
  });

  const userRole1 = await prisma.role.create({
    data: {
      name: 'USER',
      description: 'Standard user',
      permissions: ['read', 'write'],
      companyId: company1.id,
      isActive: true,
    },
  });

  // Create roles for Company 2
  const adminRole2 = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: 'Administrator with full access',
      permissions: ['*'],
      companyId: company2.id,
      isActive: true,
    },
  });

  const userRole2 = await prisma.role.create({
    data: {
      name: 'USER',
      description: 'Standard user',
      permissions: ['read', 'write'],
      companyId: company2.id,
      isActive: true,
    },
  });

  console.log('✅ Created roles for both companies');

  // Create admin user for Company 1
  const hashedPassword1 = await hash('admin123', 12);
  const admin1 = await prisma.user.create({
    data: {
      email: 'admin@techcorp.com',
      username: 'techcorp_admin',
      password: hashedPassword1,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1-555-0111',
      roleId: adminRole1.id,
      companyId: company1.id,
      emailVerified: true,
      isActive: true,
      twoFactorEnabled: false,
      twoFactorSetupRequired: true,
    },
  });

  // Create admin user for Company 2
  const hashedPassword2 = await hash('admin123', 12);
  const admin2 = await prisma.user.create({
    data: {
      email: 'admin@globalinn.com',
      username: 'globalinn_admin',
      password: hashedPassword2,
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: '+1-555-0222',
      roleId: adminRole2.id,
      companyId: company2.id,
      emailVerified: true,
      isActive: true,
      twoFactorEnabled: false,
      twoFactorSetupRequired: true,
    },
  });

  console.log('✅ Created admin users for both companies');

  // Create regular users for Company 1
  const user1Password = await hash('user123', 12);
  const user1 = await prisma.user.create({
    data: {
      email: 'user@techcorp.com',
      username: 'techcorp_user',
      password: user1Password,
      firstName: 'Alice',
      lastName: 'Johnson',
      phoneNumber: '+1-555-0333',
      roleId: userRole1.id,
      companyId: company1.id,
      emailVerified: true,
      isActive: true,
      twoFactorEnabled: false,
      twoFactorSetupRequired: false,
    },
  });

  // Create regular users for Company 2
  const user2Password = await hash('user123', 12);
  const user2 = await prisma.user.create({
    data: {
      email: 'user@globalinn.com',
      username: 'globalinn_user',
      password: user2Password,
      firstName: 'Bob',
      lastName: 'Wilson',
      phoneNumber: '+1-555-0444',
      roleId: userRole2.id,
      companyId: company2.id,
      emailVerified: true,
      isActive: true,
      twoFactorEnabled: false,
      twoFactorSetupRequired: false,
    },
  });

  console.log('✅ Created regular users for both companies');

  // Create employees for Company 1
  const employee1 = await prisma.employee.create({
    data: {
      employeeId: 'EMP001',
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@techcorp.com',
      phoneNumber: '+1-555-0333',
      department: 'Engineering',
      position: 'Software Engineer',
      salary: 85000,
      hireDate: new Date('2024-01-15'),
      status: 'ACTIVE',
      userId: user1.id,
      companyId: company1.id,
    },
  });

  // Create employees for Company 2
  const employee2 = await prisma.employee.create({
    data: {
      employeeId: 'EMP001',
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob.wilson@globalinn.com',
      phoneNumber: '+1-555-0444',
      department: 'Marketing',
      position: 'Marketing Manager',
      salary: 75000,
      hireDate: new Date('2024-02-01'),
      status: 'ACTIVE',
      userId: user2.id,
      companyId: company2.id,
    },
  });

  console.log('✅ Created employees for both companies');

  // Create leave types for Company 1
  await prisma.leaveType.create({
    data: {
      name: 'Annual Leave',
      description: 'Yearly vacation leave',
      maxDays: 25,
      companyId: company1.id,
      isActive: true,
    },
  });

  await prisma.leaveType.create({
    data: {
      name: 'Sick Leave',
      description: 'Medical leave',
      maxDays: 10,
      companyId: company1.id,
      isActive: true,
    },
  });

  // Create leave types for Company 2
  await prisma.leaveType.create({
    data: {
      name: 'Annual Leave',
      description: 'Yearly vacation leave',
      maxDays: 20,
      companyId: company2.id,
      isActive: true,
    },
  });

  await prisma.leaveType.create({
    data: {
      name: 'Sick Leave',
      description: 'Medical leave',
      maxDays: 12,
      companyId: company2.id,
      isActive: true,
    },
  });

  console.log('✅ Created leave types for both companies');

  // Create payroll configs
  await prisma.payrollConfig.create({
    data: {
      payFrequency: 'MONTHLY',
      companyId: company1.id,
    },
  });

  await prisma.payrollConfig.create({
    data: {
      payFrequency: 'BIWEEKLY',
      companyId: company2.id,
    },
  });

  console.log('✅ Created payroll configs for both companies');

  console.log('\n🎉 Multi-tenant database seeding completed!');
  console.log('\n📊 Summary:');
  console.log(`- Created 2 companies`);
  console.log(`- Created 4 roles (2 per company)`);
  console.log(`- Created 4 users (2 per company)`);
  console.log(`- Created 2 employees (1 per company)`);
  console.log(`- Created 4 leave types (2 per company)`);
  console.log(`- Created 2 payroll configs (1 per company)`);
  console.log('\n🔐 Login Credentials:');
  console.log('Company 1 (TechCorp):');
  console.log('  Admin: admin@techcorp.com / admin123');
  console.log('  User:  user@techcorp.com / user123');
  console.log('\nCompany 2 (Global Innovations):');
  console.log('  Admin: admin@globalinn.com / admin123');
  console.log('  User:  user@globalinn.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
