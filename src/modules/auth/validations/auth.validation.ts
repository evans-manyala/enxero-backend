import { z } from 'zod';

// ===================================================================
// LEGACY VALIDATION SCHEMAS (Backward Compatibility)
// ===================================================================

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    firstName: z.string(),
    lastName: z.string(),
    companyName: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }).refine((data) => data.username || data.email, {
    message: "Either username or email is required",
    path: ["username"],
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

// ===================================================================
// ENHANCED MULTI-STEP REGISTRATION VALIDATION SCHEMAS
// ===================================================================

export const registerStep1Schema = z.object({
  body: z.object({
    companyName: z.string().min(1, 'Company name is required'),
    fullName: z.string().optional(),
    shortName: z.string().optional(),
    countryCode: z.string().length(2, 'Country code must be 2 characters'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    workPhone: z.string().optional(),
    city: z.string().optional(),
    address: z.any().optional(),
    ownerEmail: z.string().email('Invalid email address'),
    ownerFirstName: z.string().min(1, 'First name is required'),
    ownerLastName: z.string().min(1, 'Last name is required'),
  }),
});

export const registerStep2Schema = z.object({
  body: z.object({
    sessionToken: z.string().min(1, 'Session token is required'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const registerStep3Schema = z.object({
  body: z.object({
    sessionToken: z.string().min(1, 'Session token is required'),
    twoFactorToken: z.string().length(6, 'TOTP token must be 6 digits'),
    backupCodes: z.array(z.string()).optional(),
  }),
});

// ===================================================================
// ENHANCED LOGIN FLOW VALIDATION SCHEMAS
// ===================================================================

export const loginInitiateSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const loginVerifySchema = z.object({
  body: z.object({
    loginToken: z.string().min(1, 'Login token is required'),
    otpCode: z.string().length(6, 'OTP code must be 6 digits'),
  }),
});

// ===================================================================
// ADDITIONAL VALIDATION SCHEMAS
// ===================================================================

export const resendEmailSchema = z.object({
  body: z.object({
    sessionToken: z.string().min(1, 'Session token is required'),
    step: z.number().min(1).max(3),
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    loginToken: z.string().min(1, 'Login token is required'),
  }),
});

export const checkWorkspaceAccessSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
  }),
});

export const previewIdentifierSchema = z.object({
  body: z.object({
    countryCode: z.string().length(2, 'Country code must be 2 characters'),
    shortName: z.string().min(2, 'Short name must be at least 2 characters').max(10, 'Short name cannot exceed 10 characters'),
  }),
}); 

// ===================================================================
// TOTP/2FA VALIDATION SCHEMAS
// ===================================================================

export const totpLoginInitiateSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const totpLoginVerifySchema = z.object({
  body: z.object({
    loginToken: z.string().min(1, 'Login token is required'),
    totpCode: z.string().length(6, 'TOTP code must be 6 digits'),
  }),
});

export const enable2FASchema = z.object({
  body: z.object({
    totpCode: z.string().length(6, 'TOTP code must be 6 digits'),
  }),
});

export const disable2FASchema = z.object({
  body: z.object({
    totpCode: z.string().length(6, 'TOTP code must be 6 digits'),
  }),
});

// ===================================================================
// UI-MATCHING FLOW VALIDATION SCHEMAS (New Endpoints)
// ===================================================================

export const companyValidationSchema = z.object({
  body: z.object({
    companyIdentifier: z.string().min(1, 'Company identifier is required'),
  }),
});

export const usernameValidationSchema = z.object({
  body: z.object({
    companyIdentifier: z.string().min(1, 'Company identifier is required'),
    username: z.string().min(1, 'Username is required'),
  }),
});

export const passwordValidationSchema = z.object({
  body: z.object({
    companyIdentifier: z.string().min(1, 'Company identifier is required'),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const singlePageRegistrationSchema = z.object({
  body: z.object({
    // Company Information
    companyFullName: z.string().min(1, 'Company full name is required'),
    companyShortName: z.string().min(1, 'Company short name is required'),
    companyWorkPhone: z.string().min(1, 'Company work phone is required'),
    companyCity: z.string().min(1, 'Company city is required'),
    companyCountry: z.string().length(2, 'Country code must be 2 characters'),
    
    // User Information
    fullName: z.string().min(1, 'Full name is required'),
    jobTitle: z.string().min(1, 'Job title is required'),
    phoneNumber: z.string().min(1, 'Phone number is required'),
    email: z.string().email('Invalid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});