import { PrismaClient, User, FailedLoginAttempt, UserSession, UserActivity } from '@prisma/client';
import { AppError } from '../../../shared/utils/AppError';
import env from '../../../config/environment';
import logger from '../../../shared/utils/logger';

export class SecurityService {
  private prisma: PrismaClient;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
  private readonly SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Track a failed login attempt and check if account should be locked
   */
  async trackFailedLoginAttempt(
    email: string, 
    ipAddress?: string, 
    userAgent?: string,
    companyId?: string
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { email } });
    
    // Create failed attempt record
    await this.prisma.failedLoginAttempt.create({
      data: {
        email,
        ipAddress,
        userAgent,
        companyId,
      },
    });

    // Check if account should be locked
    if (user) {
      const recentAttempts = await this.prisma.failedLoginAttempt.count({
        where: {
          email,
          createdAt: {
            gte: new Date(Date.now() - this.LOCKOUT_DURATION),
          },
        },
      });

      if (recentAttempts >= this.MAX_FAILED_ATTEMPTS) {
        // Implement temporary lockout using existing isActive field and resetTokenExpiry
        const lockoutUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
        
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: false,
            resetTokenExpiry: lockoutUntil, // Use resetTokenExpiry as lockout expiry
          },
        });
        
        logger.warn(`Account locked for user ${user.id} until ${lockoutUntil} due to ${recentAttempts} failed attempts`);
      }
    }
  }

  /**
   * Check if an account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        isActive: true, 
        resetTokenExpiry: true 
      },
    });

    if (!user) return false;

    // If account is inactive, check if it's due to temporary lockout
    if (!user.isActive) {
      // Check if lockout has expired (resetTokenExpiry is being used as lockout expiry)
      if (user.resetTokenExpiry && new Date() > user.resetTokenExpiry) {
        // Lockout has expired, reactivate the account
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            isActive: true,
            resetTokenExpiry: null
          }
        });
        
        // Clear failed attempts
        await this.prisma.failedLoginAttempt.deleteMany({
          where: { 
            email: {
              in: await this.prisma.user.findUnique({
                where: { id: userId },
                select: { email: true }
              }).then(u => u ? [u.email] : [])
            }
          }
        });
        
        logger.info(`Account unlocked for user ${userId} after lockout period expired`);
        return false;
      }
      
      // Account is still locked
      return true;
    }

    return false;
  }

  /**
   * Create a new user session
   */
  async createSession(userId: string, companyId: string, token: string, ipAddress?: string, userAgent?: string): Promise<UserSession> {
    // Ensure token is unique by deleting any existing session with the same token
    await this.prisma.userSession.deleteMany({ where: { token } });
    return this.prisma.userSession.create({
      data: {
        userId,
        companyId,
        token,
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
        expiresAt: new Date(Date.now() + this.SESSION_EXPIRY),
      },
    });
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(token: string): Promise<void> {
    await this.prisma.userSession.delete({
      where: { token },
    });
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { userId },
    });
  }

  /**
   * Track user activity
   */
  async trackActivity(
    userId: string,
    companyIdOrAction: string,
    actionOrMetadata?: string | Record<string, any>,
    metadataOrIpAddress?: Record<string, any> | string,
    ipAddressOrUserAgent?: string,
    userAgent?: string
  ): Promise<UserActivity> {
    // Handle backward compatibility - if second param looks like action, use old signature
    let companyId: string;
    let action: string;
    let metadata: Record<string, any> | undefined;
    let ipAddress: string | undefined;
    let finalUserAgent: string | undefined;
    
    if (typeof actionOrMetadata === 'string') {
      // New signature: userId, companyId, action, metadata, ipAddress, userAgent
      companyId = companyIdOrAction;
      action = actionOrMetadata;
      metadata = metadataOrIpAddress as Record<string, any>;
      ipAddress = ipAddressOrUserAgent;
      finalUserAgent = userAgent;
    } else {
      // Old signature: userId, action, metadata, ipAddress, userAgent
      companyId = 'default-company'; // fallback
      action = companyIdOrAction;
      metadata = actionOrMetadata as Record<string, any>;
      ipAddress = metadataOrIpAddress as string;
      finalUserAgent = ipAddressOrUserAgent;
    }
    return this.prisma.userActivity.create({
      data: {
        userId,
        companyId,
        action,
        details: metadata,
        ipAddress: ipAddress || '',
        userAgent: finalUserAgent || '',
      },
    });
  }

  /**
   * Get recent activities for a user
   */
  async getUserActivities(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserActivity[]> {
    return this.prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Clean up expired sessions and old failed attempts
   */
  async cleanupOldRecords(): Promise<void> {
    const now = new Date();

    // Delete expired sessions
    await this.prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // Delete old failed attempts (older than 24 hours)
    await this.prisma.failedLoginAttempt.deleteMany({
      where: {
        createdAt: {
          lt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      },
    });
  }
} 