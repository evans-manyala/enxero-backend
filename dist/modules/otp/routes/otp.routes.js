"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const otp_controller_1 = __importDefault(require("../controllers/otp.controller"));
const validation_middleware_1 = require("../../../shared/middlewares/validation.middleware");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
// import { rateLimiter } from '../../../shared/middleware/rateLimiter';
const otp_validation_1 = __importDefault(require("../validations/otp.validation"));
const router = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   name: OTP
 *   description: One-Time Password (OTP) management for phone verification
 */
// Rate limiting for OTP endpoints (stricter limits)
// TODO: Implement rate limiting middleware
const otpRateLimit = (req, res, next) => next();
/**
 * @swagger
 * /otp/company/generate:
 *   post:
 *     summary: Generate OTP for company registration
 *     tags: [OTP]
 *     description: Generates a 6-digit OTP and sends it via SMS for company phone verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPGenerateRequest'
 *     responses:
 *       200:
 *         description: OTP generated and sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPResponse'
 *       400:
 *         description: Invalid phone number format or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Public routes (no authentication required)
router.post('/company/generate', 
// otpRateLimit,
(0, validation_middleware_1.validateRequest)(otp_validation_1.default.generateCompanyOtpSchema), otp_controller_1.default.generateCompanyOtp);
/**
 * @swagger
 * /otp/user/generate:
 *   post:
 *     summary: Generate OTP for user login
 *     tags: [OTP]
 *     description: Generates a 6-digit OTP and sends it via SMS for user authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPGenerateRequest'
 *     responses:
 *       200:
 *         description: OTP generated and sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPResponse'
 *       400:
 *         description: Invalid phone number or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found with this phone number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/user/generate', 
// otpRateLimit,
(0, validation_middleware_1.validateRequest)(otp_validation_1.default.generateUserLoginOtpSchema), otp_controller_1.default.generateUserLoginOtp);
/**
 * @swagger
 * /otp/verify:
 *   post:
 *     summary: Verify OTP code
 *     tags: [OTP]
 *     description: Verifies the OTP code sent to the user's phone number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPVerifyRequest'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPVerifyResponse'
 *       400:
 *         description: Invalid OTP code, expired, or maximum attempts exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: OTP not found or already used
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/verify', 
// otpRateLimit,
(0, validation_middleware_1.validateRequest)(otp_validation_1.default.verifyOtpSchema), otp_controller_1.default.verifyCompanyOtp);
/**
 * @swagger
 * /otp/company/generate-id:
 *   post:
 *     summary: Generate ISO format company ID
 *     tags: [OTP]
 *     description: Generates a unique company ID in ISO format (COUNTRY-SHORT-RANDOM)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - countryCode
 *               - companyName
 *             properties:
 *               countryCode:
 *                 type: string
 *                 pattern: '^[A-Z]{2}$'
 *                 description: ISO 3166-1 alpha-2 country code
 *                 example: 'KE'
 *               companyName:
 *                 type: string
 *                 minLength: 2
 *                 description: Company name for ID generation
 *                 example: 'Acme Corporation'
 *     responses:
 *       200:
 *         description: Company ID generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     companyId:
 *                       type: string
 *                       description: Generated company ID
 *                       example: 'KE-ACME-A1B2C3'
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/company/generate-id', (0, validation_middleware_1.validateRequest)(otp_validation_1.default.generateCompanyIdSchema), otp_controller_1.default.generateCompanyId);
/**
 * @swagger
 * /otp/stats:
 *   get:
 *     summary: Get OTP statistics
 *     tags: [OTP]
 *     description: Retrieve OTP usage statistics (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 24h
 *         description: Time frame for statistics
 *     responses:
 *       200:
 *         description: OTP statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     additionalProperties:
 *                       type: integer
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Protected routes (authentication required)
router.get('/stats', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin'), otp_controller_1.default.getOtpStats);
exports.default = router;
