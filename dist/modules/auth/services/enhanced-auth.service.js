"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedAuthService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = require("jsonwebtoken");
const crypto = __importStar(require("crypto"));
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
const email_service_1 = require("../../../shared/services/email.service");
const security_service_1 = require("./security.service");
const environment_1 = __importDefault(require("../../../config/environment"));
class EnhancedAuthService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
        this.emailService = new email_service_1.EmailService();
        this.securityService = new security_service_1.SecurityService();
    }
    /**
     * Initiate login process - validate credentials and send OTP
     */
    async initiateLogin(data) {
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
                throw new AppError_1.AppError('Invalid credentials', http_status_1.HttpStatus.UNAUTHORIZED);
            }
            // Check if account is locked
            const isLocked = await this.securityService.isAccountLocked(user.id);
            if (isLocked) {
                throw new AppError_1.AppError('Account is locked due to too many failed attempts. Please try again later.', http_status_1.HttpStatus.UNAUTHORIZED);
            }
            // Verify password
            const isPasswordValid = await (0, bcryptjs_1.compare)(password, user.password);
            if (!isPasswordValid) {
                await this.securityService.trackFailedLoginAttempt(email, ipAddress, userAgent);
                throw new AppError_1.AppError('Invalid credentials', http_status_1.HttpStatus.UNAUTHORIZED);
            }
            // Check if email service is configured
            const isEmailConfigured = environment_1.default.EMAIL_USER && environment_1.default.EMAIL_PASS;
            if (!isEmailConfigured) {
                // Only allow bypass in development environment
                if (environment_1.default.NODE_ENV !== 'production') {
                    logger_1.default.warn('Email service not configured, skipping OTP for development');
                    return {
                        loginToken: 'dev-mode-no-otp',
                        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                        email: this.maskEmail(user.email),
                        message: 'Development mode: OTP skipped (email not configured)',
                        requiresOtp: false
                    };
                }
                else {
                    // In production, email service must be configured
                    logger_1.default.error('Email service not configured in production environment');
                    throw new AppError_1.AppError('Authentication service unavailable. Please contact support.', http_status_1.HttpStatus.SERVICE_UNAVAILABLE);
                }
            }
            // Generate OTP for email verification
            const otpCode = this.generateOtpCode();
            const loginToken = this.generateLoginToken();
            // Create login session
            const loginSession = {
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
            await this.emailService.sendLoginOtpEmail(user.email, user.firstName, otpCode);
            // Track login initiation
            await this.securityService.trackActivity(user.id, user.companyId, 'LOGIN_INITIATED', { method: 'email_otp' }, ipAddress, userAgent);
            return {
                loginToken,
                expiresAt: loginSession.expiresAt,
                email: this.maskEmail(user.email),
                message: 'Verification code sent to your email'
            };
        }
        catch (error) {
            logger_1.default.error('Error in initiate login:', error);
            throw error;
        }
    }
    /**
     * Verify OTP and complete login
     */
    async verifyLoginOtp(data) {
        try {
            const { loginToken, otpCode, ipAddress, userAgent } = data;
            // Get login session
            const loginSession = await this.getLoginSession(loginToken);
            if (!loginSession) {
                throw new AppError_1.AppError('Invalid or expired login session', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Check if session is expired
            if (new Date() > new Date(loginSession.expiresAt)) {
                await this.deleteLoginSession(loginToken);
                throw new AppError_1.AppError('Login session has expired', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Check if max attempts exceeded
            if (loginSession.attempts >= loginSession.maxAttempts) {
                await this.deleteLoginSession(loginToken);
                throw new AppError_1.AppError('Maximum verification attempts exceeded', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Verify OTP
            if (otpCode !== loginSession.otpCode) {
                // Increment failed attempts
                loginSession.attempts += 1;
                await this.updateLoginSession(loginSession);
                const remainingAttempts = loginSession.maxAttempts - loginSession.attempts;
                throw new AppError_1.AppError(`Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'Session expired.'}`, http_status_1.HttpStatus.BAD_REQUEST);
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
                throw new AppError_1.AppError('User not found', http_status_1.HttpStatus.NOT_FOUND);
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
            await this.securityService.createSession(user.id, user.companyId, tokens.refreshToken, ipAddress, userAgent);
            // Clean up login session
            await this.deleteLoginSession(loginToken);
            // Track successful login
            await this.securityService.trackActivity(user.id, user.companyId, 'LOGIN_COMPLETED', { method: 'email_otp_verified' }, ipAddress, userAgent);
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
        }
        catch (error) {
            logger_1.default.error('Error in verify login OTP:', error);
            throw error;
        }
    }
    /**
     * Check workspace access based on flowchart logic
     */
    async checkWorkspaceAccess(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    role: true,
                    company: true
                }
            });
            if (!user) {
                throw new AppError_1.AppError('User not found', http_status_1.HttpStatus.NOT_FOUND);
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
        }
        catch (error) {
            logger_1.default.error('Error checking workspace access:', error);
            throw error;
        }
    }
    /**
     * Resend login OTP
     */
    async resendLoginOtp(loginToken) {
        try {
            const loginSession = await this.getLoginSession(loginToken);
            if (!loginSession) {
                throw new AppError_1.AppError('Invalid login session', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Check if session is still valid
            if (new Date() > new Date(loginSession.expiresAt)) {
                await this.deleteLoginSession(loginToken);
                throw new AppError_1.AppError('Login session has expired', http_status_1.HttpStatus.BAD_REQUEST);
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
                throw new AppError_1.AppError('User not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            // Generate new OTP
            const newOtpCode = this.generateOtpCode();
            loginSession.otpCode = newOtpCode;
            loginSession.attempts = 0; // Reset attempts
            loginSession.expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // Extend expiry
            await this.updateLoginSession(loginSession);
            // Send new OTP
            await this.emailService.sendLoginOtpEmail(user.email, user.firstName, newOtpCode);
            return {
                message: 'New verification code sent',
                expiresAt: loginSession.expiresAt,
                email: this.maskEmail(user.email)
            };
        }
        catch (error) {
            logger_1.default.error('Error resending login OTP:', error);
            throw error;
        }
    }
    // Private helper methods
    generateOtpCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    generateLoginToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    generateTokens(user) {
        const accessToken = (0, jsonwebtoken_1.sign)({ userId: user.id, roleId: user.roleId, type: 'access' }, environment_1.default.JWT_SECRET, { expiresIn: environment_1.default.JWT_EXPIRES_IN });
        const refreshToken = (0, jsonwebtoken_1.sign)({ userId: user.id, type: 'refresh', jti: Date.now() + '_' + Math.random().toString(36).substr(2, 9) }, environment_1.default.JWT_REFRESH_SECRET, { expiresIn: environment_1.default.JWT_REFRESH_EXPIRES_IN });
        return { accessToken, refreshToken };
    }
    maskEmail(email) {
        const [local, domain] = email.split('@');
        const maskedLocal = local.length > 3
            ? local.substring(0, 2) + '*'.repeat(local.length - 3) + local.slice(-1)
            : local;
        return `${maskedLocal}@${domain}`;
    }
    async checkRequiresWorkspaceSelection(userId) {
        // Check if user has multiple workspace access
        const workspaces = await this.getAvailableWorkspaces(userId);
        return workspaces.length > 1;
    }
    async getAvailableWorkspaces(userId) {
        // This would be expanded based on your workspace/module licensing logic
        // For now, return the user's company workspace
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { company: true }
        });
        if (!user?.company)
            return [];
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
    async storeLoginSession(session) {
        await this.prisma.systemConfig.create({
            data: {
                key: `login_session_${session.id}`,
                value: session,
                description: 'Login OTP session data',
                isActive: true
            }
        });
    }
    async getLoginSession(loginToken) {
        try {
            const config = await this.prisma.systemConfig.findUnique({
                where: { key: `login_session_${loginToken}` }
            });
            if (!config)
                return null;
            return config.value;
        }
        catch (error) {
            return null;
        }
    }
    async updateLoginSession(session) {
        await this.prisma.systemConfig.update({
            where: { key: `login_session_${session.id}` },
            data: { value: session }
        });
    }
    async deleteLoginSession(loginToken) {
        try {
            await this.prisma.systemConfig.delete({
                where: { key: `login_session_${loginToken}` }
            });
        }
        catch (error) {
            // Session might not exist, ignore error
        }
    }
}
exports.EnhancedAuthService = EnhancedAuthService;
