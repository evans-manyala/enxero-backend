import { z } from 'zod';

/**
 * Step 1: Company Details Validation
 */
export const registrationStep1Schema = z.object({
  body: z.object({
    companyName: z
      .string()
      .min(2, 'Company name must be at least 2 characters')
      .max(255, 'Company name must be less than 255 characters'),
    
    fullName: z
      .string()
      .max(255, 'Full company name must be less than 255 characters')
      .optional(),
    
    shortName: z
      .string()
      .max(100, 'Short name must be less than 100 characters')
      .optional(),
    
    countryCode: z
      .string()
      .length(2, 'Country code must be exactly 2 characters (ISO 3166-1 alpha-2)')
      .regex(/^[A-Z]{2}$/, 'Country code must contain only uppercase letters'),
    
    phoneNumber: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (+1234567890)'),
    
    workPhone: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/, 'Work phone must be in E.164 format')
      .optional(),
    
    city: z
      .string()
      .max(100, 'City must be less than 100 characters')
      .optional(),
    
    address: z
      .record(z.any())
      .optional(),
    
    ownerEmail: z
      .string()
      .email('Invalid email address')
      .max(255, 'Email must be less than 255 characters'),
    
    ownerFirstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name must be less than 100 characters'),
    
    ownerLastName: z
      .string()
      .min(1, 'Last name is required')
      .max(100, 'Last name must be less than 100 characters')
  })
});

/**
 * Step 2: Username and Password Validation
 */
export const registrationStep2Schema = z.object({
  body: z.object({
    sessionToken: z
      .string()
      .min(1, 'Session token is required'),
    
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be less than 50 characters')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, dots, and dashes'),
    
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
      .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
      .regex(/^(?=.*\d)/, 'Password must contain at least one number')
      .regex(/^(?=.*[!@#$%^&*(),.?":{}|<>])/, 'Password must contain at least one special character'),
    
    confirmPassword: z
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
export const registrationStep3Schema = z.object({
  body: z.object({
    sessionToken: z
      .string()
      .min(1, 'Session token is required'),
    
    twoFactorToken: z
      .string()
      .length(6, '2FA token must be exactly 6 digits')
      .regex(/^\d{6}$/, '2FA token must contain only numbers'),
    
    backupCodes: z
      .array(z.string())
      .max(10, 'Maximum 10 backup codes allowed')
      .optional()
  })
});

/**
 * Company Identifier Preview Validation
 */
export const previewIdentifierSchema = z.object({
  body: z.object({
    countryCode: z
      .string()
      .length(2, 'Country code must be exactly 2 characters')
      .regex(/^[A-Z]{2}$/, 'Country code must contain only uppercase letters'),
    
    shortName: z
      .string()
      .max(50, 'Short name must be less than 50 characters')
      .optional()
  })
});

/**
 * Resend Email Validation
 */
export const resendEmailSchema = z.object({
  body: z.object({
    sessionToken: z
      .string()
      .min(1, 'Session token is required'),
    
    step: z
      .number()
      .int('Step must be an integer')
      .min(1, 'Step must be at least 1')
      .max(2, 'Step must be at most 2')
  })
});

/**
 * Get Status Query Validation
 */
export const getStatusSchema = z.object({
  query: z.object({
    sessionToken: z
      .string()
      .min(1, 'Session token is required')
  })
});

// Type exports for use in controllers
export type RegistrationStep1Input = z.infer<typeof registrationStep1Schema>['body'];
export type RegistrationStep2Input = z.infer<typeof registrationStep2Schema>['body'];
export type RegistrationStep3Input = z.infer<typeof registrationStep3Schema>['body'];
export type PreviewIdentifierInput = z.infer<typeof previewIdentifierSchema>['body'];
export type ResendEmailInput = z.infer<typeof resendEmailSchema>['body'];
export type GetStatusInput = z.infer<typeof getStatusSchema>['query'];
