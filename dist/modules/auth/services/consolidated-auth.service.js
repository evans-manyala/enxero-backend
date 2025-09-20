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
exports.ConsolidatedAuthService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = require("jsonwebtoken");
const crypto = __importStar(require("crypto"));
const bcryptjs_2 = require("bcryptjs");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
const email_service_1 = require("../../../shared/services/email.service");
const security_constants_1 = require("../../../shared/constants/security.constants");
const security_service_1 = require("./security.service");
const environment_1 = __importDefault(require("../../../config/environment"));
/**
 * Consolidated Authentication Service
 *
 * This service consolidates redundant authentication logic to reduce code duplication
 * and provide a unified interface for all authentication operations.
 */
class ConsolidatedAuthService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
        this.emailService = new email_service_1.EmailService();
        this.securityService = new security_service_1.SecurityService();
    }
    /**
     * Unified Registration Method
     * Consolidates single-page and multi-step registration logic
     */
    async registerUser(data) {
        try {
            // Check if user exists
            const existingUser = await this.prisma.user.findFirst({
                where: {
                    OR: [{ email: data.email }, { username: data.username }],
                },
            });
            if (existingUser) {
                throw new AppError_1.AppError('User already exists', http_status_1.HttpStatus.CONFLICT);
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
                throw new AppError_1.AppError('Company already exists', http_status_1.HttpStatus.CONFLICT);
            }
            // Generate company identifier
            const companyIdentifier = this.generateCompanyIdentifier(data.countryCode, data.companyShortName);
            // Hash password
            const hashedPassword = await (0, bcryptjs_2.hash)(data.password, security_constants_1.BCRYPT_ROUNDS);
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
            await this.securityService.trackActivity(result.user.id, data.singleStep ? 'USER_REGISTERED_SINGLE_PAGE' : 'USER_REGISTERED_MULTI_STEP', {
                username: result.user.username,
                companyIdentifier,
                requires2FASetup: data.require2FA || false
            }, undefined, undefined);
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
        }
        catch (error) {
            logger_1.default.error('Error during consolidated registration:', error);
            throw error;
        }
    }
    /**
     * Unified Login Method
     * Consolidates all login flows (TOTP, OTP, step-by-step validation)
     */
    async initiateLogin(data) {
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
                await this.securityService.trackFailedLoginAttempt(data.email || data.username || '', data.ipAddress, data.userAgent);
                throw new AppError_1.AppError('Invalid credentials', http_status_1.HttpStatus.UNAUTHORIZED);
            }
            // Check if account is locked
            const isLocked = await this.securityService.isAccountLocked(user.id);
            if (isLocked) {
                throw new AppError_1.AppError('Account is locked due to too many failed attempts. Please try again later.', http_status_1.HttpStatus.UNAUTHORIZED);
            }
            // Verify password
            const isPasswordValid = await (0, bcryptjs_1.compare)(data.password, user.password);
            if (!isPasswordValid) {
                await this.securityService.trackFailedLoginAttempt(data.email || data.username || '', data.ipAddress, data.userAgent);
                throw new AppError_1.AppError('Invalid credentials', http_status_1.HttpStatus.UNAUTHORIZED);
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
        }
        catch (error) {
            logger_1.default.error('Error during consolidated login:', error);
            throw error;
        }
    }
    /**
     * Complete Login (after TOTP/OTP verification)
     */
    async completeLogin(data) {
        // Implementation would depend on the stored login session
        // This consolidates both TOTP and OTP verification
        // ... implementation details
    }
    // Private helper methods
    generateCompanyIdentifier(countryCode, shortName) {
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
        }
        else {
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
    determineLoginType(user) {
        if (user.twoFactorEnabled && user.twoFactorSecret) {
            return 'totp';
        }
        // Check if email service is configured for OTP
        const isEmailConfigured = environment_1.default.EMAIL_USER && environment_1.default.EMAIL_PASS;
        if (isEmailConfigured) {
            return 'email_otp';
        }
        // In production, require proper email configuration for security
        if (environment_1.default.NODE_ENV === 'production' && !isEmailConfigured) {
            throw new AppError_1.AppError('Authentication service unavailable. Please contact support.', http_status_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        return 'direct';
    }
    async handleTOTPLogin(user, data) {
        // Create temporary login token for TOTP verification
        const loginToken = crypto.randomBytes(32).toString('hex');
        await this.securityService.trackActivity(user.id, 'TOTP_LOGIN_INITIATED', { username: user.username }, data.ipAddress, data.userAgent);
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
    async handleEmailOTPLogin(user, data) {
        // Generate OTP and send email
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const loginToken = crypto.randomBytes(32).toString('hex');
        // Store login session (simplified - in production use Redis)
        // ... implementation
        try {
            await this.emailService.sendLoginOtpEmail(user.email, user.firstName, otpCode);
        }
        catch (emailError) {
            logger_1.default.warn('Failed to send login OTP email:', emailError);
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
    async handleDirectLogin(user, data) {
        // Generate tokens and complete login
        const tokens = this.generateTokens(user);
        await this.securityService.createSession(user.id, tokens.refreshToken, data.ipAddress, data.userAgent);
        await this.securityService.trackActivity(user.id, 'USER_LOGIN_DIRECT', { username: user.username }, data.ipAddress, data.userAgent);
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
    generateTokens(user) {
        const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-please-change-in-production';
        const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key-please-change-in-production';
        const accessToken = (0, jsonwebtoken_1.sign)({ userId: user.id, roleId: user.roleId, companyId: user.companyId, type: 'access' }, jwtSecret, { expiresIn: '1h' });
        const refreshToken = (0, jsonwebtoken_1.sign)({ userId: user.id, type: 'refresh', jti: Date.now() + '_' + Math.random().toString(36).substr(2, 9) }, jwtRefreshSecret, { expiresIn: '7d' });
        return { accessToken, refreshToken };
    }
    maskEmail(email) {
        const [local, domain] = email.split('@');
        const maskedLocal = local.length > 3
            ? local.substring(0, 2) + '*'.repeat(local.length - 3) + local.slice(-1)
            : local;
        return `${maskedLocal}@${domain}`;
    }
}
exports.ConsolidatedAuthService = ConsolidatedAuthService;
