"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatusSchema = exports.resendEmailSchema = exports.previewIdentifierSchema = exports.registrationStep3Schema = exports.registrationStep2Schema = exports.registrationStep1Schema = void 0;
const zod_1 = require("zod");
/**
 * Step 1: Company Details Validation
 */
exports.registrationStep1Schema = zod_1.z.object({
    body: zod_1.z.object({
        companyName: zod_1.z
            .string()
            .min(2, 'Company name must be at least 2 characters')
            .max(255, 'Company name must be less than 255 characters'),
        fullName: zod_1.z
            .string()
            .max(255, 'Full company name must be less than 255 characters')
            .optional(),
        shortName: zod_1.z
            .string()
            .max(100, 'Short name must be less than 100 characters')
            .optional(),
        countryCode: zod_1.z
            .string()
            .length(2, 'Country code must be exactly 2 characters (ISO 3166-1 alpha-2)')
            .regex(/^[A-Z]{2}$/, 'Country code must contain only uppercase letters'),
        phoneNumber: zod_1.z
            .string()
            .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (+1234567890)'),
        workPhone: zod_1.z
            .string()
            .regex(/^\+[1-9]\d{1,14}$/, 'Work phone must be in E.164 format')
            .optional(),
        city: zod_1.z
            .string()
            .max(100, 'City must be less than 100 characters')
            .optional(),
        address: zod_1.z
            .record(zod_1.z.any())
            .optional(),
        ownerEmail: zod_1.z
            .string()
            .email('Invalid email address')
            .max(255, 'Email must be less than 255 characters'),
        ownerFirstName: zod_1.z
            .string()
            .min(1, 'First name is required')
            .max(100, 'First name must be less than 100 characters'),
        ownerLastName: zod_1.z
            .string()
            .min(1, 'Last name is required')
            .max(100, 'Last name must be less than 100 characters')
    })
});
/**
 * Step 2: Username and Password Validation
 */
exports.registrationStep2Schema = zod_1.z.object({
    body: zod_1.z.object({
        sessionToken: zod_1.z
            .string()
            .min(1, 'Session token is required'),
        username: zod_1.z
            .string()
            .min(3, 'Username must be at least 3 characters')
            .max(50, 'Username must be less than 50 characters')
            .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, dots, and dashes'),
        password: zod_1.z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
            .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
            .regex(/^(?=.*\d)/, 'Password must contain at least one number')
            .regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])/, 'Password must contain at least one special character'),
        confirmPassword: zod_1.z
            .string()
            .min(1, 'Password confirmation is required')
    }).refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword']
    })
});
/**
 * Step 3: 2FA Setup Validation
 */
exports.registrationStep3Schema = zod_1.z.object({
    body: zod_1.z.object({
        sessionToken: zod_1.z
            .string()
            .min(1, 'Session token is required'),
        twoFactorToken: zod_1.z
            .string()
            .length(6, '2FA token must be exactly 6 digits')
            .regex(/^\d{6}$/, '2FA token must contain only numbers'),
        backupCodes: zod_1.z
            .array(zod_1.z.string())
            .max(10, 'Maximum 10 backup codes allowed')
            .optional()
    })
});
/**
 * Company Identifier Preview Validation
 */
exports.previewIdentifierSchema = zod_1.z.object({
    body: zod_1.z.object({
        countryCode: zod_1.z
            .string()
            .length(2, 'Country code must be exactly 2 characters')
            .regex(/^[A-Z]{2}$/, 'Country code must contain only uppercase letters'),
        shortName: zod_1.z
            .string()
            .max(50, 'Short name must be less than 50 characters')
            .optional()
    })
});
/**
 * Resend Email Validation
 */
exports.resendEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        sessionToken: zod_1.z
            .string()
            .min(1, 'Session token is required'),
        step: zod_1.z
            .number()
            .int('Step must be an integer')
            .min(1, 'Step must be at least 1')
            .max(2, 'Step must be at most 2')
    })
});
/**
 * Get Status Query Validation
 */
exports.getStatusSchema = zod_1.z.object({
    query: zod_1.z.object({
        sessionToken: zod_1.z
            .string()
            .min(1, 'Session token is required')
    })
});
