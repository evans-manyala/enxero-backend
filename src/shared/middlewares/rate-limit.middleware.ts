import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../utils/http-status';
import logger from '../utils/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class InMemoryRateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  isAllowed(key: string, limit: number, windowMs: number): boolean {
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

  getRemainingAttempts(key: string, limit: number): number {
    const entry = this.store[key];
    if (!entry) return limit;
    return Math.max(0, limit - entry.count);
  }

  getResetTime(key: string): number | null {
    const entry = this.store[key];
    return entry ? entry.resetTime : null;
  }

  decrementCount(key: string): void {
    if (this.store[key]) {
      this.store[key].count = Math.max(0, this.store[key].count - 1);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
const rateLimiter = new InMemoryRateLimiter();

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Rate limiting middleware factory
 */
export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    keyGenerator = (req) => req.ip || 'unknown',
    message = 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    
    // Check if request should be limited
    if (!rateLimiter.isAllowed(key, max, windowMs)) {
      const resetTime = rateLimiter.getResetTime(key);
      const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : Math.ceil(windowMs / 1000);
      
      logger.warn(`Rate limit exceeded for key: ${key}`, {
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

      throw new AppError(message, HttpStatus.TOO_MANY_REQUESTS);
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
      res.send = function(data) {
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

/**
 * Pre-configured rate limiters for common use cases
 */
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per 15 minutes
  keyGenerator: (req) => req.ip || 'unknown',
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true // Only count failed login attempts
});

export const registrationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per IP per hour
  keyGenerator: (req) => req.ip || 'unknown',
  message: 'Too many registration attempts, please try again later.'
});

export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per 15 minutes
  keyGenerator: (req) => req.ip || 'unknown',
  message: 'Too many requests, please try again later.'
});

export const otpRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 OTP requests per IP per 5 minutes
  keyGenerator: (req) => req.ip || 'unknown',
  message: 'Too many OTP requests, please try again later.'
});

// Cleanup on process exit
process.on('SIGTERM', () => rateLimiter.destroy());
process.on('SIGINT', () => rateLimiter.destroy());

export { rateLimiter };