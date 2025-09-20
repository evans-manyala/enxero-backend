"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
class SecurityService {
    constructor() {
        this.MAX_FAILED_ATTEMPTS = 5;
        this.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
        this.SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.prisma = new client_1.PrismaClient();
    }
    /**
     * Track a failed login attempt and check if account should be locked
     */
    async trackFailedLoginAttempt(email, ipAddress, userAgent, companyId) {
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
                logger_1.default.warn(`Account locked for user ${user.id} until ${lockoutUntil} due to ${recentAttempts} failed attempts`);
            }
        }
    }
    /**
     * Check if an account is locked
     */
    async isAccountLocked(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                isActive: true,
                resetTokenExpiry: true
            },
        });
        if (!user)
            return false;
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
                logger_1.default.info(`Account unlocked for user ${userId} after lockout period expired`);
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
    async createSession(userId, companyId, token, ipAddress, userAgent) {
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
    async getUserSessions(userId) {
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
    async invalidateSession(token) {
        await this.prisma.userSession.delete({
            where: { token },
        });
    }
    /**
     * Invalidate all sessions for a user
     */
    async invalidateAllSessions(userId) {
        await this.prisma.userSession.deleteMany({
            where: { userId },
        });
    }
    /**
     * Track user activity
     */
    async trackActivity(userId, companyIdOrAction, actionOrMetadata, metadataOrIpAddress, ipAddressOrUserAgent, userAgent) {
        // Handle backward compatibility - if second param looks like action, use old signature
        let companyId;
        let action;
        let metadata;
        let ipAddress;
        let finalUserAgent;
        if (typeof actionOrMetadata === 'string') {
            // New signature: userId, companyId, action, metadata, ipAddress, userAgent
            companyId = companyIdOrAction;
            action = actionOrMetadata;
            metadata = metadataOrIpAddress;
            ipAddress = ipAddressOrUserAgent;
            finalUserAgent = userAgent;
        }
        else {
            // Old signature: userId, action, metadata, ipAddress, userAgent
            companyId = 'default-company'; // fallback
            action = companyIdOrAction;
            metadata = actionOrMetadata;
            ipAddress = metadataOrIpAddress;
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
    async getUserActivities(userId, limit = 50, offset = 0) {
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
    async cleanupOldRecords() {
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
exports.SecurityService = SecurityService;
