"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityConfig = void 0;
const environment_1 = __importDefault(require("../../config/environment"));
const logger_1 = __importDefault(require("./logger"));
const AppError_1 = require("./AppError");
const http_status_1 = require("./http-status");
class SecurityConfig {
    constructor() { }
    static getInstance() {
        if (!SecurityConfig.instance) {
            SecurityConfig.instance = new SecurityConfig();
        }
        return SecurityConfig.instance;
    }
    /**
     * Check if email service is properly configured
     */
    isEmailConfigured() {
        return !!(environment_1.default.EMAIL_USER && environment_1.default.EMAIL_PASS && environment_1.default.EMAIL_HOST);
    }
    /**
     * Validate authentication service configuration
     * Throws error in production if critical services are not configured
     */
    validateAuthConfig() {
        const isEmailConfigured = this.isEmailConfigured();
        if (environment_1.default.NODE_ENV === 'production') {
            if (!isEmailConfigured) {
                logger_1.default.error('Email service not configured in production environment');
                throw new AppError_1.AppError('Authentication service unavailable. Please contact support.', http_status_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            if (!environment_1.default.JWT_SECRET || environment_1.default.JWT_SECRET.length < 32) {
                logger_1.default.error('JWT_SECRET not properly configured in production');
                throw new AppError_1.AppError('Authentication service unavailable. Please contact support.', http_status_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            if (!environment_1.default.DATABASE_URL) {
                logger_1.default.error('DATABASE_URL not configured in production');
                throw new AppError_1.AppError('Service unavailable. Please contact support.', http_status_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
        }
        else {
            // Development environment warnings
            if (!isEmailConfigured) {
                logger_1.default.warn('Email service not configured - some features may not work properly');
            }
        }
    }
    /**
     * Check if we can safely bypass OTP in development
     */
    canBypassOTP() {
        return environment_1.default.NODE_ENV !== 'production' && !this.isEmailConfigured();
    }
    /**
     * Get environment-appropriate authentication method
     */
    getAuthMethod(hasTOTP) {
        if (hasTOTP) {
            return 'totp';
        }
        if (this.isEmailConfigured()) {
            return 'email_otp';
        }
        // In production, must have email configured
        if (environment_1.default.NODE_ENV === 'production') {
            throw new AppError_1.AppError('Authentication service unavailable. Please contact support.', http_status_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        // Development fallback
        logger_1.default.warn('Falling back to direct authentication in development');
        return 'direct';
    }
    /**
     * Log security event
     */
    logSecurityEvent(event, details = {}) {
        logger_1.default.info(`Security Event: ${event}`, {
            ...details,
            timestamp: new Date().toISOString(),
            environment: environment_1.default.NODE_ENV
        });
    }
}
exports.SecurityConfig = SecurityConfig;
// Security constants
SecurityConfig.BCRYPT_ROUNDS = 12;
SecurityConfig.MAX_FAILED_ATTEMPTS = 5;
SecurityConfig.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
SecurityConfig.SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
SecurityConfig.OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
SecurityConfig.OTP_MAX_ATTEMPTS = 3;
exports.default = SecurityConfig.getInstance();
