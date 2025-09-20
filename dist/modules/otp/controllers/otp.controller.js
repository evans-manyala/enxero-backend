"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const otp_service_1 = __importDefault(require("../services/otp.service"));
const AppError_1 = require("../../../shared/utils/AppError");
const catch_async_1 = require("../../../shared/utils/catch-async");
class OtpController {
    constructor() {
        /**
         * Generate OTP for company registration
         * POST /api/v1/otp/company/generate
         */
        this.generateCompanyOtp = (0, catch_async_1.catchAsync)(async (req, res) => {
            const { phoneNumber, companyId } = req.body;
            if (!phoneNumber) {
                throw new AppError_1.AppError('Phone number is required', 400);
            }
            const result = await otp_service_1.default.generateCompanyRegistrationOtp(phoneNumber, companyId);
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
        this.generateUserLoginOtp = (0, catch_async_1.catchAsync)(async (req, res) => {
            const { phoneNumber } = req.body;
            if (!phoneNumber) {
                throw new AppError_1.AppError('Phone number is required', 400);
            }
            const result = await otp_service_1.default.generateUserLoginOtp(phoneNumber);
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
        this.verifyCompanyOtp = (0, catch_async_1.catchAsync)(async (req, res) => {
            const { otpId, otpCode, phoneNumber } = req.body;
            if (!otpId || !otpCode || !phoneNumber) {
                throw new AppError_1.AppError('OTP ID, code, and phone number are required', 400);
            }
            const result = await otp_service_1.default.verifyOtp(otpId, otpCode, phoneNumber);
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
        this.getOtpStats = (0, catch_async_1.catchAsync)(async (req, res) => {
            const { timeframe = '24h' } = req.query;
            const stats = await otp_service_1.default.getOtpStats(timeframe);
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
        this.generateCompanyId = (0, catch_async_1.catchAsync)(async (req, res) => {
            const { countryCode, shortName } = req.body;
            const companyId = otp_service_1.default.generateCompanyId(countryCode, shortName);
            res.status(200).json({
                success: true,
                data: { companyId },
            });
        });
    }
}
exports.default = new OtpController();
