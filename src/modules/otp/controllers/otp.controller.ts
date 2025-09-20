import otpService from '../services/otp.service';
import { AppError } from '../../../shared/utils/AppError';
import { catchAsync } from '../../../shared/utils/catch-async';
import { Request, Response } from 'express';

class OtpController {
  /**
   * Generate OTP for company registration
   * POST /api/v1/otp/company/generate
   */
  generateCompanyOtp = catchAsync(async (req: Request, res: Response) => {
    const { phoneNumber, companyId } = req.body;

    if (!phoneNumber) {
      throw new AppError('Phone number is required', 400);
    }

    const result = await otpService.generateCompanyRegistrationOtp(phoneNumber, companyId);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: result,
    });
  });

  /**
   * Generate OTP for user login
   * POST /api/v1/otp/user/generate
   */
  generateUserLoginOtp = catchAsync(async (req: Request, res: Response) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      throw new AppError('Phone number is required', 400);
    }

    const result = await otpService.generateUserLoginOtp(phoneNumber);

    res.status(200).json({
      success: true,
      message: 'Login OTP sent successfully',
      data: result,
    });
  });

  /**
   * Verify OTP
   * POST /api/v1/otp/verify
   */
  verifyCompanyOtp = catchAsync(async (req: Request, res: Response) => {
    const { otpId, otpCode, phoneNumber } = req.body;

    if (!otpId || !otpCode || !phoneNumber) {
      throw new AppError('OTP ID, code, and phone number are required', 400);
    }

    const result = await otpService.verifyOtp(otpId, otpCode, phoneNumber);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: result,
    });
  });

  /**
   * Get OTP statistics (admin only)
   * GET /api/v1/otp/stats?timeframe=24h
   */
  getOtpStats = catchAsync(async (req: Request, res: Response) => {
    const { timeframe = '24h' } = req.query;

    const stats = await otpService.getOtpStats(timeframe as string);

    res.status(200).json({
      success: true,
      data: {
        timeframe,
        stats,
      },
    });
  });

  /**
   * Generate company ID
   * POST /api/v1/otp/company/generate-id
   */
  generateCompanyId = catchAsync(async (req: Request, res: Response) => {
    const { countryCode, shortName } = req.body;

    const companyId = otpService.generateCompanyId(countryCode, shortName);

    res.status(200).json({
      success: true,
      data: { companyId },
    });
  });
}

export default new OtpController();
