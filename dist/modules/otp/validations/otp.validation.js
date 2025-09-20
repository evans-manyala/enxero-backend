"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpStatsSchema = exports.generateCompanyIdSchema = exports.verifyOtpSchema = exports.generateUserLoginOtpSchema = exports.generateCompanyOtpSchema = void 0;
const zod_1 = require("zod");
// Phone number validation (E.164 format)
const phoneNumberSchema = zod_1.z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (+1234567890)');
// OTP code validation (6 digits)
const otpCodeSchema = zod_1.z.string()
    .regex(/^\d{6}$/, 'OTP code must be exactly 6 digits');
// Company ID validation
const companyIdSchema = zod_1.z.string()
    .min(1, 'Company ID is required')
    .max(50, 'Company ID is too long');
// Generate Company OTP validation
exports.generateCompanyOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        phoneNumber: phoneNumberSchema,
        companyId: zod_1.z.string().optional().nullable(),
    }),
});
// Generate User Login OTP validation
exports.generateUserLoginOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        phoneNumber: phoneNumberSchema,
    }),
});
// Verify OTP validation
exports.verifyOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        otpId: zod_1.z.string().uuid('Invalid OTP ID format'),
        otpCode: otpCodeSchema,
        phoneNumber: phoneNumberSchema,
    }),
});
// Generate Company ID validation
exports.generateCompanyIdSchema = zod_1.z.object({
    body: zod_1.z.object({
        countryCode: zod_1.z.string()
            .length(2, 'Country code must be exactly 2 characters')
            .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters'),
        shortName: zod_1.z.string()
            .min(1, 'Short name is required')
            .max(20, 'Short name is too long')
            .regex(/^[A-Za-z0-9\s]+$/, 'Short name can only contain letters, numbers, and spaces'),
    }),
});
// OTP stats query validation
exports.otpStatsSchema = zod_1.z.object({
    query: zod_1.z.object({
        timeframe: zod_1.z.enum(['24h', '7d', '30d']).optional().default('24h'),
    }).optional(),
});
exports.default = {
    generateCompanyOtpSchema: exports.generateCompanyOtpSchema,
    generateUserLoginOtpSchema: exports.generateUserLoginOtpSchema,
    verifyOtpSchema: exports.verifyOtpSchema,
    generateCompanyIdSchema: exports.generateCompanyIdSchema,
    otpStatsSchema: exports.otpStatsSchema,
};
