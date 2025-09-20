import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import * as crypto from 'crypto';
import { AppError } from '../../../shared/utils/AppError';
import { HttpStatus } from '../../../shared/utils/http-status';
import logger from '../../../shared/utils/logger';
import { EmailService } from '../../../shared/services/email.service';
import * as speakeasy from 'speakeasy';
import { BCRYPT_ROUNDS } from '../../../shared/constants/security.constants';

interface RegistrationStep1Data {
  companyName: string;
  fullName?: string;
  shortName?: string;
  countryCode: string;
  phoneNumber: string;
  workPhone?: string;
  city?: string;
  address?: any;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ipAddress?: string;
  userAgent?: string;
}

interface RegistrationStep2Data {
  sessionToken: string;
  username: string;
  password: string;
  confirmPassword: string;
  ipAddress?: string;
  userAgent?: string;
}

interface RegistrationStep3Data {
  sessionToken: string;
  twoFactorToken: string;
  backupCodes?: string[];
  ipAddress?: string;
  userAgent?: string;
}

interface RegistrationSession {
  id: string;
  step: number;
  companyData?: Record<string, any>;
  userData?: Record<string, any>;
  email: string;
  expiresAt: string; // Store as ISO string for JSON compatibility
  createdAt: string; // Store as ISO string for JSON compatibility
}

export class RegistrationService {
  private prisma: PrismaClient;
  private emailService: EmailService;

  constructor() {
    this.prisma = new PrismaClient();
    this.emailService = new EmailService();
  }

  /**
   * Step 1: Register company details and generate identifier
   */
  async registerStep1(data: RegistrationStep1Data) {
    try {
      // Validate input data
      await this.validateStep1Data(data);

      // Check if email is already registered globally (for now, we'll allow same email across companies later)
      const existingUser = await this.prisma.user.findFirst({
        where: { email: data.ownerEmail }
      });

      if (existingUser) {
        throw new AppError('Email address is already registered', HttpStatus.CONFLICT);
      }

      // Check if company name is already taken
      const existingCompany = await this.prisma.company.findFirst({
        where: {
          OR: [
            { name: data.companyName },
            { phoneNumber: data.phoneNumber }
          ]
        }
      });

      if (existingCompany) {
        throw new AppError('Company name or phone number is already registered', HttpStatus.CONFLICT);
      }

      // Generate AA-NANAANN format company identifier
      const companyIdentifier = this.generateAANANAANNIdentifier(data.countryCode, data.shortName);

      // Create registration session
      const sessionToken = this.generateSessionToken();
      const session: RegistrationSession = {
        id: sessionToken,
        step: 1,
        companyData: {
          name: data.companyName,
          fullName: data.fullName,
          shortName: data.shortName,
          identifier: companyIdentifier,
          countryCode: data.countryCode.toUpperCase(),
          phoneNumber: data.phoneNumber,
          workPhone: data.workPhone,
          city: data.city,
          address: data.address
        },
        userData: {
          email: data.ownerEmail,
          firstName: data.ownerFirstName,
          lastName: data.ownerLastName
        },
        email: data.ownerEmail,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        createdAt: new Date().toISOString()
      };

      // Store session in Redis or database temporary table
      await this.storeRegistrationSession(session);

      // Send email with company identifier
      await this.emailService.sendCompanyIdentifierEmail(
        data.ownerEmail,
        data.ownerFirstName,
        data.companyName,
        companyIdentifier
      );

      // Log registration step 1
      await this.logRegistrationStep('STEP_1_COMPLETED', sessionToken, data.ipAddress, data.userAgent);

      return {
        sessionToken,
        companyIdentifier,
        step: 1,
        nextStep: 'Set username and password',
        expiresAt: session.expiresAt
      };
    } catch (error) {
      logger.error('Error in registration step 1:', error);
      throw error;
    }
  }

  /**
   * Step 2: Set username and password
   */
  async registerStep2(data: RegistrationStep2Data) {
    try {
      // Validate passwords match
      if (data.password !== data.confirmPassword) {
        throw new AppError('Passwords do not match', HttpStatus.BAD_REQUEST);
      }

      // Validate password strength
      this.validatePasswordStrength(data.password);

      // Get registration session
      const session = await this.getRegistrationSession(data.sessionToken);
      
      if (!session || session.step !== 1) {
        throw new AppError('Invalid session or incorrect step', HttpStatus.BAD_REQUEST);
      }

      // Check if username is available globally (for now, we'll allow same username across companies later)
      const existingUser = await this.prisma.user.findFirst({
        where: { username: data.username }
      });

      if (existingUser) {
        throw new AppError('Username is already taken', HttpStatus.CONFLICT);
      }

      // Update session with user credentials
      session.step = 2;
      session.userData = {
        ...session.userData,
        username: data.username,
        passwordHash: await hash(data.password, BCRYPT_ROUNDS)
      };

      await this.updateRegistrationSession(session);

      // Send confirmation email
      await this.emailService.sendCredentialsConfirmationEmail(
        session.email,
        session.userData.firstName,
        data.username
      );

      // Log registration step 2
      await this.logRegistrationStep('STEP_2_COMPLETED', data.sessionToken, data.ipAddress, data.userAgent);

      return {
        sessionToken: data.sessionToken,
        step: 2,
        nextStep: 'Set up Two-Factor Authentication',
        username: data.username
      };
    } catch (error) {
      logger.error('Error in registration step 2:', error);
      throw error;
    }
  }

  /**
   * Step 3: Setup 2FA and complete registration
   */
  async registerStep3(data: RegistrationStep3Data) {
    try {
      // Get registration session
      const session = await this.getRegistrationSession(data.sessionToken);
      
      if (!session || session.step !== 2) {
        throw new AppError('Invalid session or incorrect step', HttpStatus.BAD_REQUEST);
      }

      // Verify 2FA token
      const secret = this.generate2FASecret();
      const isValidToken = speakeasy.totp.verify({
        secret: secret.base32,
        token: data.twoFactorToken,
        window: 2
      });

      if (!isValidToken) {
        throw new AppError('Invalid 2FA token', HttpStatus.BAD_REQUEST);
      }

      // Generate backup codes if not provided
      const backupCodes = data.backupCodes || this.generateBackupCodes();

        // Create company and user in transaction
        const result = await this.prisma.$transaction(async (tx) => {
          // Validate session data exists
          if (!session.companyData || !session.userData) {
            throw new AppError('Invalid session data', HttpStatus.BAD_REQUEST);
          }

          // Create company
          const company = await tx.company.create({
            data: {
              name: session.companyData.name,
              fullName: session.companyData.fullName,
              shortName: session.companyData.shortName,
              identifier: session.companyData.identifier,
              // identifier is already set above
              countryCode: session.companyData.countryCode,
              phoneNumber: session.companyData.phoneNumber,
              workPhone: session.companyData.workPhone,
              city: session.companyData.city,
              address: session.companyData.address,
              isActive: true,
              settings: {
                registrationCompleted: true,
                registrationCompletedAt: new Date().toISOString()
              }
            }
          });

          // Create company-specific admin role
          const adminRole = await tx.role.create({
            data: {
              name: 'COMPANY_ADMIN',
              description: 'Company Administrator with full access',
              permissions: [
                'company.manage',
                'users.manage',
                'employees.manage',
                'payroll.manage',
                'reports.view',
                'settings.manage'
              ],
              isActive: true,
              companyId: company.id
            }
          });

          // Create user
          const user = await tx.user.create({
            data: {
              username: session.userData.username,
              email: session.userData.email,
              password: session.userData.passwordHash,
              firstName: session.userData.firstName,
              lastName: session.userData.lastName,
              phoneNumber: session.companyData.phoneNumber,
              isActive: true,
              emailVerified: true, // Email verified through registration process
              twoFactorEnabled: true, // 2FA is enabled after setup
              twoFactorSecret: secret.base32,
              backupCodes: backupCodes,
              companyId: company.id,
              roleId: adminRole.id
            }
          });

          return { company, user, adminRole };
        });      // Clean up registration session
      await this.deleteRegistrationSession(data.sessionToken);

        // Send welcome email
        await this.emailService.sendWelcomeEmail(
          session.email,
          session.userData?.firstName || '',
          result.company.name,
          result.company.identifier || result.company.id
        );      // Log registration completion
      await this.logRegistrationStep('REGISTRATION_COMPLETED', data.sessionToken, data.ipAddress, data.userAgent);

      return {
        message: 'Registration completed successfully',
        company: {
          id: result.company.id,
          name: result.company.name,
          identifier: result.company.identifier
        },
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email
        },
        backupCodes: backupCodes.map(code => ({ code, used: false })),
        nextStep: 'You can now login to your account'
      };
    } catch (error) {
      logger.error('Error in registration step 3:', error);
      throw error;
    }
  }

  /**
   * Get registration status
   */
  async getRegistrationStatus(sessionToken: string) {
    const session = await this.getRegistrationSession(sessionToken);
    
    if (!session) {
      throw new AppError('Invalid session token', HttpStatus.BAD_REQUEST);
    }

    return {
      currentStep: session.step,
      totalSteps: 3,
      completedSteps: session.step,
      nextStep: this.getNextStepDescription(session.step),
      expiresAt: session.expiresAt,
      companyName: session.companyData?.name,
      ownerEmail: session.email
    };
  }

  /**
   * Generate AA-NANAANN format company identifier
   */
  generateCompanyIdentifier(countryCode: string, shortName?: string): string {
    return this.generateAANANAANNIdentifier(countryCode, shortName);
  }

  /**
   * Resend email for current step
   */
  async resendEmail(sessionToken: string, step: number) {
    const session = await this.getRegistrationSession(sessionToken);
    
    if (!session) {
      throw new AppError('Invalid session token', HttpStatus.BAD_REQUEST);
    }

    switch (step) {
      case 1:
        if (session.userData) {
          await this.emailService.sendCompanyIdentifierEmail(
            session.email,
            session.userData.firstName,
            session.companyData?.name || '',
            session.companyData?.identifier || ''
          );
        }
        break;
      case 2:
        if (session.userData) {
          await this.emailService.sendCredentialsConfirmationEmail(
            session.email,
            session.userData.firstName,
            session.userData.username
          );
        }
        break;
      default:
        throw new AppError('Invalid step for email resend', HttpStatus.BAD_REQUEST);
    }

    return { message: 'Email sent successfully' };
  }

  // Private helper methods

  private async validateStep1Data(data: RegistrationStep1Data) {
    if (!data.companyName || data.companyName.length < 2) {
      throw new AppError('Company name must be at least 2 characters', HttpStatus.BAD_REQUEST);
    }

    if (!data.countryCode || data.countryCode.length !== 2) {
      throw new AppError('Country code must be 2 characters (ISO 3166-1 alpha-2)', HttpStatus.BAD_REQUEST);
    }

    if (!data.phoneNumber || !this.isValidE164Phone(data.phoneNumber)) {
      throw new AppError('Invalid phone number format. Use E.164 format', HttpStatus.BAD_REQUEST);
    }

    if (!data.ownerEmail || !this.isValidEmail(data.ownerEmail)) {
      throw new AppError('Invalid email address', HttpStatus.BAD_REQUEST);
    }
  }

  private generateAANANAANNIdentifier(countryCode: string, shortName?: string): string {
    const country = countryCode.toUpperCase().padEnd(2, 'X').substring(0, 2);
    
    // Generate NANAANN pattern (Number-Alpha-Number-Alpha-Alpha-Number-Number)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    
    // Use company short name for some characters if available, otherwise random
    let pattern = '';
    if (shortName && shortName.length >= 2) {
      const cleanShort = shortName.toUpperCase().replace(/[^A-Z0-9]/g, '');
      pattern = [
        Math.floor(Math.random() * 10).toString(),                    // N
        cleanShort[0] || chars[Math.floor(Math.random() * chars.length)], // A (from company name)
        Math.floor(Math.random() * 10).toString(),                    // N
        cleanShort[1] || chars[Math.floor(Math.random() * chars.length)], // A (from company name)
        chars[Math.floor(Math.random() * chars.length)],             // A
        Math.floor(Math.random() * 10).toString(),                    // N
        Math.floor(Math.random() * 10).toString()                     // N
      ].join('');
    } else {
      pattern = [
        nums[Math.floor(Math.random() * nums.length)],     // N
        chars[Math.floor(Math.random() * chars.length)],   // A  
        nums[Math.floor(Math.random() * nums.length)],     // N
        chars[Math.floor(Math.random() * chars.length)],   // A
        chars[Math.floor(Math.random() * chars.length)],   // A
        nums[Math.floor(Math.random() * nums.length)],     // N
        nums[Math.floor(Math.random() * nums.length)]      // N
      ].join('');
    }

    return `${country}-${pattern}`;
  }

  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generate2FASecret() {
    return speakeasy.generateSecret({
      name: 'Enxero Platform',
      length: 32
    });
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  private validatePasswordStrength(password: string) {
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', HttpStatus.BAD_REQUEST);
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpper || !hasLower || !hasNumbers || !hasSpecial) {
      throw new AppError(
        'Password must contain uppercase, lowercase, numbers, and special characters',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private isValidE164Phone(phone: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getNextStepDescription(currentStep: number): string {
    switch (currentStep) {
      case 1:
        return 'Set username and password';
      case 2:
        return 'Set up Two-Factor Authentication';
      case 3:
        return 'Registration completed';
      default:
        return 'Unknown step';
    }
  }

  // Session management methods (implement based on your preference - Redis or DB)
  private async storeRegistrationSession(session: RegistrationSession) {
    // For now, store in database - you can switch to Redis later
    await this.prisma.systemConfig.create({
      data: {
        key: `registration_session_${session.id}`,
        value: session as any, // Cast to bypass type check
        description: 'Registration session data',
        isActive: true
      }
    });
  }

  private async getRegistrationSession(sessionToken: string): Promise<RegistrationSession | null> {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: `registration_session_${sessionToken}` }
      });

      if (!config) return null;

      const session = config.value as any;
      
      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        await this.deleteRegistrationSession(sessionToken);
        return null;
      }

      return session;
    } catch (error) {
      return null;
    }
  }

  private async updateRegistrationSession(session: RegistrationSession) {
    await this.prisma.systemConfig.update({
      where: { key: `registration_session_${session.id}` },
      data: { value: session as any } // Cast to bypass type check
    });
  }

  private async deleteRegistrationSession(sessionToken: string) {
    try {
      await this.prisma.systemConfig.delete({
        where: { key: `registration_session_${sessionToken}` }
      });
    } catch (error) {
      // Session might not exist, ignore error
    }
  }

  private async logRegistrationStep(action: string, sessionToken: string, ipAddress?: string, userAgent?: string) {
    try {
      // This would be improved with proper audit logging
      await this.prisma.systemLog.create({
        data: {
          level: 'INFO',
          message: action,
          metadata: {
            sessionToken: sessionToken.substring(0, 8) + '...',
            ipAddress,
            userAgent,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      // Don't fail registration if logging fails
      console.error('Failed to log registration step:', error);
    }
  }
}
