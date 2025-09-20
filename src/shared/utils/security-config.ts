import env from '../../config/environment';
import logger from './logger';
import { AppError } from './AppError';
import { HttpStatus } from './http-status';

export class SecurityConfig {
  private static instance: SecurityConfig;

  // Security constants
  public static readonly BCRYPT_ROUNDS = 12;
  public static readonly MAX_FAILED_ATTEMPTS = 5;
  public static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  public static readonly SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  public static readonly OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
  public static readonly OTP_MAX_ATTEMPTS = 3;

  private constructor() {}

  public static getInstance(): SecurityConfig {
    if (!SecurityConfig.instance) {
      SecurityConfig.instance = new SecurityConfig();
    }
    return SecurityConfig.instance;
  }

  /**
   * Check if email service is properly configured
   */
  public isEmailConfigured(): boolean {
    return !!(env.EMAIL_USER && env.EMAIL_PASS && env.EMAIL_HOST);
  }

  /**
   * Validate authentication service configuration
   * Throws error in production if critical services are not configured
   */
  public validateAuthConfig(): void {
    const isEmailConfigured = this.isEmailConfigured();
    
    if (env.NODE_ENV === 'production') {
      if (!isEmailConfigured) {
        logger.error('Email service not configured in production environment');
        throw new AppError(
          'Authentication service unavailable. Please contact support.',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
        logger.error('JWT_SECRET not properly configured in production');
        throw new AppError(
          'Authentication service unavailable. Please contact support.',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      if (!env.DATABASE_URL) {
        logger.error('DATABASE_URL not configured in production');
        throw new AppError(
          'Service unavailable. Please contact support.',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    } else {
      // Development environment warnings
      if (!isEmailConfigured) {
        logger.warn('Email service not configured - some features may not work properly');
      }
    }
  }

  /**
   * Check if we can safely bypass OTP in development
   */
  public canBypassOTP(): boolean {
    return env.NODE_ENV !== 'production' && !this.isEmailConfigured();
  }

  /**
   * Get environment-appropriate authentication method
   */
  public getAuthMethod(hasTOTP: boolean): 'totp' | 'email_otp' | 'direct' {
    if (hasTOTP) {
      return 'totp';
    }

    if (this.isEmailConfigured()) {
      return 'email_otp';
    }

    // In production, must have email configured
    if (env.NODE_ENV === 'production') {
      throw new AppError(
        'Authentication service unavailable. Please contact support.',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    // Development fallback
    logger.warn('Falling back to direct authentication in development');
    return 'direct';
  }

  /**
   * Log security event
   */
  public logSecurityEvent(event: string, details: any = {}): void {
    logger.info(`Security Event: ${event}`, {
      ...details,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV
    });
  }
}

export default SecurityConfig.getInstance();