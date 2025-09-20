export interface ILoginDto {
  email: string;
  password: string;
  companyId?: string;
  companyIdentifier?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IRegisterDto {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    companyId: string;
    twoFactorEnabled?: boolean;
    twoFactorSetupRequired?: boolean;
  };
}

export interface IRefreshTokenDto {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ITokenPayload {
  userId: string;
  roleId: string;
  type: 'access' | 'refresh';
}

// TOTP-related interfaces
export interface ITOTPLoginInitiateDto {
  email: string;
  password: string;
  companyId?: string;
  companyIdentifier?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ITOTPLoginVerifyDto {
  loginToken: string;
  totpCode: string;
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ITOTP2FASetupResponse {
  secret: string;
  qrCodeImage: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface ITOTP2FAEnableDto {
  userId: string;
  totpCode: string;
}

export interface ITOTPLoginSession {
  id: string;
  userId: string;
  email: string;
  requiresTOTP: boolean;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  createdAt: string;
}

// ===================================================================
// UI-MATCHING FLOW INTERFACES (New Endpoints)
// ===================================================================

export interface ICompanyValidationDto {
  companyIdentifier: string;
}

export interface ICompanyValidationResponse {
  valid: boolean;
  companyId?: string;
  companyName?: string;
  nextStep: 'username' | 'error';
  message?: string;
}

export interface IUsernameValidationDto {
  companyIdentifier: string;
  username: string;
}

export interface IUsernameValidationResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  nextStep: 'password' | 'error';
  message?: string;
}

export interface IPasswordValidationDto {
  companyIdentifier: string;
  username: string;
  password: string;
}

export interface IPasswordValidationResponse {
  valid: boolean;
  requiresTOTP: boolean;
  loginToken?: string;
  nextStep: 'totp' | 'complete' | 'error';
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId: string;
    company: {
      id?: string;
      name?: string;
      identifier?: string | null;
    };
    twoFactorEnabled: boolean;
    twoFactorSetupRequired: boolean;
  };
}

export interface ISinglePageRegistrationDto {
  // Company Information
  companyFullName: string;
  companyShortName: string;
  companyWorkPhone: string;
  companyCity: string;
  companyCountry: string;
  
  // User Information
  fullName: string;
  jobTitle: string;
  phoneNumber: string;
  email: string;
  username: string;
  password: string;
}

export interface ISinglePageRegistrationResponse {
  success: boolean;
  message: string;
  companyIdentifier?: string;
  requires2FASetup: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId: string;
    company: {
      id?: string;
      name?: string;
      identifier?: string | null;
    };
    twoFactorEnabled: boolean;
    twoFactorSetupRequired: boolean;
  };
}

export interface ITOTPLoginResponse {
  loginToken?: string;
  requiresTOTP?: boolean;
  expiresAt?: string;
  email?: string;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId: string;
    company: {
      id?: string;
      name?: string;
      identifier?: string | null;
    };
    twoFactorEnabled: boolean;
    twoFactorSetupRequired: boolean;
  };

}
