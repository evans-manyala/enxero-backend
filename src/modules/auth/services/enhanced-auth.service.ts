import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import * as crypto from 'crypto';
import { AppError } from '../../../shared/utils/AppError';
import { HttpStatus } from '../../../shared/utils/http-status';
import logger from '../../../shared/utils/logger';
import { EmailService } from '../../../shared/services/email.service';
import { SecurityService } from './security.service';
import env from '../../../config/environment';

interface LoginInitiateData {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

interface LoginVerifyData {
  loginToken: string;
  otpCode: string;
  ipAddress?: string;
  userAgent?: string;
}

interface LoginSession {
  id: string;
  userId: string;
  email: string;
  otpCode: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  createdAt: string;
}

export class EnhancedAuthService {
  private prisma: PrismaClient;
  private emailService: EmailService;
  private securityService: SecurityService;

  constructor() {
    this.prisma = new PrismaClient();
    this.emailService = new EmailService();
    this.securityService = new SecurityService();
  }

  /**
   * Initiate login process - validate credentials and send OTP
   */
  async initiateLogin(data: LoginInitiateData) {
    try {
      const { email, password, ipAddress, userAgent } = data;

      // Find user globally (for now, we'll allow same email across companies later)
      const user = await this.prisma.user.findFirst({
        where: { email },
        include: {
          role: true,
          company: true
        }
      });

      if (!user) {
        await this.securityService.trackFailedLoginAttempt(email, ipAddress, userAgent);
        throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }

      // Check if account is locked
      const isLocked = await this.securityService.isAccountLocked(user.id);
      if (isLocked) {
        throw new AppError('Account is locked due to too many failed attempts. Please try again later.', HttpStatus.UNAUTHORIZED);
      }

      // Verify password
      const isPasswordValid = await compare(password, user.password);

      if (!isPasswordValid) {
        await this.securityService.trackFailedLoginAttempt(email, ipAddress, userAgent);
        throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }

      // Check if email service is configured
      const isEmailConfigured = env.EMAIL_USER && env.EMAIL_PASS;
      
      if (!isEmailConfigured) {
        // Only allow bypass in development environment
        if (env.NODE_ENV !== 'production') {
          logger.warn('Email service not configured, skipping OTP for development');
          return {
            loginToken: 'dev-mode-no-otp',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            email: this.maskEmail(user.email),
            message: 'Development mode: OTP skipped (email not configured)',
            requiresOtp: false
          };
        } else {
          // In production, email service must be configured
          logger.error('Email service not configured in production environment');
          throw new AppError('Authentication service unavailable. Please contact support.', HttpStatus.SERVICE_UNAVAILABLE);
        }
      }

      // Generate OTP for email verification
      const otpCode = this.generateOtpCode();
      const loginToken = this.generateLoginToken();

      // Create login session
      const loginSession: LoginSession = {
        id: loginToken,
        userId: user.id,
        email: user.email,
        otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        attempts: 0,
        maxAttempts: 3,
        verified: false,
        createdAt: new Date().toISOString()
      };

      // Store login session
      await this.storeLoginSession(loginSession);

      // Send OTP via email
      await this.emailService.sendLoginOtpEmail(
        user.email,
        user.firstName,
        otpCode
      );

      // Track login initiation
      await this.securityService.trackActivity(
        user.id,
        user.companyId,
        'LOGIN_INITIATED',
        { method: 'email_otp' },
        ipAddress,
        userAgent
      );

      return {
        loginToken,
        expiresAt: loginSession.expiresAt,
        email: this.maskEmail(user.email),
        message: 'Verification code sent to your email'
      };
    } catch (error) {
      logger.error('Error in initiate login:', error);
      throw error;
    }
  }

  /**
   * Verify OTP and complete login
   */
  async verifyLoginOtp(data: LoginVerifyData) {
    try {
      const { loginToken, otpCode, ipAddress, userAgent } = data;

      // Get login session
      const loginSession = await this.getLoginSession(loginToken);

      if (!loginSession) {
        throw new AppError('Invalid or expired login session', HttpStatus.BAD_REQUEST);
      }

      // Check if session is expired
      if (new Date() > new Date(loginSession.expiresAt)) {
        await this.deleteLoginSession(loginToken);
        throw new AppError('Login session has expired', HttpStatus.BAD_REQUEST);
      }

      // Check if max attempts exceeded
      if (loginSession.attempts >= loginSession.maxAttempts) {
        await this.deleteLoginSession(loginToken);
        throw new AppError('Maximum verification attempts exceeded', HttpStatus.BAD_REQUEST);
      }

      // Verify OTP
      if (otpCode !== loginSession.otpCode) {
        // Increment failed attempts
        loginSession.attempts += 1;
        await this.updateLoginSession(loginSession);

        const remainingAttempts = loginSession.maxAttempts - loginSession.attempts;
        throw new AppError(
          `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'Session expired.'}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Get user with full details
      const user = await this.prisma.user.findUnique({
        where: { id: loginSession.userId },
        include: {
          role: true,
          company: true
        }
      });

      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      // Mark session as verified
      loginSession.verified = true;
      await this.updateLoginSession(loginSession);

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Create user session
      await this.securityService.createSession(
        user.id,
        user.companyId,
        tokens.refreshToken,
        ipAddress,
        userAgent
      );

      // Clean up login session
      await this.deleteLoginSession(loginToken);

      // Track successful login
      await this.securityService.trackActivity(
        user.id,
        user.companyId,
        'LOGIN_COMPLETED',
        { method: 'email_otp_verified' },
        ipAddress,
        userAgent
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
            id: user.company?.id,
            name: user.company?.name,
            identifier: user.company?.identifier
          }
        },
        requiresWorkspaceSelection: await this.checkRequiresWorkspaceSelection(user.id)
      };
    } catch (error) {
      logger.error('Error in verify login OTP:', error);
      throw error;
    }
  }

  /**
   * Check workspace access based on flowchart logic
   */
  async checkWorkspaceAccess(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          company: true
        }
      });

      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      // Check if user is company owner (has COMPANY_ADMIN role)
      const isOwner = user.role?.name === 'COMPANY_ADMIN';

      if (isOwner) {
        // Owner goes to workspace settings & account management
        return {
          accessType: 'owner',
          redirectTo: 'workspace_settings',
          company: {
            id: user.company?.id,
            name: user.company?.name,
            identifier: user.company?.identifier
          },
          permissions: user.role?.permissions || []
        };
      }

      // Check if any workspace is available for non-owners
      const availableWorkspaces = await this.getAvailableWorkspaces(userId);

      if (availableWorkspaces.length === 0) {
        // No workspace available - show error as per flowchart
        return {
          accessType: 'no_access',
          error: 'MODULE_NOT_LICENSED',
          message: 'Your account doesn\'t have access to this feature.',
          redirectTo: 'error_page'
        };
      }

      // User has workspace access
      return {
        accessType: 'user',
        redirectTo: 'workspace_list',
        availableWorkspaces,
        company: {
          id: user.company?.id,
          name: user.company?.name,
          identifier: user.company?.identifier
        }
      };
    } catch (error) {
      logger.error('Error checking workspace access:', error);
      throw error;
    }
  }

  /**
   * Resend login OTP
   */
  async resendLoginOtp(loginToken: string) {
    try {
      const loginSession = await this.getLoginSession(loginToken);

      if (!loginSession) {
        throw new AppError('Invalid login session', HttpStatus.BAD_REQUEST);
      }

      // Check if session is still valid
      if (new Date() > new Date(loginSession.expiresAt)) {
        await this.deleteLoginSession(loginToken);
        throw new AppError('Login session has expired', HttpStatus.BAD_REQUEST);
      }

      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: loginSession.userId },
        include: {
          role: true,
          company: true
        }
      });

      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      // Generate new OTP
      const newOtpCode = this.generateOtpCode();
      loginSession.otpCode = newOtpCode;
      loginSession.attempts = 0; // Reset attempts
      loginSession.expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // Extend expiry

      await this.updateLoginSession(loginSession);

      // Send new OTP
      await this.emailService.sendLoginOtpEmail(
        user.email,
        user.firstName,
        newOtpCode
      );

      return {
        message: 'New verification code sent',
        expiresAt: loginSession.expiresAt,
        email: this.maskEmail(user.email)
      };
    } catch (error) {
      logger.error('Error resending login OTP:', error);
      throw error;
    }
  }

  // Private helper methods

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateLoginToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateTokens(user: any) {
    const accessToken = sign(
      { userId: user.id, roleId: user.roleId, type: 'access' },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as any
    );

    const refreshToken = sign(
      { userId: user.id, type: 'refresh', jti: Date.now() + '_' + Math.random().toString(36).substr(2, 9) },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as any
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

  private async checkRequiresWorkspaceSelection(userId: string): Promise<boolean> {
    // Check if user has multiple workspace access
    const workspaces = await this.getAvailableWorkspaces(userId);
    return workspaces.length > 1;
  }

  private async getAvailableWorkspaces(userId: string) {
    // This would be expanded based on your workspace/module licensing logic
    // For now, return the user's company workspace
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!user?.company) return [];

    return [
      {
        id: user.company.id,
        name: user.company.name,
        identifier: user.company.identifier,
        type: 'company_workspace'
      }
    ];
  }

  // Login session management (similar to registration sessions)
  private async storeLoginSession(session: LoginSession) {
    await this.prisma.systemConfig.create({
      data: {
        key: `login_session_${session.id}`,
        value: session as any,
        description: 'Login OTP session data',
        isActive: true
      }
    });
  }

  private async getLoginSession(loginToken: string): Promise<LoginSession | null> {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: `login_session_${loginToken}` }
      });

      if (!config) return null;
      return config.value as any;
    } catch (error) {
      return null;
    }
  }

  private async updateLoginSession(session: LoginSession) {
    await this.prisma.systemConfig.update({
      where: { key: `login_session_${session.id}` },
      data: { value: session as any }
    });
  }

  private async deleteLoginSession(loginToken: string) {
    try {
      await this.prisma.systemConfig.delete({
        where: { key: `login_session_${loginToken}` }
      });
    } catch (error) {
      // Session might not exist, ignore error
    }
  }
}
