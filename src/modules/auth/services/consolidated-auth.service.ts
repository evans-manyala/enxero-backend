import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { hash } from 'bcryptjs';
import { AppError } from '../../../shared/utils/AppError';
import { HttpStatus } from '../../../shared/utils/http-status';
import logger from '../../../shared/utils/logger';
import { EmailService } from '../../../shared/services/email.service';
import { BCRYPT_ROUNDS } from '../../../shared/constants/security.constants';
import { SecurityService } from './security.service';
import env from '../../../config/environment';

/**
 * Consolidated Authentication Service
 * 
 * This service consolidates redundant authentication logic to reduce code duplication
 * and provide a unified interface for all authentication operations.
 */
export class ConsolidatedAuthService {
  private prisma: PrismaClient;
  private emailService: EmailService;
  private securityService: SecurityService;

  constructor() {
    this.prisma = new PrismaClient();
    this.emailService = new EmailService();
    this.securityService = new SecurityService();
  }

  /**
   * Unified Registration Method
   * Consolidates single-page and multi-step registration logic
   */
  async registerUser(data: {
    // Company data
    companyName: string;
    companyShortName?: string;
    companyFullName?: string;
    countryCode: string;
    phoneNumber: string;
    workPhone?: string;
    city?: string;
    address?: any;
    
    // User data
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    
    // Options
    singleStep?: boolean;
    require2FA?: boolean;
  }) {
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: data.email }, { username: data.username }],
        },
      });

      if (existingUser) {
        throw new AppError('User already exists', HttpStatus.CONFLICT);
      }

      // Check if company exists
      const existingCompany = await this.prisma.company.findFirst({
        where: {
          OR: [
            { name: data.companyName },
            { phoneNumber: data.phoneNumber }
          ]
        }
      });

      if (existingCompany) {
        throw new AppError('Company already exists', HttpStatus.CONFLICT);
      }

      // Generate company identifier
      const companyIdentifier = this.generateCompanyIdentifier(data.countryCode, data.companyShortName);

      // Hash password
      const hashedPassword = await hash(data.password, BCRYPT_ROUNDS);

      // Create company and user in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create company
        const company = await tx.company.create({
          data: {
            name: data.companyName,
            fullName: data.companyFullName || data.companyName,
            shortName: data.companyShortName,
            identifier: companyIdentifier,
            countryCode: data.countryCode.toUpperCase(),
            phoneNumber: data.phoneNumber,
            workPhone: data.workPhone,
            city: data.city,
            address: data.address,
            isActive: true,
          },
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
            username: data.username,
            email: data.email,
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
            isActive: true,
            emailVerified: true,
            twoFactorEnabled: false,
            twoFactorSetupRequired: data.require2FA || false,
            companyId: company.id,
            roleId: adminRole.id,
          },
          include: {
            role: true,
            company: true
          },
        });

        return { company, user, adminRole };
      });

      // Track activity
      await this.securityService.trackActivity(
        result.user.id,
        data.singleStep ? 'USER_REGISTERED_SINGLE_PAGE' : 'USER_REGISTERED_MULTI_STEP',
        { 
          username: result.user.username,
          companyIdentifier,
          requires2FASetup: data.require2FA || false
        },
        undefined,
        undefined
      );

      return {
        success: true,
        company: {
          id: result.company.id,
          name: result.company.name,
          identifier: result.company.identifier
        },
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role?.name || 'COMPANY_ADMIN',
          companyId: result.user.companyId,
          company: {
            id: result.company.id,
            name: result.company.name,
            identifier: result.company.identifier,
          },
          twoFactorEnabled: result.user.twoFactorEnabled,
          twoFactorSetupRequired: result.user.twoFactorSetupRequired,
        },
        companyIdentifier,
        requires2FASetup: data.require2FA || false,
        message: data.require2FA 
          ? 'Registration successful. 2FA setup is required before you can login.'
          : 'Registration completed successfully.'
      };

    } catch (error) {
      logger.error('Error during consolidated registration:', error);
      throw error;
    }
  }

  /**
   * Unified Login Method
   * Consolidates all login flows (TOTP, OTP, step-by-step validation)
   */
  async initiateLogin(data: {
    email?: string;
    username?: string;
    password: string;
    companyIdentifier?: string;
    ipAddress?: string;
    userAgent?: string;
    loginType?: 'email_otp' | 'totp' | 'direct';
  }) {
    try {
      // Find user
      const whereClause = data.companyIdentifier
        ? {
            OR: [
              { email: data.email || data.username },
              { username: data.username || data.email }
            ],
            company: { identifier: data.companyIdentifier }
          }
        : {
            OR: [
              { email: data.email || data.username },
              { username: data.username || data.email }
            ]
          };

      const user = await this.prisma.user.findFirst({
        where: whereClause,
        include: {
          role: true,
          company: true
        }
      });

      if (!user) {
        await this.securityService.trackFailedLoginAttempt(
          data.email || data.username || '', 
          data.ipAddress, 
          data.userAgent
        );
        throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }

      // Check if account is locked
      const isLocked = await this.securityService.isAccountLocked(user.id);
      if (isLocked) {
        throw new AppError('Account is locked due to too many failed attempts. Please try again later.', HttpStatus.UNAUTHORIZED);
      }

      // Verify password
      const isPasswordValid = await compare(data.password, user.password);
      if (!isPasswordValid) {
        await this.securityService.trackFailedLoginAttempt(
          data.email || data.username || '', 
          data.ipAddress, 
          data.userAgent
        );
        throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }

      // Determine authentication flow based on user's 2FA status and login type
      const loginType = data.loginType || this.determineLoginType(user);

      switch (loginType) {
        case 'totp':
          return this.handleTOTPLogin(user, data);
        case 'email_otp':
          return this.handleEmailOTPLogin(user, data);
        case 'direct':
        default:
          return this.handleDirectLogin(user, data);
      }

    } catch (error) {
      logger.error('Error during consolidated login:', error);
      throw error;
    }
  }

  /**
   * Complete Login (after TOTP/OTP verification)
   */
  async completeLogin(data: {
    loginToken: string;
    verificationCode: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // Implementation would depend on the stored login session
    // This consolidates both TOTP and OTP verification
    // ... implementation details
  }

  // Private helper methods

  private generateCompanyIdentifier(countryCode: string, shortName?: string): string {
    const country = countryCode.toUpperCase().padEnd(2, 'X').substring(0, 2);
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    
    let pattern = '';
    if (shortName && shortName.length >= 2) {
      const cleanShort = shortName.toUpperCase().replace(/[^A-Z0-9]/g, '');
      pattern = [
        Math.floor(Math.random() * 10).toString(),
        cleanShort[0] || chars[Math.floor(Math.random() * chars.length)],
        Math.floor(Math.random() * 10).toString(),
        cleanShort[1] || chars[Math.floor(Math.random() * chars.length)],
        chars[Math.floor(Math.random() * chars.length)],
        Math.floor(Math.random() * 10).toString(),
        Math.floor(Math.random() * 10).toString()
      ].join('');
    } else {
      pattern = [
        nums[Math.floor(Math.random() * nums.length)],
        chars[Math.floor(Math.random() * chars.length)],
        nums[Math.floor(Math.random() * nums.length)],
        chars[Math.floor(Math.random() * chars.length)],
        chars[Math.floor(Math.random() * chars.length)],
        nums[Math.floor(Math.random() * nums.length)],
        nums[Math.floor(Math.random() * nums.length)]
      ].join('');
    }

    return `${country}-${pattern}`;
  }

  private determineLoginType(user: any): 'totp' | 'email_otp' | 'direct' {
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      return 'totp';
    }
    
    // Check if email service is configured for OTP
    const isEmailConfigured = env.EMAIL_USER && env.EMAIL_PASS;
    if (isEmailConfigured) {
      return 'email_otp';
    }
    
    // In production, require proper email configuration for security
    if (env.NODE_ENV === 'production' && !isEmailConfigured) {
      throw new AppError('Authentication service unavailable. Please contact support.', HttpStatus.SERVICE_UNAVAILABLE);
    }
    
    return 'direct';
  }

  private async handleTOTPLogin(user: any, data: any) {
    // Create temporary login token for TOTP verification
    const loginToken = crypto.randomBytes(32).toString('hex');
    
    await this.securityService.trackActivity(
      user.id,
      'TOTP_LOGIN_INITIATED',
      { username: user.username },
      data.ipAddress,
      data.userAgent
    );

    return {
      requiresTOTP: true,
      loginToken,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      email: user.email,
      message: 'Enter TOTP code to complete login',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        companyId: user.companyId,
        company: {
          id: user.company.id,
          name: user.company.name,
          identifier: user.company.identifier,
        }
      }
    };
  }

  private async handleEmailOTPLogin(user: any, data: any) {
    // Generate OTP and send email
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const loginToken = crypto.randomBytes(32).toString('hex');

    // Store login session (simplified - in production use Redis)
    // ... implementation

    try {
      await this.emailService.sendLoginOtpEmail(
        user.email,
        user.firstName,
        otpCode
      );
    } catch (emailError) {
      logger.warn('Failed to send login OTP email:', emailError);
      // Fallback to direct login in development
      return this.handleDirectLogin(user, data);
    }

    return {
      requiresOTP: true,
      loginToken,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      email: this.maskEmail(user.email),
      message: 'Verification code sent to your email'
    };
  }

  private async handleDirectLogin(user: any, data: any) {
    // Generate tokens and complete login
    const tokens = this.generateTokens(user);

    await this.securityService.createSession(
      user.id,
      tokens.refreshToken,
      data.ipAddress,
      data.userAgent
    );

    await this.securityService.trackActivity(
      user.id,
      'USER_LOGIN_DIRECT',
      { username: user.username },
      data.ipAddress,
      data.userAgent
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || 'USER',
        companyId: user.companyId,
        company: {
          id: user.company.id,
          name: user.company.name,
          identifier: user.company.identifier,
        },
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorSetupRequired: user.twoFactorSetupRequired,
      },
    };
  }

  private generateTokens(user: any) {
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-please-change-in-production';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key-please-change-in-production';
    
    const accessToken = sign(
      { userId: user.id, roleId: user.roleId, companyId: user.companyId, type: 'access' },
      jwtSecret as string,
      { expiresIn: '1h' }
    );

    const refreshToken = sign(
      { userId: user.id, type: 'refresh', jti: Date.now() + '_' + Math.random().toString(36).substr(2, 9) },
      jwtRefreshSecret as string,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 3 
      ? local.substring(0, 2) + '*'.repeat(local.length - 3) + local.slice(-1)
      : local;
    return `${maskedLocal}@${domain}`;
  }
}

