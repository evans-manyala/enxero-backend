/**
 * Security constants for the application
 */

// Password hashing configuration
export const BCRYPT_ROUNDS = 12; // Use 12 rounds for strong security

// Account lockout settings
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Token settings
export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';
export const LOGIN_TOKEN_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Rate limiting
export const MAX_LOGIN_ATTEMPTS_PER_IP = 10;
export const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

// Session settings
export const MAX_CONCURRENT_SESSIONS = 5;
export const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour