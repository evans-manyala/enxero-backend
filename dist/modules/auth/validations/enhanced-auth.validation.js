"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkWorkspaceSchema = exports.resendLoginOtpSchema = exports.loginVerifySchema = exports.loginInitiateSchema = void 0;
const zod_1 = require("zod");
/**
 * Login Initiate Validation
 */
exports.loginInitiateSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string()
            .email('Invalid email address')
            .max(255, 'Email must be less than 255 characters'),
        password: zod_1.z
            .string()
            .min(1, 'Password is required')
    })
});
/**
 * Login Verify (OTP) Validation
 */
exports.loginVerifySchema = zod_1.z.object({
    body: zod_1.z.object({
        loginToken: zod_1.z
            .string()
            .min(1, 'Login token is required'),
        otpCode: zod_1.z
            .string()
            .length(6, 'OTP code must be exactly 6 digits')
            .regex(/^\d{6}$/, 'OTP code must contain only numbers')
    })
});
/**
 * Resend Login OTP Validation
 */
exports.resendLoginOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        loginToken: zod_1.z
            .string()
            .min(1, 'Login token is required')
    })
});
/**
 * Check Workspace Access Validation
 */
exports.checkWorkspaceSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z
            .string()
            .uuid('Invalid user ID format')
    })
});
