import { PrismaClient, User } from '@prisma/client';
import { hash, compare } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { ILoginDto, IRegisterDto, IAuthResponse, IRefreshTokenDto, ITOTPLoginInitiateDto, ITOTPLoginVerifyDto, ITOTPLoginResponse, ITOTP2FASetupResponse, ICompanyValidationDto, ICompanyValidationResponse, IUsernameValidationDto, IUsernameValidationResponse, IPasswordValidationDto, IPasswordValidationResponse, ISinglePageRegistrationDto, ISinglePageRegistrationResponse } from '../interfaces/auth.interface';
import { AppError } from '../../../shared/utils/AppError';
import env from '../../../config/environment';
import { SecurityService } from './security.service';
import { SignOptions } from 'jsonwebtoken';
import logger from '../../../shared/utils/logger';
import { BCRYPT_ROUNDS } from '../../../shared/constants/security.constants';

export class AuthService {
  private prisma: PrismaClient;
  private securityService: SecurityService;

  constructor() {
    this.prisma = new PrismaClient();
    this.securityService = new SecurityService();
  }

  // ===================================================================
  // LEGACY AUTHENTICATION METHODS (Backward Compatibility)
  // ===================================================================

  async register(data: IRegisterDto): Promise<IAuthResponse> {
    const { email, username, password } = data;

    // Check if user exists globally (for now, we'll allow same email/username across companies later)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new AppError('User already exists', 400);
    }

    // Hash password
    const hashedPassword = await hash(password, BCRYPT_ROUNDS);

    // Create default company first
    const defaultCompany = await this.prisma.company.create({
      data: {
        name: `${data.firstName}'s Company`,
        identifier: username.toUpperCase(),
        isActive: true,
      },
    });

    // Create company-specific default role
    const defaultRole = await this.prisma.role.create({
      data: {
        name: 'USER',
        description: 'Standard user role',
        permissions: ['basic.access'],
        isActive: true,
        companyId: defaultCompany.id
      },
    });

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        roleId: defaultRole.id,
        companyId: defaultCompany.id,
      },
      include: {
        role: true,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Create session
    await this.securityService.createSession(
      user.id,
      user.companyId,
      tokens.refreshToken,
      data.ipAddress,
      data.userAgent
    );

    // Track activity
    await this.securityService.trackActivity(
      user.id,
      user.companyId,
      'USER_REGISTERED',
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
        role: user.role?.name || 'USER',
        companyId: user.companyId,
      },
    };
  }

  async login(data: ILoginDto): Promise<IAuthResponse> {
    const { email, password, companyId, companyIdentifier, ipAddress, userAgent } = data;

    // Resolve company ID for tenant isolation
    let resolvedCompanyId = companyId;
    if (companyIdentifier && !companyId) {
      const company = await this.prisma.company.findFirst({
        where: { identifier: companyIdentifier, isActive: true },
        select: { id: true }
      });
      if (!company) {
        throw new AppError('Invalid company identifier', 401);
      }
      resolvedCompanyId = company.id;
    }

    // Find user with tenant isolation
    const user = await this.prisma.user.findFirst({
      where: { 
        email,
        ...(resolvedCompanyId && { companyId: resolvedCompanyId })
      },
      include: {
        role: true,
        company: true
      },
    });

    if (!user) {
      await this.securityService.trackFailedLoginAttempt(email, ipAddress, userAgent, resolvedCompanyId);
      throw new AppError('Invalid credentials', 401);
    }

    // Check if account is locked
    const isLocked = await this.securityService.isAccountLocked(user.id);
    if (isLocked) {
      throw new AppError('Account is locked due to too many failed attempts. Please try again later.', 401);
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      await this.securityService.trackFailedLoginAttempt(email, ipAddress, userAgent, user.companyId);
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Create session
    await this.securityService.createSession(
      user.id,
      user.companyId,
      tokens.refreshToken,
      ipAddress,
      userAgent
    );

    // Track activity
    await this.securityService.trackActivity(
      user.id,
      user.companyId,
      'USER_LOGGED_IN',
      { username: user.username },
      ipAddress,
      userAgent
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role?.name || 'USER',
        companyId: user.companyId,
      },
    };
  }

  async refreshToken(data: IRefreshTokenDto): Promise<IAuthResponse> {
    const { refreshToken, ipAddress, userAgent } = data;

    try {
      // Verify refresh token
      const decoded = verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          role: true,
          company: true
        },
      });

      if (!user) {
        throw new AppError('User not found', 401);
      }

      // Invalidate the old session (refresh token)
      await this.securityService.invalidateSession(refreshToken);

      // Generate new tokens
      const tokens = this.generateTokens(user);

      // Create new session
      await this.securityService.createSession(
        user.id,
        user.companyId,
        tokens.refreshToken,
        ipAddress,
        userAgent
      );

      // Track activity
      await this.securityService.trackActivity(
        user.id,
        'TOKEN_REFRESHED',
        { username: user.username },
        ipAddress,
        userAgent
      );

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role?.name || 'USER',
          companyId: user.companyId,
        },
      };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  private generateTokens(user: User) {
    const accessToken = sign(
      { userId: user.id, roleId: user.roleId, type: 'access' } as object,
      env.JWT_SECRET as string,
      { expiresIn: env.JWT_EXPIRES_IN as string } as SignOptions
    );

    const refreshToken = sign(
      { userId: user.id, type: 'refresh', jti: Date.now() + '_' + Math.random().toString(36).substr(2, 9) } as object,
      env.JWT_REFRESH_SECRET as string,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as string } as SignOptions
    );

    return { accessToken, refreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await this.securityService.invalidateSession(refreshToken);
    } catch (error) {
      console.error('Error during logout, refresh token might not exist:', error);
    }
  }

  // ===================================================================
  // TOTP AUTHENTICATION METHODS (2FA Enhancement)
  // ===================================================================

  async initiateTOTPLogin(data: ITOTPLoginInitiateDto): Promise<ITOTPLoginResponse> {
    const { email, password, companyId, companyIdentifier, ipAddress, userAgent } = data;

    try {
      // Resolve company ID for tenant isolation
      let resolvedCompanyId = companyId;
      if (companyIdentifier && !companyId) {
        const company = await this.prisma.company.findFirst({
          where: { identifier: companyIdentifier, isActive: true },
          select: { id: true }
        });
        if (!company) {
          throw new AppError('Invalid company identifier', 401);
        }
        resolvedCompanyId = company.id;
      }

      // Find user with tenant isolation
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email }, { username: email }],
          ...(resolvedCompanyId && { companyId: resolvedCompanyId })
        },
        include: {
          role: true,
          company: true
        },
      });

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Verify password
      const isPasswordValid = await compare(password, user.password);
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check if 2FA is enabled
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        // User doesn't have 2FA enabled, complete login normally
        const tokens = this.generateTokens(user);
        
        await this.securityService.createSession(
          user.id,
          user.companyId,
          tokens.refreshToken,
          ipAddress,
          userAgent
        );

        await this.securityService.trackActivity(
          user.id,
          'USER_LOGIN',
          { username: user.username },
          ipAddress,
          userAgent
        );

        return {
          requiresTOTP: false,
          ...tokens,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: user.role?.name || 'USER',
            companyId: user.companyId,
            company: {
              id: user.companyId,
              name: '',
              identifier: null,
            },
            twoFactorEnabled: false,
            twoFactorSetupRequired: false,
          },
        };
      }

      // Create temporary login token for TOTP verification
      const loginToken = crypto.randomBytes(32).toString('hex');
      
      // Store login session with company context
      await this.storeLoginSession(loginToken, {
        userId: user.id,
        companyId: user.companyId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      });
      
      await this.securityService.trackActivity(
        user.id,
        'TOTP_LOGIN_INITIATED',
        { username: user.username },
        ipAddress,
        userAgent
      );

      return {
        requiresTOTP: true,
        loginToken,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        email: user.email,
        message: 'Enter TOTP code to complete login',
        accessToken: '',
        refreshToken: '',
        user: undefined,
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error during TOTP login initiation:', error);
      throw new AppError('Authentication failed', 500);
    }
  }

  async verifyTOTPLogin(data: ITOTPLoginVerifyDto): Promise<IAuthResponse> {
    const { loginToken, totpCode, companyId, ipAddress, userAgent } = data;

    try {
      // Get login session with company context
      const session = await this.getLoginSession(loginToken);
      if (!session) {
        throw new AppError('Invalid or expired login token', 401);
      }

      // Validate company context if provided
      if (companyId && session.companyId !== companyId) {
        throw new AppError('Company context mismatch', 401);
      }

      // Find user with tenant isolation
      const user = await this.prisma.user.findFirst({
        where: {
          id: session.userId,
          companyId: session.companyId,
          twoFactorEnabled: true,
          twoFactorSecret: { not: null },
        },
        include: {
          role: true,
          company: true
        },
      });

      if (!user || !user.twoFactorSecret) {
        throw new AppError('User not found or 2FA not enabled', 401);
      }

      // Verify TOTP code
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: totpCode,
        window: 2,
      });

      if (!verified) {
        throw new AppError('Invalid TOTP code', 401);
      }

      const authenticatedUser = user;

      // Generate tokens
      const tokens = this.generateTokens(authenticatedUser);

      // Create session
      await this.securityService.createSession(
        authenticatedUser.id,
        authenticatedUser.companyId,
        tokens.refreshToken,
        ipAddress,
        userAgent
      );

      await this.securityService.trackActivity(
        authenticatedUser.id,
        'TOTP_LOGIN_SUCCESS',
        { username: authenticatedUser.username },
        ipAddress,
        userAgent
      );

      return {
        ...tokens,
        user: {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          username: authenticatedUser.username,
          role: authenticatedUser.role?.name || 'USER',
          companyId: authenticatedUser.companyId,
        },
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error during TOTP verification:', error);
      throw new AppError('TOTP verification failed', 500);
    }
  }

  async setup2FA(userId: string): Promise<ITOTP2FASetupResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.twoFactorEnabled) {
        throw new AppError('2FA is already enabled', 400);
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Enxero Platform (${user.email})`,
        issuer: 'Enxero Platform',
        length: 32,
      });

      // Generate QR code
      const qrCodeImage = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Update user with secret and backup codes (but don't enable yet)
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: secret.base32,
          backupCodes: backupCodes,
          twoFactorEnabled: false, // Will be enabled after verification
        },
      });

      await this.securityService.trackActivity(
        userId,
        '2FA_SETUP_INITIATED',
        { email: user.email },
        undefined,
        undefined
      );

      return {
        secret: secret.base32!,
        qrCodeImage,
        backupCodes,
        manualEntryKey: secret.base32!,
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error during 2FA setup:', error);
      throw new AppError('Failed to setup 2FA', 500);
    }
  }

  async enable2FA(userId: string, totpCode: string): Promise<{ success: boolean; backupCodes: string[] }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.twoFactorEnabled) {
        throw new AppError('2FA is already enabled', 400);
      }

      if (!user.twoFactorSecret) {
        throw new AppError('2FA setup not completed. Please run setup first.', 400);
      }

      // Verify TOTP code
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: totpCode,
        window: 2,
      });

      if (!verified) {
        throw new AppError('Invalid TOTP code', 401);
      }

      // Enable 2FA
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
        },
      });

      await this.securityService.trackActivity(
        userId,
        '2FA_ENABLED',
        { email: user.email },
        undefined,
        undefined
      );

      const backupCodes = user.backupCodes || [];

      return {
        success: true,
        backupCodes,
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error enabling 2FA:', error);
      throw new AppError('Failed to enable 2FA', 500);
    }
  }

  async disable2FA(userId: string, totpCode: string): Promise<{ success: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!user.twoFactorEnabled) {
        throw new AppError('2FA is not enabled', 400);
      }

      if (!user.twoFactorSecret) {
        throw new AppError('2FA secret not found', 400);
      }

      // Verify TOTP code
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: totpCode,
        window: 2,
      });

      if (!verified) {
        throw new AppError('Invalid TOTP code', 401);
      }

      // Disable 2FA and clear secrets
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: [],
        },
      });

      await this.securityService.trackActivity(
        userId,
        '2FA_DISABLED',
        { email: user.email },
        undefined,
        undefined
      );

      return {
        success: true,
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error disabling 2FA:', error);
      throw new AppError('Failed to disable 2FA', 500);
    }
  }

  async get2FAStatus(userId: string): Promise<{ enabled: boolean; hasBackupCodes: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorEnabled: true,
          backupCodes: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const hasBackupCodes = !!(user.backupCodes && user.backupCodes.length > 0);

      return {
        enabled: user.twoFactorEnabled || false,
        hasBackupCodes,
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error getting 2FA status:', error);
      throw new AppError('Failed to get 2FA status', 500);
    }
  }

  // ===================================================================
  // UI-MATCHING FLOW METHODS (New Endpoints - No Breaking Changes)
  // ===================================================================

  /**
   * Step 1: Validate Company Identifier
   */
  async validateCompanyIdentifier(data: ICompanyValidationDto): Promise<ICompanyValidationResponse> {
    try {
      const { companyIdentifier } = data;

      const company = await this.prisma.company.findFirst({
        where: {
          identifier: companyIdentifier,
          isActive: true,
        },
      });

      if (!company) {
        return {
          valid: false,
          nextStep: 'error',
          message: 'Company identifier not found or inactive',
        };
      }

      return {
        valid: true,
        companyId: company.id,
        companyName: company.name,
        nextStep: 'username',
      };

    } catch (error) {
      logger.error('Error validating company identifier:', error);
      throw new AppError('Failed to validate company identifier', 500);
    }
  }

  /**
   * Step 2: Validate Username within Company
   */
  async validateUsername(data: IUsernameValidationDto): Promise<IUsernameValidationResponse> {
    try {
      const { companyIdentifier, username } = data;

      // First validate company again
      const company = await this.prisma.company.findFirst({
        where: {
          identifier: companyIdentifier,
          isActive: true,
        },
      });

      if (!company) {
        return {
          valid: false,
          nextStep: 'error',
          message: 'Invalid company identifier',
        };
      }

      // Find user by username or email within this company
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: username },
            { email: username },
          ],
          companyId: company.id,
        },
      });

      if (!user) {
        return {
          valid: false,
          nextStep: 'error',
          message: 'Username not found in this company',
        };
      }

      return {
        valid: true,
        userId: user.id,
        email: user.email,
        nextStep: 'password',
      };

    } catch (error) {
      logger.error('Error validating username:', error);
      throw new AppError('Failed to validate username', 500);
    }
  }

  /**
   * Step 3: Validate Password and Check 2FA Requirement
   */
  async validatePassword(data: IPasswordValidationDto): Promise<IPasswordValidationResponse> {
    try {
      const { companyIdentifier, username, password } = data;

      // Validate company
      const company = await this.prisma.company.findFirst({
        where: {
          identifier: companyIdentifier,
          isActive: true,
        },
      });

      if (!company) {
        return {
          valid: false,
          requiresTOTP: false,
          nextStep: 'error',
          message: 'Invalid company identifier',
        };
      }

      // Find user
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: username },
            { email: username },
          ],
          companyId: company.id,
        },
        include: {
          role: true,
        },
      });

      if (!user) {
        return {
          valid: false,
          requiresTOTP: false,
          nextStep: 'error',
          message: 'User not found',
        };
      }

      // Verify password
      const isPasswordValid = await compare(password, user.password);
      if (!isPasswordValid) {
        return {
          valid: false,
          requiresTOTP: false,
          nextStep: 'error',
          message: 'Invalid password',
        };
      }

      // STRICT 2FA ENFORCEMENT: Check if 2FA is enabled
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        // If 2FA is not enabled, require setup (strict 2FA)
        return {
          valid: true,
          requiresTOTP: false,
          nextStep: 'error',
          message: '2FA is required but not enabled. Please contact administrator to enable 2FA.',
        };
      }

      // Create login token for TOTP verification
      const loginToken = crypto.randomBytes(32).toString('hex');
      
      await this.securityService.trackActivity(
        user.id,
        'PASSWORD_VALIDATED_AWAITING_TOTP',
        { username: user.username, companyIdentifier },
        undefined,
        undefined
      );

      return {
        valid: true,
        requiresTOTP: true,
        loginToken,
        nextStep: 'totp',
        message: 'Password validated. Please enter your authenticator code.',
      };

    } catch (error) {
      logger.error('Error validating password:', error);
      throw new AppError('Failed to validate password', 500);
    }
  }

  /**
   * Complete TOTP Login (Step 4) - Reuses existing verifyTOTPLogin
   */
  async completeTOTPLogin(data: ITOTPLoginVerifyDto): Promise<IAuthResponse> {
    // Reuse existing TOTP verification method
    return this.verifyTOTPLogin(data);
  }

  /**
   * Single-Page Registration (UI-Matching)
   */
  async registerSinglePage(data: ISinglePageRegistrationDto): Promise<ISinglePageRegistrationResponse> {
    try {
      const {
        companyFullName,
        companyShortName,
        companyWorkPhone,
        companyCity,
        companyCountry,
        fullName,
        jobTitle,
        phoneNumber,
        email,
        username,
        password,
      } = data;

      // Check if user already exists
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email or username already exists',
          requires2FASetup: false,
        };
      }

      // Parse full name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Generate company identifier: ISO country code + 6 characters (4 from shortName + 2 digits)
      const cleanShortName = companyShortName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
      const countryCode = companyCountry.toUpperCase();
      const randomDigits = Math.floor(10 + Math.random() * 90); // 2 digits (10-99)
      const companyIdentifier = `${countryCode}${cleanShortName}${randomDigits}`;

      // Hash password
      const hashedPassword = await hash(password, BCRYPT_ROUNDS);

      // Create company
      const company = await this.prisma.company.create({
        data: {
          name: companyFullName,
          identifier: companyIdentifier,
          fullName: companyFullName,
          shortName: companyShortName,
          workPhone: companyWorkPhone,
          city: companyCity,
          countryCode: companyCountry,
          isActive: true,
        },
      });

      // Create company-specific default role
      const defaultRole = await this.prisma.role.create({
        data: {
          name: 'USER',
          description: 'Standard user role',
          permissions: ['basic.access'],
          isActive: true,
          companyId: company.id
        },
      });

      // Create user with 2FA setup required
      const user = await this.prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          firstName,
          lastName,
          phoneNumber: phoneNumber,
          roleId: defaultRole.id,
          companyId: company.id,
          twoFactorEnabled: false, // Will be enabled after mandatory setup
          twoFactorSetupRequired: true, // Strict 2FA requirement
        },
        include: {
          role: true,
        },
      });

      await this.securityService.trackActivity(
        user.id,
        company.id,
        'USER_REGISTERED_SINGLE_PAGE',
        { 
          username: user.username, 
          companyIdentifier,
          requires2FASetup: true 
        },
        undefined,
        undefined
      );

      return {
        success: true,
        message: 'Registration successful. 2FA setup is required before you can login.',
        companyIdentifier,
        requires2FASetup: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.role?.name || 'USER',
          companyId: user.companyId,
          company: {
            id: company.id,
            name: company.name,
            identifier: company.identifier,
          },
          twoFactorEnabled: false,
          twoFactorSetupRequired: true,
        },
      };

    } catch (error) {
      logger.error('Error during single-page registration:', error);
      throw new AppError('Registration failed', 500);
    }
  }

  /**
   * Force 2FA Setup for User (Strict 2FA Enforcement)
   */
  async force2FASetup(userId: string): Promise<ITOTP2FASetupResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Force 2FA setup regardless of current status
      const secret = speakeasy.generateSecret({
        name: `Enxero Platform (${user.email})`,
        issuer: 'Enxero Platform',
        length: 32,
      });

      const qrCodeImage = await QRCode.toDataURL(secret.otpauth_url!);

      const backupCodes = Array.from({ length: 8 }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Update user with secret and backup codes
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: secret.base32,
          backupCodes: backupCodes,
          twoFactorEnabled: false, // Will be enabled after verification
          twoFactorSetupRequired: true,
        },
      });

      await this.securityService.trackActivity(
        userId,
        'FORCED_2FA_SETUP_INITIATED',
        { email: user.email },
        undefined,
        undefined
      );

      return {
        secret: secret.base32!,
        qrCodeImage,
        backupCodes,
        manualEntryKey: secret.base32!,
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error during forced 2FA setup:', error);
      throw new AppError('Failed to setup 2FA', 500);
    }
  }

  // Helper methods for login session management
  private async storeLoginSession(token: string, session: any): Promise<void> {
    // Store in database temporary table
    await this.prisma.systemConfig.create({
      data: {
        key: `login_session_${token}`,
        value: session,
        description: 'Temporary login session',
        isActive: true
      }
    });
  }

  private async getLoginSession(token: string): Promise<any> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: `login_session_${token}` }
    });
    
    if (!config) return null;
    
    const session = config.value as any;
    if (new Date() > new Date(session.expiresAt)) {
      await this.deleteLoginSession(token);
      return null;
    }
    
    return session;
  }

  private async deleteLoginSession(token: string): Promise<void> {
    try {
      await this.prisma.systemConfig.delete({
        where: { key: `login_session_${token}` }
      });
    } catch (error) {
      // Session might not exist
    }
  }
}
