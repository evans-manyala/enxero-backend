import { z } from 'zod';

/**
 * Login Initiate Validation
 */
export const loginInitiateSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email address')
      .max(255, 'Email must be less than 255 characters'),
    
    password: z
      .string()
      .min(1, 'Password is required')
  })
});

/**
 * Login Verify (OTP) Validation
 */
export const loginVerifySchema = z.object({
  body: z.object({
    loginToken: z
      .string()
      .min(1, 'Login token is required'),
    
    otpCode: z
      .string()
      .length(6, 'OTP code must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP code must contain only numbers')
  })
});

/**
 * Resend Login OTP Validation
 */
export const resendLoginOtpSchema = z.object({
  body: z.object({
    loginToken: z
      .string()
      .min(1, 'Login token is required')
  })
});

/**
 * Check Workspace Access Validation
 */
export const checkWorkspaceSchema = z.object({
  body: z.object({
    userId: z
      .string()
      .uuid('Invalid user ID format')
  })
});

// Type exports for use in controllers
export type LoginInitiateInput = z.infer<typeof loginInitiateSchema>['body'];
export type LoginVerifyInput = z.infer<typeof loginVerifySchema>['body'];
export type ResendLoginOtpInput = z.infer<typeof resendLoginOtpSchema>['body'];
export type CheckWorkspaceInput = z.infer<typeof checkWorkspaceSchema>['body'];
