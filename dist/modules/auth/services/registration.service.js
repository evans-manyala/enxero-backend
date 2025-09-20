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
exports.RegistrationService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const crypto = __importStar(require("crypto"));
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
const email_service_1 = require("../../../shared/services/email.service");
const speakeasy = __importStar(require("speakeasy"));
const security_constants_1 = require("../../../shared/constants/security.constants");
class RegistrationService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
        this.emailService = new email_service_1.EmailService();
    }
    /**
     * Step 1: Register company details and generate identifier
     */
    async registerStep1(data) {
        try {
            // Validate input data
            await this.validateStep1Data(data);
            // Check if email is already registered globally (for now, we'll allow same email across companies later)
            const existingUser = await this.prisma.user.findFirst({
                where: { email: data.ownerEmail }
            });
            if (existingUser) {
                throw new AppError_1.AppError('Email address is already registered', http_status_1.HttpStatus.CONFLICT);
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
                throw new AppError_1.AppError('Company name or phone number is already registered', http_status_1.HttpStatus.CONFLICT);
            }
            // Generate AA-NANAANN format company identifier
            const companyIdentifier = this.generateAANANAANNIdentifier(data.countryCode, data.shortName);
            // Create registration session
            const sessionToken = this.generateSessionToken();
            const session = {
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
            await this.emailService.sendCompanyIdentifierEmail(data.ownerEmail, data.ownerFirstName, data.companyName, companyIdentifier);
            // Log registration step 1
            await this.logRegistrationStep('STEP_1_COMPLETED', sessionToken, data.ipAddress, data.userAgent);
            return {
                sessionToken,
                companyIdentifier,
                step: 1,
                nextStep: 'Set username and password',
                expiresAt: session.expiresAt
            };
        }
        catch (error) {
            logger_1.default.error('Error in registration step 1:', error);
            throw error;
        }
    }
    /**
     * Step 2: Set username and password
     */
    async registerStep2(data) {
        try {
            // Validate passwords match
            if (data.password !== data.confirmPassword) {
                throw new AppError_1.AppError('Passwords do not match', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Validate password strength
            this.validatePasswordStrength(data.password);
            // Get registration session
            const session = await this.getRegistrationSession(data.sessionToken);
            if (!session || session.step !== 1) {
                throw new AppError_1.AppError('Invalid session or incorrect step', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Check if username is available globally (for now, we'll allow same username across companies later)
            const existingUser = await this.prisma.user.findFirst({
                where: { username: data.username }
            });
            if (existingUser) {
                throw new AppError_1.AppError('Username is already taken', http_status_1.HttpStatus.CONFLICT);
            }
            // Update session with user credentials
            session.step = 2;
            session.userData = {
                ...session.userData,
                username: data.username,
                passwordHash: await (0, bcryptjs_1.hash)(data.password, security_constants_1.BCRYPT_ROUNDS)
            };
            await this.updateRegistrationSession(session);
            // Send confirmation email
            await this.emailService.sendCredentialsConfirmationEmail(session.email, session.userData.firstName, data.username);
            // Log registration step 2
            await this.logRegistrationStep('STEP_2_COMPLETED', data.sessionToken, data.ipAddress, data.userAgent);
            return {
                sessionToken: data.sessionToken,
                step: 2,
                nextStep: 'Set up Two-Factor Authentication',
                username: data.username
            };
        }
        catch (error) {
            logger_1.default.error('Error in registration step 2:', error);
            throw error;
        }
    }
    /**
     * Step 3: Setup 2FA and complete registration
     */
    async registerStep3(data) {
        try {
            // Get registration session
            const session = await this.getRegistrationSession(data.sessionToken);
            if (!session || session.step !== 2) {
                throw new AppError_1.AppError('Invalid session or incorrect step', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Verify 2FA token
            const secret = this.generate2FASecret();
            const isValidToken = speakeasy.totp.verify({
                secret: secret.base32,
                token: data.twoFactorToken,
                window: 2
            });
            if (!isValidToken) {
                throw new AppError_1.AppError('Invalid 2FA token', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Generate backup codes if not provided
            const backupCodes = data.backupCodes || this.generateBackupCodes();
            // Create company and user in transaction
            const result = await this.prisma.$transaction(async (tx) => {
                // Validate session data exists
                if (!session.companyData || !session.userData) {
                    throw new AppError_1.AppError('Invalid session data', http_status_1.HttpStatus.BAD_REQUEST);
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
            }); // Clean up registration session
            await this.deleteRegistrationSession(data.sessionToken);
            // Send welcome email
            await this.emailService.sendWelcomeEmail(session.email, session.userData?.firstName || '', result.company.name, result.company.identifier || result.company.id); // Log registration completion
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
        }
        catch (error) {
            logger_1.default.error('Error in registration step 3:', error);
            throw error;
        }
    }
    /**
     * Get registration status
     */
    async getRegistrationStatus(sessionToken) {
        const session = await this.getRegistrationSession(sessionToken);
        if (!session) {
            throw new AppError_1.AppError('Invalid session token', http_status_1.HttpStatus.BAD_REQUEST);
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
    generateCompanyIdentifier(countryCode, shortName) {
        return this.generateAANANAANNIdentifier(countryCode, shortName);
    }
    /**
     * Resend email for current step
     */
    async resendEmail(sessionToken, step) {
        const session = await this.getRegistrationSession(sessionToken);
        if (!session) {
            throw new AppError_1.AppError('Invalid session token', http_status_1.HttpStatus.BAD_REQUEST);
        }
        switch (step) {
            case 1:
                if (session.userData) {
                    await this.emailService.sendCompanyIdentifierEmail(session.email, session.userData.firstName, session.companyData?.name || '', session.companyData?.identifier || '');
                }
                break;
            case 2:
                if (session.userData) {
                    await this.emailService.sendCredentialsConfirmationEmail(session.email, session.userData.firstName, session.userData.username);
                }
                break;
            default:
                throw new AppError_1.AppError('Invalid step for email resend', http_status_1.HttpStatus.BAD_REQUEST);
        }
        return { message: 'Email sent successfully' };
    }
    // Private helper methods
    async validateStep1Data(data) {
        if (!data.companyName || data.companyName.length < 2) {
            throw new AppError_1.AppError('Company name must be at least 2 characters', http_status_1.HttpStatus.BAD_REQUEST);
        }
        if (!data.countryCode || data.countryCode.length !== 2) {
            throw new AppError_1.AppError('Country code must be 2 characters (ISO 3166-1 alpha-2)', http_status_1.HttpStatus.BAD_REQUEST);
        }
        if (!data.phoneNumber || !this.isValidE164Phone(data.phoneNumber)) {
            throw new AppError_1.AppError('Invalid phone number format. Use E.164 format', http_status_1.HttpStatus.BAD_REQUEST);
        }
        if (!data.ownerEmail || !this.isValidEmail(data.ownerEmail)) {
            throw new AppError_1.AppError('Invalid email address', http_status_1.HttpStatus.BAD_REQUEST);
        }
    }
    generateAANANAANNIdentifier(countryCode, shortName) {
        const country = countryCode.toUpperCase().padEnd(2, 'X').substring(0, 2);
        // Generate NANAANN pattern (Number-Alpha-Number-Alpha-Alpha-Number-Number)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nums = '0123456789';
        // Use company short name for some characters if available, otherwise random
        let pattern = '';
        if (shortName && shortName.length >= 2) {
            const cleanShort = shortName.toUpperCase().replace(/[^A-Z0-9]/g, '');
            pattern = [
                Math.floor(Math.random() * 10).toString(), // N
                cleanShort[0] || chars[Math.floor(Math.random() * chars.length)], // A (from company name)
                Math.floor(Math.random() * 10).toString(), // N
                cleanShort[1] || chars[Math.floor(Math.random() * chars.length)], // A (from company name)
                chars[Math.floor(Math.random() * chars.length)], // A
                Math.floor(Math.random() * 10).toString(), // N
                Math.floor(Math.random() * 10).toString() // N
            ].join('');
        }
        else {
            pattern = [
                nums[Math.floor(Math.random() * nums.length)], // N
                chars[Math.floor(Math.random() * chars.length)], // A  
                nums[Math.floor(Math.random() * nums.length)], // N
                chars[Math.floor(Math.random() * chars.length)], // A
                chars[Math.floor(Math.random() * chars.length)], // A
                nums[Math.floor(Math.random() * nums.length)], // N
                nums[Math.floor(Math.random() * nums.length)] // N
            ].join('');
        }
        return `${country}-${pattern}`;
    }
    generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    generate2FASecret() {
        return speakeasy.generateSecret({
            name: 'Enxero Platform',
            length: 32
        });
    }
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
        }
        return codes;
    }
    validatePasswordStrength(password) {
        if (password.length < 8) {
            throw new AppError_1.AppError('Password must be at least 8 characters long', http_status_1.HttpStatus.BAD_REQUEST);
        }
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        if (!hasUpper || !hasLower || !hasNumbers || !hasSpecial) {
            throw new AppError_1.AppError('Password must contain uppercase, lowercase, numbers, and special characters', http_status_1.HttpStatus.BAD_REQUEST);
        }
    }
    isValidE164Phone(phone) {
        return /^\+[1-9]\d{1,14}$/.test(phone);
    }
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    getNextStepDescription(currentStep) {
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
    async storeRegistrationSession(session) {
        // For now, store in database - you can switch to Redis later
        await this.prisma.systemConfig.create({
            data: {
                key: `registration_session_${session.id}`,
                value: session, // Cast to bypass type check
                description: 'Registration session data',
                isActive: true
            }
        });
    }
    async getRegistrationSession(sessionToken) {
        try {
            const config = await this.prisma.systemConfig.findUnique({
                where: { key: `registration_session_${sessionToken}` }
            });
            if (!config)
                return null;
            const session = config.value;
            // Check if session is expired
            if (new Date() > new Date(session.expiresAt)) {
                await this.deleteRegistrationSession(sessionToken);
                return null;
            }
            return session;
        }
        catch (error) {
            return null;
        }
    }
    async updateRegistrationSession(session) {
        await this.prisma.systemConfig.update({
            where: { key: `registration_session_${session.id}` },
            data: { value: session } // Cast to bypass type check
        });
    }
    async deleteRegistrationSession(sessionToken) {
        try {
            await this.prisma.systemConfig.delete({
                where: { key: `registration_session_${sessionToken}` }
            });
        }
        catch (error) {
            // Session might not exist, ignore error
        }
    }
    async logRegistrationStep(action, sessionToken, ipAddress, userAgent) {
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
        }
        catch (error) {
            // Don't fail registration if logging fails
            console.error('Failed to log registration step:', error);
        }
    }
}
exports.RegistrationService = RegistrationService;
