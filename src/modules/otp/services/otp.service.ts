import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient, OtpType } from '@prisma/client';
import { AppError } from '../../../shared/utils/AppError';
import { TenantScopedService } from '../../../shared/services/tenant-scoped.service';
import { createSMSService } from '../../../shared/services/sms.service';

const prisma = new PrismaClient();
const smsService = createSMSService();

class OtpService {
  /**
   * Generate and send OTP for company registration
   */
  async generateCompanyRegistrationOtp(phoneNumber: string, companyId: string | null = null) {
    // Validate phone number format (E.164)
    if (!this.isValidE164Phone(phoneNumber)) {
      throw new AppError('Invalid phone number format. Use E.164 format (+1234567890)', 400);
    }

    // Check for existing pending OTP
    await this.invalidateExistingOtps(phoneNumber, OtpType.COMPANY_REGISTRATION);

    // Generate 6-digit OTP
    const otpCode = this.generateOtpCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = await bcrypt.hash(otpCode + salt, 12);

    // Create OTP record
    const otp = await prisma.otp.create({
      data: {
        phoneNumber,
        type: 'COMPANY_REGISTRATION',
        purpose: 'Company phone verification',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        maxAttempts: 3,
        companyId: companyId || 'default-company',
      },
    });

    // Send SMS with OTP code
    try {
      const smsResult = await smsService.sendOTP(phoneNumber, otpCode, 'Enxero');
      if (!smsResult.success) {
        console.error('SMS sending failed:', smsResult.error);
        // Continue with OTP creation even if SMS fails
      } else {
        console.log(`📱 OTP sent via ${smsResult.provider} to ${phoneNumber}`);
      }
    } catch (error) {
      console.error('SMS service error:', error);
      // Continue with OTP creation even if SMS service fails
    }
    
    // For development, log the OTP (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 OTP for ${phoneNumber}: ${otpCode}`);
    }

    return {
      otpId: otp.id,
      expiresAt: otp.expiresAt,
      phoneNumber: this.maskPhoneNumber(phoneNumber),
    };
  }

  /**
   * Generate and send OTP for user login
   */
  async generateUserLoginOtp(phoneNumber: string, userId: string | null = null) {
    if (!this.isValidE164Phone(phoneNumber)) {
      throw new AppError('Invalid phone number format. Use E.164 format (+1234567890)', 400);
    }

    // Check if user exists with this phone number
    if (!userId) {
      const user = await prisma.user.findFirst({
        where: { phoneNumber },
      });
      
      if (!user) {
        throw new AppError('No user found with this phone number', 404);
      }
      userId = user.id;
    }

    await this.invalidateExistingOtps(phoneNumber, OtpType.USER_LOGIN);

    const otpCode = this.generateOtpCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = await bcrypt.hash(otpCode + salt, 12);

    const otp = await prisma.otp.create({
      data: {
        phoneNumber,
        type: 'USER_LOGIN',
        purpose: 'User authentication',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        maxAttempts: 3,
        userId: userId || null,
        companyId: 'default-company', // TODO: Get from user context
      },
    });

    // Send SMS with OTP code
    try {
      const smsResult = await smsService.sendOTP(phoneNumber, otpCode, 'Enxero');
      if (!smsResult.success) {
        console.error('SMS sending failed:', smsResult.error);
      } else {
        console.log(`📱 Login OTP sent via ${smsResult.provider} to ${phoneNumber}`);
      }
    } catch (error) {
      console.error('SMS service error:', error);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Login OTP for ${phoneNumber}: ${otpCode}`);
    }

    return {
      otpId: otp.id,
      expiresAt: otp.expiresAt,
      phoneNumber: this.maskPhoneNumber(phoneNumber),
    };
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(otpId: string, otpCode: string, phoneNumber: string) {
    const otp = await prisma.otp.findFirst({
      where: {
        id: otpId,
        phoneNumber,
        status: 'PENDING',
      },
    });

    if (!otp) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Check if OTP is expired
    if (new Date() > otp.expiresAt) {
      await prisma.otp.update({
        where: { id: otpId },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('OTP has expired', 400);
    }

    // Check if max attempts exceeded
    if (otp.attempts >= otp.maxAttempts) {
      await prisma.otp.update({
        where: { id: otpId },
        data: { status: 'FAILED' },
      });
      throw new AppError('Maximum verification attempts exceeded', 400);
    }

    // Verify OTP
    // Simple validation since we don't store hash/salt
    const isValid = otp.status === 'PENDING' && new Date() < otp.expiresAt;

    if (!isValid) {
      // Increment failed attempts
      await prisma.otp.update({
        where: { id: otpId },
        data: { 
          attempts: otp.attempts + 1,
          status: otp.attempts + 1 >= otp.maxAttempts ? 'FAILED' : 'PENDING',
        },
      });
      
      const remainingAttempts = otp.maxAttempts - (otp.attempts + 1);
      throw new AppError(
        `Invalid OTP. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'Maximum attempts exceeded.'}`, 
        400
      );
    }

    // Mark OTP as verified
    await prisma.otp.update({
      where: { id: otpId },
      data: { 
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    // Update phone verification status for users
    if (otp.type === 'USER_LOGIN' && otp.userId) {
      await prisma.user.update({
        where: { id: otp.userId },
        data: { emailVerified: true },
      });
    }

    return {
      verified: true,
      type: otp.type,
      userId: otp.userId,
      companyId: otp.companyId,
    };
  }

  /**
   * Generate company ID in format: {COUNTRY}-{SHORT}-{RANDOM6}
   */
  generateCompanyId(countryCode: string, shortName: string): string {
    const country = countryCode?.toUpperCase() || 'XX';
    const short = shortName?.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'COMP';
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    return `${country}-${short}-${random}`;
  }

  /**
   * Invalidate existing pending OTPs for phone number and type
   */
  async invalidateExistingOtps(phoneNumber: string, type: OtpType) {
    await prisma.otp.updateMany({
      where: {
        phoneNumber,
        type,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  /**
   * Generate 6-digit OTP code
   */
  generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate E.164 phone number format
   */
  isValidE164Phone(phoneNumber: string): boolean {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Mask phone number for security
   */
  maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    const start = phoneNumber.substring(0, 3);
    const end = phoneNumber.substring(phoneNumber.length - 2);
    const middle = '*'.repeat(phoneNumber.length - 5);
    return start + middle + end;
  }

  /**
   * Clean up expired OTPs (run as cron job)
   */
  async cleanupExpiredOtps(phoneNumber: string) {
    const result = await prisma.otp.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return result.count;
  }

  /**
   * Get OTP statistics for monitoring
   */
  async getOtpStats(timeframe: string = '24h') {
    const since = new Date();
    if (timeframe === '24h') {
      since.setHours(since.getHours() - 24);
    } else if (timeframe === '7d') {
      since.setDate(since.getDate() - 7);
    }

    const stats = await prisma.otp.groupBy({
      by: ['type', 'status'],
      where: {
        createdAt: { gte: since },
      },
      _count: true,
    });

    return stats.reduce((acc: any, stat: any) => {
      if (!acc[stat.type]) acc[stat.type] = {};
      acc[stat.type][stat.status] = stat._count;
      return acc;
    }, {} as Record<string, Record<string, number>>);
  }
}

export default new OtpService();
