"use strict";
/**
 * Security constants for the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_CLEANUP_INTERVAL = exports.MAX_CONCURRENT_SESSIONS = exports.RATE_LIMIT_WINDOW = exports.MAX_LOGIN_ATTEMPTS_PER_IP = exports.LOGIN_TOKEN_EXPIRY = exports.REFRESH_TOKEN_EXPIRY = exports.ACCESS_TOKEN_EXPIRY = exports.LOCKOUT_DURATION = exports.MAX_FAILED_ATTEMPTS = exports.BCRYPT_ROUNDS = void 0;
// Password hashing configuration
exports.BCRYPT_ROUNDS = 12; // Use 12 rounds for strong security
// Account lockout settings
exports.MAX_FAILED_ATTEMPTS = 5;
exports.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
// Token settings
exports.ACCESS_TOKEN_EXPIRY = '15m';
exports.REFRESH_TOKEN_EXPIRY = '7d';
exports.LOGIN_TOKEN_EXPIRY = 5 * 60 * 1000; // 5 minutes
// Rate limiting
exports.MAX_LOGIN_ATTEMPTS_PER_IP = 10;
exports.RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
// Session settings
exports.MAX_CONCURRENT_SESSIONS = 5;
exports.SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
