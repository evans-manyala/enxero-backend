"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = exports.otpRateLimit = exports.generalRateLimit = exports.registrationRateLimit = exports.authRateLimit = exports.createRateLimit = void 0;
const AppError_1 = require("../utils/AppError");
const http_status_1 = require("../utils/http-status");
const logger_1 = __importDefault(require("../utils/logger"));
class InMemoryRateLimiter {
    constructor() {
        this.store = {};
        // Clean up expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }
    cleanup() {
        const now = Date.now();
        Object.keys(this.store).forEach(key => {
            if (this.store[key].resetTime < now) {
                delete this.store[key];
            }
        });
    }
    isAllowed(key, limit, windowMs) {
        const now = Date.now();
        const entry = this.store[key];
        if (!entry || entry.resetTime < now) {
            // First request or window has expired
            this.store[key] = {
                count: 1,
                resetTime: now + windowMs
            };
            return true;
        }
        entry.count++;
        return entry.count <= limit;
    }
    getRemainingAttempts(key, limit) {
        const entry = this.store[key];
        if (!entry)
            return limit;
        return Math.max(0, limit - entry.count);
    }
    getResetTime(key) {
        const entry = this.store[key];
        return entry ? entry.resetTime : null;
    }
    decrementCount(key) {
        if (this.store[key]) {
            this.store[key].count = Math.max(0, this.store[key].count - 1);
        }
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}
// Singleton instance
const rateLimiter = new InMemoryRateLimiter();
exports.rateLimiter = rateLimiter;
/**
 * Rate limiting middleware factory
 */
const createRateLimit = (options) => {
    const { windowMs, max, keyGenerator = (req) => req.ip || 'unknown', message = 'Too many requests from this IP, please try again later.', skipSuccessfulRequests = false, skipFailedRequests = false } = options;
    return (req, res, next) => {
        const key = keyGenerator(req);
        // Check if request should be limited
        if (!rateLimiter.isAllowed(key, max, windowMs)) {
            const resetTime = rateLimiter.getResetTime(key);
            const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : Math.ceil(windowMs / 1000);
            logger_1.default.warn(`Rate limit exceeded for key: ${key}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                endpoint: req.path,
                method: req.method
            });
            res.set({
                'Retry-After': retryAfter.toString(),
                'X-RateLimit-Limit': max.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': resetTime?.toString() || ''
            });
            throw new AppError_1.AppError(message, http_status_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        // Set rate limit headers
        const remaining = rateLimiter.getRemainingAttempts(key, max);
        const resetTime = rateLimiter.getResetTime(key);
        res.set({
            'X-RateLimit-Limit': max.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': resetTime?.toString() || ''
        });
        // Handle response tracking for successful/failed requests
        if (skipSuccessfulRequests || skipFailedRequests) {
            const originalSend = res.send;
            res.send = function (data) {
                const statusCode = res.statusCode;
                const isSuccess = statusCode >= 200 && statusCode < 300;
                if ((skipSuccessfulRequests && isSuccess) || (skipFailedRequests && !isSuccess)) {
                    // Decrement the counter for this request type
                    rateLimiter.decrementCount(key);
                }
                return originalSend.call(this, data);
            };
        }
        next();
    };
};
exports.createRateLimit = createRateLimit;
/**
 * Pre-configured rate limiters for common use cases
 */
exports.authRateLimit = (0, exports.createRateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per IP per 15 minutes
    keyGenerator: (req) => req.ip || 'unknown',
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true // Only count failed login attempts
});
exports.registrationRateLimit = (0, exports.createRateLimit)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registration attempts per IP per hour
    keyGenerator: (req) => req.ip || 'unknown',
    message: 'Too many registration attempts, please try again later.'
});
exports.generalRateLimit = (0, exports.createRateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per IP per 15 minutes
    keyGenerator: (req) => req.ip || 'unknown',
    message: 'Too many requests, please try again later.'
});
exports.otpRateLimit = (0, exports.createRateLimit)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 OTP requests per IP per 5 minutes
    keyGenerator: (req) => req.ip || 'unknown',
    message: 'Too many OTP requests, please try again later.'
});
// Cleanup on process exit
process.on('SIGTERM', () => rateLimiter.destroy());
process.on('SIGINT', () => rateLimiter.destroy());
