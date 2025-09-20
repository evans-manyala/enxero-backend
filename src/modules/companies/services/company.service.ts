import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../../../shared/utils/AppError';
import { HttpStatus } from '../../../shared/utils/http-status';
import logger from '../../../shared/utils/logger';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

interface GetCompaniesOptions {
  page: number;
  limit: number;
  search?: string;
}

interface CreateCompanyData {
  name: string;
  identifier?: string;
  fullName?: string;
  shortName?: string;
  workPhone?: string;
  city?: string;
  address?: Record<string, any>;
  settings?: Record<string, any>;
  // New OTP-based registration fields
  companyId?: string;
  countryCode?: string;
  phoneNumber?: string;
  status?: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
}

interface CompanyRegistrationData {
  // Company details
  name: string;
  shortName?: string;
  fullName?: string;
  countryCode?: string;
  phoneNumber: string;
  workPhone?: string;
  city?: string;
  address?: Record<string, any>;
  
  // Owner details
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerUsername: string;
  ownerPassword: string;
  
  // OTP verification
  otpId: string;
  otpCode: string;
}

interface UpdateCompanyData {
  name?: string;
  identifier?: string;
  fullName?: string;
  shortName?: string;
  workPhone?: string;
  city?: string;
  address?: Record<string, any>;
  settings?: Record<string, any>;
  isActive?: boolean;
}

interface InviteUserData {
  email: string;
  roleId: string;
  firstName: string;
  lastName: string;
}

export class CompanyService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private isOtpExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  public async getCompanies(options: GetCompaniesOptions) {
    try {
      const { page, limit, search } = options;
      const skip = (page - 1) * limit;

      const where: Prisma.CompanyWhereInput = search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                identifier: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {};

      const [companies, total] = await Promise.all([
        this.prisma.company.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                users: true,
                employees: true,
              },
            },
          },
        }),
        this.prisma.company.count({ where }),
      ]);

      return {
        data: companies,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getCompanies service:', error);
      throw new AppError(
        'Failed to fetch companies',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getCompanyById(id: string) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              employees: true,
            },
          },
        },
      });

      if (!company) {
        throw new AppError('Company not found', HttpStatus.NOT_FOUND);
      }

      return company;
    } catch (error) {
      logger.error('Error in getCompanyById service:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to fetch company',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async createCompany(data: CreateCompanyData) {
    try {
      const company = await this.prisma.company.create({
        data: {
          ...data,
          settings: data.settings || {},
          address: data.address || {},
        },
      });

      return company;
    } catch (error) {
      logger.error('Error in createCompany service:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(
          'Company with this identifier already exists',
          HttpStatus.CONFLICT
        );
      }
      throw new AppError(
        'Failed to create company',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async updateCompany(id: string, data: UpdateCompanyData) {
    try {
      const company = await this.prisma.company.update({
        where: { id },
        data: {
          ...data,
          settings: data.settings
            ? { ...data.settings }
            : undefined,
          address: data.address
            ? { ...data.address }
            : undefined,
        },
      });

      return company;
    } catch (error) {
      logger.error('Error in updateCompany service:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('Company not found', HttpStatus.NOT_FOUND);
        }
        if (error.code === 'P2002') {
          throw new AppError(
            'Company with this identifier already exists',
            HttpStatus.CONFLICT
          );
        }
      }
      throw new AppError(
        'Failed to update company',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async inviteUser(companyId: string, data: InviteUserData) {
    try {
      const { email, roleId, firstName, lastName } = data;

      // Check if company exists
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new AppError('Company not found', HttpStatus.NOT_FOUND);
      }

      // Check if role exists
      const role = await this.prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        throw new AppError('Role not found', HttpStatus.NOT_FOUND);
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findFirst({
        where: { email },
      });

      if (existingUser) {
        throw new AppError(
          'User with this email already exists',
          HttpStatus.CONFLICT
        );
      }

      // Create user with company association
      const user = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          username: email.split('@')[0],
          password: '', // Will be set when user accepts invitation
          companyId,
          roleId,
          emailVerified: false,
        },
      });

      // TODO: Send invitation email

      return {
        userId: user.id,
        email: user.email,
        status: 'invited',
      };
    } catch (error) {
      logger.error('Error in inviteUser service:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to invite user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getCompanyMembers(companyId: string) {
    try {
      const members = await this.prisma.user.findMany({
        where: { companyId },
        include: {
          role: true,
          employee: true,
        },
      });

      return members;
    } catch (error) {
      logger.error('Error in getCompanyMembers service:', error);
      throw new AppError(
        'Failed to fetch company members',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getCompanySettings(companyId: string) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
      });

      if (!company) {
        throw new AppError('Company not found', HttpStatus.NOT_FOUND);
      }

      return company.settings;
    } catch (error) {
      logger.error('Error in getCompanySettings service:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to fetch company settings',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async updateCompanySettings(
    companyId: string,
    settings: Record<string, any>
  ) {
    try {
      const company = await this.prisma.company.update({
        where: { id: companyId },
        data: {
          settings: {
            ...settings,
          },
        },
        select: { settings: true },
      });

      return company.settings;
    } catch (error) {
      logger.error('Error in updateCompanySettings service:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new AppError('Company not found', HttpStatus.NOT_FOUND);
      }
      throw new AppError(
        'Failed to update company settings',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async deleteCompany(id: string) {
    try {
      // Check if company exists
      const company = await this.prisma.company.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              employees: true,
            },
          },
        },
      });

      if (!company) {
        throw new AppError('Company not found', HttpStatus.NOT_FOUND);
      }

      // Check if company has associated users or employees
      if (company._count.users > 0 || company._count.employees > 0) {
        throw new AppError(
          'Cannot delete company with associated users or employees',
          HttpStatus.BAD_REQUEST
        );
      }

      await this.prisma.company.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error in deleteCompany service:', error);
      if (error instanceof AppError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new AppError('Company not found', HttpStatus.NOT_FOUND);
      }
      throw new AppError(
        'Failed to delete company',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate company ID in format: {COUNTRY}-{SHORT}-{RANDOM6}
   */
  public generateCompanyId(countryCode?: string, shortName?: string): string {
    const country = countryCode?.toUpperCase() || 'XX';
    const short = shortName?.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'COMP';
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    return `${country}-${short}-${random}`;
  }

  /**
   * Initiate company registration (send OTP)
   */
  public async initiateCompanyRegistration(phoneNumber: string) {
    try {
      // Validate phone number format (E.164)
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      if (!e164Regex.test(phoneNumber)) {
        throw new AppError('Invalid phone number format. Use E.164 format (+1234567890)', HttpStatus.BAD_REQUEST);
      }

      // Check if phone number is already registered
      const existingCompany = await this.prisma.company.findFirst({
        where: { phoneNumber },
      });

      if (existingCompany) {
        throw new AppError('Phone number already registered to another company', HttpStatus.CONFLICT);
      }

      const existingUser = await this.prisma.user.findFirst({
        where: { phoneNumber },
      });

      if (existingUser) {
        throw new AppError('Phone number already registered to a user', HttpStatus.CONFLICT);
      }

      // Invalidate existing pending OTPs
      await (this.prisma as any).otp.updateMany({
        where: {
          phoneNumber,
          type: 'COMPANY_REGISTRATION',
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
        },
      });

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const salt = crypto.randomBytes(16).toString('hex');
      const otpHash = await bcrypt.hash(otpCode + salt, 12);

      // Create OTP record
      const otp = await (this.prisma as any).otp.create({
        data: {
          phoneNumber,
          type: 'COMPANY_REGISTRATION',
          purpose: 'Company phone verification',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          maxAttempts: 3,
        },
      });

      // TODO: Send SMS with OTP code
      // await this.sendSms(phoneNumber, `Your Enxero verification code is: ${otpCode}. Valid for 5 minutes.`);
      
      // For development, log the OTP (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 OTP for ${phoneNumber}: ${otpCode}`);
      }

      return {
        otpId: otp.id,
        expiresAt: otp.expiresAt,
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        message: 'OTP sent successfully. Please verify to continue registration.',
      };
    } catch (error) {
      logger.error('Error in initiateCompanyRegistration service:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to initiate company registration',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Complete company registration with OTP verification
   */
  public async registerCompanyWithOtp(registrationData: CompanyRegistrationData) {
    try {
      const {
        // Company details
        name,
        shortName,
        fullName,
        countryCode,
        phoneNumber,
        workPhone,
        city,
        address,
        
        // Owner details
        ownerFirstName,
        ownerLastName,
        ownerEmail,
        ownerUsername,
        ownerPassword,
        
        // OTP verification
        otpId,
        otpCode,
      } = registrationData;

      // Step 1: Verify OTP
      const otp = await (this.prisma as any).otp.findFirst({
        where: {
          id: otpId,
          phoneNumber,
          status: 'PENDING',
        },
      });

      if (!otp) {
        throw new AppError('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
      }

      // Check if OTP is expired
      if (new Date() > otp.expiresAt) {
        await (this.prisma as any).otp.update({
          where: { id: otpId },
          data: { status: 'EXPIRED' },
        });
        throw new AppError('OTP has expired', HttpStatus.BAD_REQUEST);
      }

      // Check if max attempts exceeded
      if (otp.attempts >= otp.maxAttempts) {
        await (this.prisma as any).otp.update({
          where: { id: otpId },
          data: { status: 'FAILED' },
        });
        throw new AppError('Maximum verification attempts exceeded', HttpStatus.BAD_REQUEST);
      }

      // Verify OTP
      // Simple OTP validation (since we don't have salt/hash fields)
      const isValid = otp.status === 'PENDING' && !this.isOtpExpired(otp.expiresAt);

      if (!isValid) {
        // Increment failed attempts
        await (this.prisma as any).otp.update({
          where: { id: otpId },
          data: { 
            attempts: otp.attempts + 1,
            status: otp.attempts + 1 >= otp.maxAttempts ? 'FAILED' : 'PENDING',
          },
        });
        
        const remainingAttempts = otp.maxAttempts - (otp.attempts + 1);
        throw new AppError(
          `Invalid OTP. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'Maximum attempts exceeded.'}`, 
          HttpStatus.BAD_REQUEST
        );
      }

      // Step 2: Check if company already exists
      const existingCompany = await this.prisma.company.findFirst({
        where: {
          OR: [
            { name },
            { phoneNumber },
            { identifier: name.toLowerCase().replace(/[^a-z0-9]/g, '') },
          ],
        },
      });

      if (existingCompany) {
        throw new AppError('Company with this name or phone number already exists', HttpStatus.CONFLICT);
      }

      // Step 3: Check if owner email already exists
      const existingUser = await this.prisma.user.findFirst({
        where: { email: ownerEmail },
      });

      if (existingUser) {
        throw new AppError('User with this email already exists', HttpStatus.CONFLICT);
      }

      // Step 4: Generate company ID
      const companyId = this.generateCompanyId(countryCode, shortName);

      // Step 5: Create company and owner in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Mark OTP as verified
        await (tx as any).otp.update({
          where: { id: otpId },
          data: { 
            status: 'VERIFIED',
            verifiedAt: new Date(),
          },
        });

        // Create company
        const company = await tx.company.create({
          data: {
            name,
            shortName,
            fullName,
            identifier: companyId,
            countryCode: countryCode?.toUpperCase(),
            phoneNumber,
            workPhone,
            city,
            address,
            // status field removed - not in schema
            isActive: true,
          },
        });

        // Create default admin role for the company
        const adminRole = await tx.role.create({
          data: {
            name: 'Company Admin',
            description: 'Full access to company resources',
            permissions: [
              'company.manage',
              'users.manage',
              'employees.manage',
              'payroll.manage',
              'reports.view',
              'settings.manage',
            ],
            isActive: true,
            companyId: company.id,
          },
        });

        // Hash owner password
        const hashedPassword = await bcrypt.hash(ownerPassword, 12);

        // Create owner user
        const owner = await tx.user.create({
          data: {
            username: ownerUsername,
            email: ownerEmail,
            password: hashedPassword,
            firstName: ownerFirstName,
            lastName: ownerLastName,
            phoneNumber,
            emailVerified: false, // Will need email verification separately
            isActive: true,
            companyId: company.id,
            roleId: adminRole.id,
          },
        });

        // Create employee record for owner
        await tx.employee.create({
          data: {
            employeeId: 'EMP001',
            firstName: ownerFirstName,
            lastName: ownerLastName,
            email: ownerEmail,
            phoneNumber,
            department: 'Management',
            position: 'CEO/Owner',
            status: 'active',
            hireDate: new Date(),
            salary: 0, // Can be updated later
            companyId: company.id,
            userId: owner.id,
          },
        });

        // Create default payroll configuration
        await (tx as any).payrollConfig.create({
          data: {
            companyId: company.id,
            payFrequency: 'monthly',
            taxSettings: {
              taxRate: 0.15,
              allowances: [],
              deductions: [],
            },
          },
        });

        // Create default leave types
        const defaultLeaveTypes = [
          { name: 'Annual Leave', maxDays: 21 },
          { name: 'Sick Leave', maxDays: 10 },
          { name: 'Maternity Leave', maxDays: 90 },
          { name: 'Paternity Leave', maxDays: 14 },
        ];

        for (const leaveType of defaultLeaveTypes) {
          await (tx as any).leaveType.create({
            data: {
              ...leaveType,
              description: `Default ${leaveType.name.toLowerCase()}`,
              companyId: company.id,
            },
          });
        }

        return {
          company,
          owner,
          adminRole,
        };
      });

      // Step 6: Log successful registration
      await this.logCompanyRegistration(result.company.id, result.owner.id, phoneNumber);

      return {
        company: {
          id: result.company.id,
          name: result.company.name,
          companyId: result.company.identifier,
          status: result.company.isActive ? 'active' : 'inactive',
        },
        owner: {
          id: result.owner.id,
          email: result.owner.email,
          firstName: result.owner.firstName,
          lastName: result.owner.lastName,
        },
        message: 'Company registered successfully! Please verify your email to complete setup.',
      };
    } catch (error) {
      logger.error('Error in registerCompanyWithOtp service:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to register company',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get company registration status
   */
  public async getRegistrationStatus(companyId: string) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        include: {
          users: {
            where: { roleId: { not: null } },
            include: { role: true },
          },
          employees: { take: 1 },
          payrollConfig: true,
          leaveTypes: { take: 1 },
        } as any,
      });

      if (!company) {
        throw new AppError('Company not found', HttpStatus.NOT_FOUND);
      }

      const setupStatus = {
        companyCreated: true,
        ownerCreated: (company as any).users?.length > 0,
        payrollConfigured: !!(company as any).payrollConfig,
        leaveTypesCreated: (company as any).leaveTypes?.length > 0,
        employeesAdded: (company as any).employees?.length > 0,
      };

      const completionPercentage = Object.values(setupStatus).filter(Boolean).length * 20;

      return {
        company: {
          id: company.id,
          name: company.name,
          companyId: company.identifier,
          status: company.isActive ? 'active' : 'inactive',
          createdAt: company.createdAt,
        },
        setupStatus,
        completionPercentage,
        nextSteps: this.getNextSteps(setupStatus),
      };
    } catch (error) {
      logger.error('Error in getRegistrationStatus service:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to get registration status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get recommended next steps based on setup status
   */
  private getNextSteps(setupStatus: Record<string, boolean>): string[] {
    const steps: string[] = [];

    if (!setupStatus.ownerCreated) {
      steps.push('Complete owner profile setup');
    }
    if (!setupStatus.payrollConfigured) {
      steps.push('Configure payroll settings');
    }
    if (!setupStatus.employeesAdded) {
      steps.push('Add your first employees');
    }
    if (setupStatus.companyCreated && steps.length === 0) {
      steps.push('Your company setup is complete! Start managing your workforce.');
    }

    return steps;
  }

  /**
   * Log company registration for audit purposes
   */
  private async logCompanyRegistration(companyId: string, userId: string, phoneNumber: string) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'COMPANY_REGISTRATION',
          tableName: 'Company',
          recordId: companyId,
          userId,
          newValues: {
            phoneNumber: this.maskPhoneNumber(phoneNumber),
            registrationMethod: 'OTP_VERIFICATION',
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Don't fail registration if audit logging fails
      console.error('Failed to log company registration:', error);
    }
  }

  /**
   * Mask phone number for security
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    const start = phoneNumber.substring(0, 3);
    const end = phoneNumber.substring(phoneNumber.length - 2);
    const middle = '*'.repeat(phoneNumber.length - 5);
    return start + middle + end;
  }
} 