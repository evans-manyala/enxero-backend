"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.singlePageRegistrationSchema = exports.passwordValidationSchema = exports.usernameValidationSchema = exports.companyValidationSchema = exports.disable2FASchema = exports.enable2FASchema = exports.totpLoginVerifySchema = exports.totpLoginInitiateSchema = exports.previewIdentifierSchema = exports.checkWorkspaceAccessSchema = exports.resendOtpSchema = exports.resendEmailSchema = exports.loginVerifySchema = exports.loginInitiateSchema = exports.registerStep3Schema = exports.registerStep2Schema = exports.registerStep1Schema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// ===================================================================
// LEGACY VALIDATION SCHEMAS (Backward Compatibility)
// ===================================================================
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        username: zod_1.z.string().min(3, 'Username must be at least 3 characters'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
        firstName: zod_1.z.string(),
        lastName: zod_1.z.string(),
        companyName: zod_1.z.string().optional(),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        username: zod_1.z.string().optional(),
        email: zod_1.z.string().email('Invalid email address').optional(),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    }).refine((data) => data.username || data.email, {
        message: "Either username or email is required",
        path: ["username"],
    }),
});
exports.refreshTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string(),
    }),
});
// ===================================================================
// ENHANCED MULTI-STEP REGISTRATION VALIDATION SCHEMAS
// ===================================================================
exports.registerStep1Schema = zod_1.z.object({
    body: zod_1.z.object({
        companyName: zod_1.z.string().min(1, 'Company name is required'),
        fullName: zod_1.z.string().optional(),
        shortName: zod_1.z.string().optional(),
        countryCode: zod_1.z.string().length(2, 'Country code must be 2 characters'),
        phoneNumber: zod_1.z.string().min(1, 'Phone number is required'),
        workPhone: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        address: zod_1.z.any().optional(),
        ownerEmail: zod_1.z.string().email('Invalid email address'),
        ownerFirstName: zod_1.z.string().min(1, 'First name is required'),
        ownerLastName: zod_1.z.string().min(1, 'Last name is required'),
    }),
});
exports.registerStep2Schema = zod_1.z.object({
    body: zod_1.z.object({
        sessionToken: zod_1.z.string().min(1, 'Session token is required'),
        username: zod_1.z.string().min(3, 'Username must be at least 3 characters'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
        confirmPassword: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    }),
});
exports.registerStep3Schema = zod_1.z.object({
    body: zod_1.z.object({
        sessionToken: zod_1.z.string().min(1, 'Session token is required'),
        twoFactorToken: zod_1.z.string().length(6, 'TOTP token must be 6 digits'),
        backupCodes: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
// ===================================================================
// ENHANCED LOGIN FLOW VALIDATION SCHEMAS
// ===================================================================
exports.loginInitiateSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    }),
});
exports.loginVerifySchema = zod_1.z.object({
    body: zod_1.z.object({
        loginToken: zod_1.z.string().min(1, 'Login token is required'),
        otpCode: zod_1.z.string().length(6, 'OTP code must be 6 digits'),
    }),
});
// ===================================================================
// ADDITIONAL VALIDATION SCHEMAS
// ===================================================================
exports.resendEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        sessionToken: zod_1.z.string().min(1, 'Session token is required'),
        step: zod_1.z.number().min(1).max(3),
    }),
});
exports.resendOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        loginToken: zod_1.z.string().min(1, 'Login token is required'),
    }),
});
exports.checkWorkspaceAccessSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string().min(1, 'User ID is required'),
    }),
});
exports.previewIdentifierSchema = zod_1.z.object({
    body: zod_1.z.object({
        countryCode: zod_1.z.string().length(2, 'Country code must be 2 characters'),
        shortName: zod_1.z.string().min(2, 'Short name must be at least 2 characters').max(10, 'Short name cannot exceed 10 characters'),
    }),
});
// ===================================================================
// TOTP/2FA VALIDATION SCHEMAS
// ===================================================================
exports.totpLoginInitiateSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    }),
});
exports.totpLoginVerifySchema = zod_1.z.object({
    body: zod_1.z.object({
        loginToken: zod_1.z.string().min(1, 'Login token is required'),
        totpCode: zod_1.z.string().length(6, 'TOTP code must be 6 digits'),
    }),
});
exports.enable2FASchema = zod_1.z.object({
    body: zod_1.z.object({
        totpCode: zod_1.z.string().length(6, 'TOTP code must be 6 digits'),
    }),
});
exports.disable2FASchema = zod_1.z.object({
    body: zod_1.z.object({
        totpCode: zod_1.z.string().length(6, 'TOTP code must be 6 digits'),
    }),
});
// ===================================================================
// UI-MATCHING FLOW VALIDATION SCHEMAS (New Endpoints)
// ===================================================================
exports.companyValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        companyIdentifier: zod_1.z.string().min(1, 'Company identifier is required'),
    }),
});
exports.usernameValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        companyIdentifier: zod_1.z.string().min(1, 'Company identifier is required'),
        username: zod_1.z.string().min(1, 'Username is required'),
    }),
});
exports.passwordValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        companyIdentifier: zod_1.z.string().min(1, 'Company identifier is required'),
        username: zod_1.z.string().min(1, 'Username is required'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    }),
});
exports.singlePageRegistrationSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Company Information
        companyFullName: zod_1.z.string().min(1, 'Company full name is required'),
        companyShortName: zod_1.z.string().min(1, 'Company short name is required'),
        companyWorkPhone: zod_1.z.string().min(1, 'Company work phone is required'),
        companyCity: zod_1.z.string().min(1, 'Company city is required'),
        companyCountry: zod_1.z.string().length(2, 'Country code must be 2 characters'),
        // User Information
        fullName: zod_1.z.string().min(1, 'Full name is required'),
        jobTitle: zod_1.z.string().min(1, 'Job title is required'),
        phoneNumber: zod_1.z.string().min(1, 'Phone number is required'),
        email: zod_1.z.string().email('Invalid email address'),
        username: zod_1.z.string().min(3, 'Username must be at least 3 characters'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    }),
});
