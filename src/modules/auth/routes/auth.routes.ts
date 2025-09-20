import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../../../shared/middlewares/validation.middleware';
import { authRateLimit, registrationRateLimit, otpRateLimit } from '../../../shared/middlewares/rate-limit.middleware';
import { 
  loginSchema, 
  registerSchema, 
  refreshTokenSchema,
  registerStep1Schema,
  registerStep2Schema,
  registerStep3Schema,
  loginInitiateSchema,
  loginVerifySchema,
  totpLoginInitiateSchema,
  totpLoginVerifySchema,
  enable2FASchema,
  disable2FASchema,
  companyValidationSchema,
  usernameValidationSchema,
  passwordValidationSchema,
  singlePageRegistrationSchema
} from '../validations/auth.validation';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and session management
 *   - name: Registration
 *     description: User and company registration flows
 *   - name: 2FA/TOTP
 *     description: Two-Factor Authentication management
 *   - name: Login Flows
 *     description: Various login flows and validations
 */

// ===================================================================
// LEGACY AUTHENTICATION (Backward Compatibility) - ON ICE
// ===================================================================

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Legacy single-step registration (ON ICE)
 *     tags: [Auth]
 *     description: Maintains backward compatibility for existing systems - TEMPORARILY DISABLED
 */
// router.post(
//   '/register',
//   validateRequest(registerSchema),
//   authController.register.bind(authController)
// );

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Legacy direct login (ON ICE)
 *     tags: [Auth]
 *     description: Maintains backward compatibility for existing systems - TEMPORARILY DISABLED
 */
// router.post(
//   '/login',
//   validateRequest(loginSchema),
//   authController.login.bind(authController)
// );

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token (ON ICE)
 *     tags: [Auth]
 */
// router.post(
//   '/refresh',
//   validateRequest(refreshTokenSchema),
//   authController.refreshToken.bind(authController)
// );

// ===================================================================
// ENHANCED MULTI-STEP REGISTRATION (Flowchart Compliant)
// ===================================================================

/**
 * @swagger
 * /auth/register/step1:
 *   post:
 *     summary: Step 1 - Company Details Registration
 *     tags: [Registration]
 *     description: |
 *       Register company information and receive a unique company identifier.
 *       This is the first step in the multi-tenant company registration process.
 *       
 *       **Multi-Tenant Support**: Each company gets isolated data with unique identifier.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - countryCode
 *               - phoneNumber
 *               - ownerEmail
 *               - ownerFirstName
 *               - ownerLastName
 *             properties:
 *               companyName:
 *                 type: string
 *                 minLength: 1
 *                 description: Full company name
 *                 example: "Acme Corporation Ltd"
 *               fullName:
 *                 type: string
 *                 description: Complete legal company name
 *                 example: "Acme Corporation Limited"
 *               shortName:
 *                 type: string
 *                 description: Short company name or abbreviation
 *                 example: "ACME"
 *               countryCode:
 *                 type: string
 *                 pattern: "^[A-Z]{2}$"
 *                 description: ISO 3166-1 alpha-2 country code
 *                 example: "US"
 *               phoneNumber:
 *                 type: string
 *                 pattern: "^\\+[1-9]\\d{1,14}$"
 *                 description: Company phone number in E.164 format
 *                 example: "+1234567890"
 *               workPhone:
 *                 type: string
 *                 description: Additional work phone number
 *                 example: "+1234567891"
 *               city:
 *                 type: string
 *                 description: Company city
 *                 example: "New York"
 *               address:
 *                 type: object
 *                 description: Company address details
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "123 Main St"
 *                   state:
 *                     type: string
 *                     example: "NY"
 *                   zipCode:
 *                     type: string
 *                     example: "10001"
 *               ownerEmail:
 *                 type: string
 *                 format: email
 *                 description: Company owner email address
 *                 example: "john.doe@acme.com"
 *               ownerFirstName:
 *                 type: string
 *                 minLength: 1
 *                 description: Owner first name
 *                 example: "John"
 *               ownerLastName:
 *                 type: string
 *                 minLength: 1
 *                 description: Owner last name
 *                 example: "Doe"
 *     responses:
 *       201:
 *         description: Company details registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Company details registered successfully. Check your email for the company identifier."
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionToken:
 *                       type: string
 *                       description: Session token for next steps
 *                       example: "abc123def456..."
 *                     companyIdentifier:
 *                       type: string
 *                       pattern: "^[A-Z]{2}-[A-Z0-9]{7}$"
 *                       description: Unique company identifier (AA-NANAANN format)
 *                       example: "US-A1B2C34"
 *                     step:
 *                       type: integer
 *                       example: 1
 *                     nextStep:
 *                       type: string
 *                       example: "Set username and password"
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Session expiration time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Company or email already exists
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
router.post(
  '/register/step1',
  registrationRateLimit,
  validateRequest(registerStep1Schema),
  authController.registerStep1.bind(authController)
);

/**
 * @swagger
 * /auth/register/step2:
 *   post:
 *     summary: Step 2 - Username and Password Setup
 *     tags: [Registration]
 *     description: |
 *       Set user credentials after company registration.
 *       Requires a valid session token from Step 1.
 *       
 *       **Multi-Tenant Support**: Username uniqueness is enforced globally for now.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionToken
 *               - username
 *               - password
 *               - confirmPassword
 *             properties:
 *               sessionToken:
 *                 type: string
 *                 description: Session token from Step 1
 *                 example: "abc123def456..."
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 pattern: "^[a-zA-Z0-9_-]+$"
 *                 description: Unique username (3+ characters, alphanumeric, underscore, hyphen)
 *                 example: "johndoe"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: |
 *                   Strong password (min 8 characters)
 *                   Must contain: uppercase, lowercase, numbers, special characters
 *                 example: "SecurePass123!"
 *               confirmPassword:
 *                 type: string
 *                 description: Password confirmation (must match password)
 *                 example: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Credentials set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Credentials set successfully. Check your email for confirmation."
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionToken:
 *                       type: string
 *                       description: Updated session token
 *                     step:
 *                       type: integer
 *                       example: 2
 *                     nextStep:
 *                       type: string
 *                       example: "Set up Two-Factor Authentication"
 *                     username:
 *                       type: string
 *                       example: "johndoe"
 *       400:
 *         description: Validation error or passwords don't match
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Username already taken
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
router.post(
  '/register/step2',
  validateRequest(registerStep2Schema),
  authController.registerStep2.bind(authController)
);

/**
 * @swagger
 * /auth/register/step3:
 *   post:
 *     summary: Step 3 - 2FA Setup and Completion
 *     tags: [Registration]
 *     description: |
 *       Complete registration with mandatory 2FA setup.
 *       Verifies TOTP token and finalizes company + user creation.
 *       
 *       **Multi-Tenant Support**: Creates isolated company data and admin user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionToken
 *               - twoFactorToken
 *             properties:
 *               sessionToken:
 *                 type: string
 *                 description: Session token from Step 2
 *                 example: "abc123def456..."
 *               twoFactorToken:
 *                 type: string
 *                 pattern: "^[0-9]{6}$"
 *                 description: 6-digit TOTP code from authenticator app
 *                 example: "123456"
 *               backupCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional backup codes for 2FA recovery
 *                 example: ["BACKUP01", "BACKUP02"]
 *     responses:
 *       200:
 *         description: Registration completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Registration completed successfully. You can now login."
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Registration completed successfully"
 *                     company:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                           example: "Acme Corporation Ltd"
 *                         identifier:
 *                           type: string
 *                           example: "US-A1B2C34"
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         username:
 *                           type: string
 *                           example: "johndoe"
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: "john.doe@acme.com"
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           code:
 *                             type: string
 *                           used:
 *                             type: boolean
 *                             example: false
 *                     nextStep:
 *                       type: string
 *                       example: "You can now login to your account"
 *       400:
 *         description: Invalid session or 2FA token
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
router.post(
  '/register/step3',
  validateRequest(registerStep3Schema),
  authController.registerStep3.bind(authController)
);

/**
 * @swagger
 * /auth/register/status/:email:
 *   get:
 *     summary: Get registration progress status
 *     tags: [Auth]
 */
router.get(
  '/register/status/:email',
  authController.getRegistrationStatus.bind(authController)
);

/**
 * @swagger
 * /auth/register/preview-identifier:
 *   post:
 *     summary: Preview Company Identifier Format
 *     tags: [Registration]
 *     description: |
 *       Generate a preview of what the company identifier will look like.
 *       Useful for frontend preview before actual registration.
 *       
 *       **Format**: AA-NANAANN (Country Code + 7 mixed characters)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - countryCode
 *               - shortName
 *             properties:
 *               countryCode:
 *                 type: string
 *                 pattern: "^[A-Z]{2}$"
 *                 description: ISO 3166-1 alpha-2 country code
 *                 example: "US"
 *               shortName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 10
 *                 description: Company short name for identifier generation
 *                 example: "ACME"
 *     responses:
 *       200:
 *         description: Identifier preview generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     identifier:
 *                       type: string
 *                       pattern: "^[A-Z]{2}-[A-Z0-9]{7}$"
 *                       description: Generated company identifier
 *                       example: "US-A1B2C34"
 *                     format:
 *                       type: string
 *                       example: "AA-NANAANN"
 *                     example:
 *                       type: string
 *                       example: "US-1A2B3C45"
 *       400:
 *         description: Invalid country code or short name
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
router.post(
  '/register/preview-identifier',
  authController.previewCompanyIdentifier.bind(authController)
);

/**
 * @swagger
 * /auth/register/resend-email:
 *   post:
 *     summary: Resend registration email for current step
 *     tags: [Auth]
 */
router.post(
  '/register/resend-email',
  authController.resendRegistrationEmail.bind(authController)
);

// ===================================================================
// ENHANCED LOGIN FLOW (OTP-Based Authentication)
// ===================================================================

/**
 * @swagger
 * /auth/login/initiate:
 *   post:
 *     summary: Initiate Enhanced Login with Email OTP
 *     tags: [Authentication]
 *     description: |
 *       Start enhanced login process with email/username and password.
 *       Sends OTP verification code to user's email for additional security.
 *       
 *       **Multi-Tenant Support**: Works across all companies.
 *       **Email OTP**: Sends 6-digit code to registered email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: "john.doe@acme.com"
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login initiated, OTP sent to email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Login initiated. Please check your email for verification code."
 *                 data:
 *                   type: object
 *                   properties:
 *                     loginToken:
 *                       type: string
 *                       description: Token for OTP verification
 *                       example: "temp_login_token_abc123"
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Token expiration time
 *                     email:
 *                       type: string
 *                       description: Masked email address
 *                       example: "jo**@acme.com"
 *                     message:
 *                       type: string
 *                       example: "Verification code sent to your email"
 *                     requiresOtp:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication failed or account locked
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
router.post(
  '/login/initiate',
  authRateLimit,
  validateRequest(loginInitiateSchema),
  authController.loginInitiate.bind(authController)
);

/**
 * @swagger
 * /auth/login/verify:
 *   post:
 *     summary: Verify Email OTP and Complete Login
 *     tags: [Authentication]
 *     description: |
 *       Complete the enhanced login process by verifying the OTP code sent to email.
 *       Returns access and refresh tokens upon successful verification.
 *       
 *       **Email OTP**: Validates 6-digit code from email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loginToken
 *               - otpCode
 *             properties:
 *               loginToken:
 *                 type: string
 *                 description: Login token from initiate step
 *                 example: "temp_login_token_abc123"
 *               otpCode:
 *                 type: string
 *                 pattern: "^[0-9]{6}$"
 *                 description: 6-digit OTP code from email
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         username:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         role:
 *                           type: string
 *                         companyId:
 *                           type: string
 *                           format: uuid
 *                         company:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                             identifier:
 *                               type: string
 *                         twoFactorEnabled:
 *                           type: boolean
 *                         twoFactorSetupRequired:
 *                           type: boolean
 *       400:
 *         description: Invalid OTP code or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: OTP verification failed
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
router.post(
  '/login/verify',
  otpRateLimit,
  validateRequest(loginVerifySchema),
  authController.loginVerify.bind(authController)
);

/**
 * @swagger
 * /auth/login/resend-otp:
 *   post:
 *     summary: Resend login OTP
 *     tags: [Auth]
 */
router.post(
  '/login/resend-otp',
  otpRateLimit,
  authController.resendLoginOtp.bind(authController)
);

/**
 * @swagger
 * /auth/workspace/check-access:
 *   post:
 *     summary: Check workspace access after login
 *     tags: [Auth]
 *     description: Verify user's workspace access per flowchart logic
 */
router.post(
  '/workspace/check-access',
  authController.checkWorkspaceAccess.bind(authController)
);

/**
 * @swagger
 * /auth/workspaces/:email:
 *   get:
 *     summary: Get workspaces for a user
 *     tags: [Auth]
 */
router.get(
  '/workspaces/:email',
  authController.getWorkspaces.bind(authController)
);

// ===================================================================
// TOTP AUTHENTICATION ROUTES (2FA Enhancement)
// ===================================================================

/**
 * @swagger
 * /auth/totp/login/initiate:
 *   post:
 *     summary: Initiate TOTP-based login
 *     tags: [Auth]
 *     description: Start login process with 2FA verification
 */
router.post(
  '/totp/login/initiate',
  authRateLimit,
  validateRequest(totpLoginInitiateSchema),
  authController.totpLoginInitiate.bind(authController)
);

/**
 * @swagger
 * /auth/totp/login/verify:
 *   post:
 *     summary: Verify TOTP code and complete login
 *     tags: [Auth]
 *     description: Complete login process by verifying TOTP code
 */
router.post(
  '/totp/login/verify',
  otpRateLimit,
  validateRequest(totpLoginVerifySchema),
  authController.totpLoginVerify.bind(authController)
);

/**
 * @swagger
 * /auth/2fa/setup:
 *   post:
 *     summary: Setup 2FA for user account
 *     tags: [Auth]
 *     description: Generate QR code and backup codes for 2FA setup
 */
router.post(
  '/2fa/setup',
  authController.setup2FA.bind(authController)
);

/**
 * @swagger
 * /auth/2fa/enable:
 *   post:
 *     summary: Enable 2FA after setup
 *     tags: [Auth]
 *     description: Enable 2FA by verifying TOTP code
 */
router.post(
  '/2fa/enable',
  validateRequest(enable2FASchema),
  authController.enable2FA.bind(authController)
);

/**
 * @swagger
 * /auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA for user account
 *     tags: [Auth]
 *     description: Disable 2FA by verifying TOTP code
 */
router.post(
  '/2fa/disable',
  validateRequest(disable2FASchema),
  authController.disable2FA.bind(authController)
);

/**
 * @swagger
 * /auth/2fa/status:
 *   get:
 *     summary: Get 2FA status for user
 *     tags: [Auth]
 *     description: Check if 2FA is enabled and backup codes exist
 */
router.get(
  '/2fa/status',
  authController.get2FAStatus.bind(authController)
);

// ===================================================================
// UI-MATCHING FLOW ROUTES (New Endpoints - No Breaking Changes)
// ===================================================================

/**
 * @swagger
 * /auth/ui/register:
 *   post:
 *     summary: Single-Page Registration (UI Optimized)
 *     tags: [Registration]
 *     description: |
 *       Complete registration in a single request with all company and user information.
 *       Alternative to the multi-step registration flow for simplified UI integration.
 *       
 *       **Multi-Tenant Support**: Creates isolated company with admin user.
 *       **2FA Required**: User must set up 2FA before first login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyFullName
 *               - companyShortName
 *               - companyWorkPhone
 *               - companyCity
 *               - companyCountry
 *               - fullName
 *               - jobTitle
 *               - phoneNumber
 *               - email
 *               - username
 *               - password
 *             properties:
 *               companyFullName:
 *                 type: string
 *                 minLength: 1
 *                 description: Full legal company name
 *                 example: "Acme Corporation Limited"
 *               companyShortName:
 *                 type: string
 *                 minLength: 1
 *                 description: Short company name or abbreviation
 *                 example: "ACME"
 *               companyWorkPhone:
 *                 type: string
 *                 pattern: "^\\+[1-9]\\d{1,14}$"
 *                 description: Company work phone (E.164 format)
 *                 example: "+1234567890"
 *               companyCity:
 *                 type: string
 *                 minLength: 1
 *                 description: Company city
 *                 example: "New York"
 *               companyCountry:
 *                 type: string
 *                 pattern: "^[A-Z]{2}$"
 *                 description: Country code (ISO 3166-1 alpha-2)
 *                 example: "US"
 *               fullName:
 *                 type: string
 *                 minLength: 1
 *                 description: User full name
 *                 example: "John Doe"
 *               jobTitle:
 *                 type: string
 *                 minLength: 1
 *                 description: User job title
 *                 example: "CEO"
 *               phoneNumber:
 *                 type: string
 *                 pattern: "^\\+[1-9]\\d{1,14}$"
 *                 description: User phone number (E.164 format)
 *                 example: "+1234567891"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: "john.doe@acme.com"
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 pattern: "^[a-zA-Z0-9_-]+$"
 *                 description: Unique username
 *                 example: "johndoe"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User password (min 6 characters)
 *                 example: "SecurePass123!"
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Registration successful. 2FA setup is required before you can login."
 *                     companyIdentifier:
 *                       type: string
 *                       example: "US-A1B2C34"
 *                     requires2FASetup:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         username:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         role:
 *                           type: string
 *                           example: "USER"
 *                         companyId:
 *                           type: string
 *                           format: uuid
 *                         company:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                             identifier:
 *                               type: string
 *                         twoFactorEnabled:
 *                           type: boolean
 *                           example: false
 *                         twoFactorSetupRequired:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: Validation error or user already exists
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
router.post(
  '/ui/register',
  validateRequest(singlePageRegistrationSchema),
  authController.registerSinglePage.bind(authController)
);

/**
 * @swagger
 * /auth/ui/login/step1/company:
 *   post:
 *     summary: Step 1 - Validate Company Identifier
 *     tags: [Login Flows]
 *     description: |
 *       Validate company identifier as the first step in the UI login flow.
 *       Returns company information if valid.
 *       
 *       **Multi-Tenant Support**: Validates company exists and is active.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyIdentifier
 *             properties:
 *               companyIdentifier:
 *                 type: string
 *                 pattern: "^[A-Z]{2}-[A-Z0-9]{7}$"
 *                 description: Company identifier in AA-NANAANN format
 *                 example: "US-A1B2C34"
 *     responses:
 *       200:
 *         description: Company identifier is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     companyId:
 *                       type: string
 *                       format: uuid
 *                       description: Company UUID
 *                     companyName:
 *                       type: string
 *                       example: "Acme Corporation Ltd"
 *                     nextStep:
 *                       type: string
 *                       example: "username"
 *       400:
 *         description: Invalid company identifier format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Company not found or inactive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Company identifier not found or inactive"
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: false
 *                     nextStep:
 *                       type: string
 *                       example: "error"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/ui/login/step1/company',
  validateRequest(companyValidationSchema),
  authController.validateCompanyIdentifier.bind(authController)
);

/**
 * @swagger
 * /auth/ui/login/step2/username:
 *   post:
 *     summary: Step 2 - Validate Username
 *     tags: [Login Flows]
 *     description: |
 *       Validate username within the specified company context.
 *       Supports both username and email as input.
 *       
 *       **Multi-Tenant Support**: Validates user exists within company scope.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyIdentifier
 *               - username
 *             properties:
 *               companyIdentifier:
 *                 type: string
 *                 pattern: "^[A-Z]{2}-[A-Z0-9]{7}$"
 *                 description: Company identifier from Step 1
 *                 example: "US-A1B2C34"
 *               username:
 *                 type: string
 *                 description: Username or email address
 *                 example: "johndoe" or "john.doe@acme.com"
 *     responses:
 *       200:
 *         description: Username is valid within company
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                       description: User UUID
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: User email (may be masked)
 *                       example: "jo**@acme.com"
 *                     nextStep:
 *                       type: string
 *                       example: "password"
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Username not found in company
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Username not found in this company"
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: false
 *                     nextStep:
 *                       type: string
 *                       example: "error"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/ui/login/step2/username',
  validateRequest(usernameValidationSchema),
  authController.validateUsername.bind(authController)
);

/**
 * @swagger
 * /auth/ui/login/step3/password:
 *   post:
 *     summary: Step 3 - Validate Password
 *     tags: [Login Flows]
 *     description: |
 *       Validate password and determine next authentication step.
 *       May proceed to TOTP verification or complete login.
 *       
 *       **Multi-Tenant Support**: Validates within company context.
 *       **2FA Support**: Automatically detects if TOTP is required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyIdentifier
 *               - username
 *               - password
 *             properties:
 *               companyIdentifier:
 *                 type: string
 *                 pattern: "^[A-Z]{2}-[A-Z0-9]{7}$"
 *                 description: Company identifier
 *                 example: "US-A1B2C34"
 *               username:
 *                 type: string
 *                 description: Username or email from Step 2
 *                 example: "johndoe"
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Password validated - may require TOTP
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     requiresTOTP:
 *                       type: boolean
 *                       description: Whether TOTP verification is required
 *                       example: true
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Masked email for TOTP
 *                       example: "jo**@acme.com"
 *                     nextStep:
 *                       type: string
 *                       enum: ["totp", "complete"]
 *                       example: "totp"
 *       400:
 *         description: Invalid password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Account locked or unauthorized
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
router.post(
  '/ui/login/step3/password',
  validateRequest(passwordValidationSchema),
  authController.validatePassword.bind(authController)
);

/**
 * @swagger
 * /auth/ui/login/step4/totp:
 *   post:
 *     summary: Step 4 - Complete TOTP Login
 *     tags: [Login Flows]
 *     description: |
 *       Complete the login process with TOTP (Time-based One-Time Password) verification.
 *       This is the final step for users with 2FA enabled.
 *       
 *       **2FA Support**: Validates 6-digit TOTP code from authenticator app.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyIdentifier
 *               - username
 *               - totpToken
 *             properties:
 *               companyIdentifier:
 *                 type: string
 *                 pattern: "^[A-Z]{2}-[A-Z0-9]{7}$"
 *                 description: Company identifier
 *                 example: "US-A1B2C34"
 *               username:
 *                 type: string
 *                 description: Username or email
 *                 example: "johndoe"
 *               totpToken:
 *                 type: string
 *                 pattern: "^[0-9]{6}$"
 *                 description: 6-digit TOTP code from authenticator app
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         username:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         role:
 *                           type: string
 *                           example: "COMPANY_ADMIN"
 *                         companyId:
 *                           type: string
 *                           format: uuid
 *                         company:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                               example: "Acme Corporation Ltd"
 *                             identifier:
 *                               type: string
 *                               example: "US-A1B2C34"
 *                         twoFactorEnabled:
 *                           type: boolean
 *                           example: true
 *                         twoFactorSetupRequired:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Invalid TOTP code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: TOTP verification failed or expired
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
router.post(
  '/ui/login/step4/totp',
  validateRequest(totpLoginVerifySchema),
  authController.completeTOTPLogin.bind(authController)
);

/**
 * @swagger
 * /auth/ui/2fa/force-setup:
 *   post:
 *     summary: Force 2FA Setup (Strict Enforcement)
 *     tags: [Auth]
 *     description: Mandatory 2FA setup for strict security compliance
 */
router.post(
  '/ui/2fa/force-setup',
  authController.force2FASetup.bind(authController)
);

export default router;
