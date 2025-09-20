import { z } from 'zod';

// Phone number validation (E.164 format)
const phoneNumberSchema = z.string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (+1234567890)');

// OTP code validation (6 digits)
const otpCodeSchema = z.string()
  .regex(/^\d{6}$/, 'OTP code must be exactly 6 digits');

// Company ID validation
const companyIdSchema = z.string()
  .min(1, 'Company ID is required')
  .max(50, 'Company ID is too long');

// Generate Company OTP validation
export const generateCompanyOtpSchema = z.object({
  body: z.object({
    phoneNumber: phoneNumberSchema,
    companyId: z.string().optional().nullable(),
  }),
});

// Generate User Login OTP validation
export const generateUserLoginOtpSchema = z.object({
  body: z.object({
    phoneNumber: phoneNumberSchema,
  }),
});

// Verify OTP validation
export const verifyOtpSchema = z.object({
  body: z.object({
    otpId: z.string().uuid('Invalid OTP ID format'),
    otpCode: otpCodeSchema,
    phoneNumber: phoneNumberSchema,
  }),
});

// Generate Company ID validation
export const generateCompanyIdSchema = z.object({
  body: z.object({
    countryCode: z.string()
      .length(2, 'Country code must be exactly 2 characters')
      .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters'),
    shortName: z.string()
      .min(1, 'Short name is required')
      .max(20, 'Short name is too long')
      .regex(/^[A-Za-z0-9\s]+$/, 'Short name can only contain letters, numbers, and spaces'),
  }),
});

// OTP stats query validation
export const otpStatsSchema = z.object({
  query: z.object({
    timeframe: z.enum(['24h', '7d', '30d']).optional().default('24h'),
  }).optional(),
});

export default {
  generateCompanyOtpSchema,
  generateUserLoginOtpSchema,
  verifyOtpSchema,
  generateCompanyIdSchema,
  otpStatsSchema,
};
