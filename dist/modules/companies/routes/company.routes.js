"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("../controllers/company.controller");
const validation_middleware_1 = require("../../../shared/middlewares/validation.middleware");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const companyController = new company_controller_1.CompanyController();
/**
 * @swagger
 * tags:
 *   name: Companies
 *   description: Company management operations
 */
// Validation schemas
const createCompanySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Company name must be at least 2 characters'),
        identifier: zod_1.z.string().optional(),
        fullName: zod_1.z.string().optional(),
        shortName: zod_1.z.string().optional(),
        workPhone: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        address: zod_1.z.record(zod_1.z.any()).optional(),
        settings: zod_1.z.record(zod_1.z.any()).optional(),
    }),
});
const updateCompanySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).optional(),
        identifier: zod_1.z.string().optional(),
        fullName: zod_1.z.string().optional(),
        shortName: zod_1.z.string().optional(),
        workPhone: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        address: zod_1.z.record(zod_1.z.any()).optional(),
        settings: zod_1.z.record(zod_1.z.any()).optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().uuid(),
    }),
});
// New OTP-based registration schemas
const initiateRegistrationSchema = zod_1.z.object({
    body: zod_1.z.object({
        phoneNumber: zod_1.z.string()
            .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (+1234567890)')
            .min(8, 'Phone number too short')
            .max(16, 'Phone number too long'),
    }),
});
const completeRegistrationSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Company details
        name: zod_1.z.string().min(2, 'Company name must be at least 2 characters'),
        shortName: zod_1.z.string().min(2).optional(),
        fullName: zod_1.z.string().optional(),
        countryCode: zod_1.z.string()
            .length(2, 'Country code must be exactly 2 characters')
            .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters')
            .optional(),
        phoneNumber: zod_1.z.string()
            .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format'),
        workPhone: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        address: zod_1.z.record(zod_1.z.any()).optional(),
        // Owner details
        ownerFirstName: zod_1.z.string().min(2, 'First name must be at least 2 characters'),
        ownerLastName: zod_1.z.string().min(2, 'Last name must be at least 2 characters'),
        ownerEmail: zod_1.z.string().email('Invalid email format'),
        ownerUsername: zod_1.z.string().min(3, 'Username must be at least 3 characters'),
        ownerPassword: zod_1.z.string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
        // OTP verification
        otpId: zod_1.z.string().uuid('Invalid OTP ID format'),
        otpCode: zod_1.z.string()
            .regex(/^\d{6}$/, 'OTP must be exactly 6 digits')
            .length(6, 'OTP must be exactly 6 digits'),
    }),
});
const generateCompanyIdSchema = zod_1.z.object({
    body: zod_1.z.object({
        countryCode: zod_1.z.string()
            .length(2, 'Country code must be exactly 2 characters')
            .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters')
            .optional(),
        shortName: zod_1.z.string()
            .min(2, 'Short name must be at least 2 characters')
            .max(20, 'Short name must be at most 20 characters')
            .optional(),
    }),
});
const companyInviteSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        roleId: zod_1.z.string().uuid(),
        firstName: zod_1.z.string().min(2),
        lastName: zod_1.z.string().min(2),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().uuid(),
    }),
});
// Public routes
/**
 * @swagger
 * /companies:
 *   get:
 *     summary: Get a list of all companies
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: List of companies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Company'
 */
router.get('/', auth_middleware_1.authenticate, companyController.getCompanies.bind(companyController));
/**
 * @swagger
 * /companies/{id}:
 *   get:
 *     summary: Get a company by ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the company to retrieve
 *     responses:
 *       200:
 *         description: Company retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 */
router.get('/:id', auth_middleware_1.authenticate, companyController.getCompanyById.bind(companyController));
// Protected routes
/**
 * @swagger
 * /companies:
 *   post:
 *     summary: Create a new company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCompanyInput'
 *     responses:
 *       201:
 *         description: Company created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 */
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('write:all'), (0, validation_middleware_1.validateRequest)(createCompanySchema), companyController.createCompany.bind(companyController));
/**
 * @swagger
 * /companies/{id}:
 *   put:
 *     summary: Update a company by ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the company to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCompanyInput'
 *     responses:
 *       200:
 *         description: Company updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 */
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('write:all'), (0, validation_middleware_1.validateRequest)(updateCompanySchema), companyController.updateCompany.bind(companyController));
/**
 * @swagger
 * /companies/{id}:
 *   delete:
 *     summary: Delete a company by ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the company to delete
 *     responses:
 *       204:
 *         description: Company deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden, insufficient permissions
 *       404:
 *         description: Company not found
 */
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('write:all'), companyController.deleteCompany.bind(companyController));
/**
 * @swagger
 * /companies/{id}/invite:
 *   post:
 *     summary: Invite a user to a company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the company
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompanyInviteInput'
 *     responses:
 *       200:
 *         description: User invited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     inviteId:
 *                       type: string
 *                       format: uuid
 */
router.post('/:id/invite', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('write:all'), (0, validation_middleware_1.validateRequest)(companyInviteSchema), companyController.inviteUser.bind(companyController));
/**
 * @swagger
 * /companies/{id}/members:
 *   get:
 *     summary: Get all members of a company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the company
 *     responses:
 *       200:
 *         description: Company members retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
router.get('/:id/members', auth_middleware_1.authenticate, companyController.getCompanyMembers.bind(companyController));
/**
 * @swagger
 * /companies/{id}/settings:
 *   get:
 *     summary: Get company settings
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the company
 *     responses:
 *       200:
 *         description: Company settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       type: object
 */
router.get('/:id/settings', auth_middleware_1.authenticate, companyController.getCompanySettings.bind(companyController));
/**
 * @swagger
 * /companies/{id}/settings:
 *   put:
 *     summary: Update company settings
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the company
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Company settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       type: object
 */
router.put('/:id/settings', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('write:all'), companyController.updateCompanySettings.bind(companyController));
// New OTP-based registration routes (public)
/**
 * @swagger
 * /companies/register/initiate:
 *   post:
 *     summary: Initiate company registration with OTP verification
 *     tags: [Companies]
 *     description: Starts the company registration process by sending an OTP to the provided phone number. This is the first step in the ISO-compliant company registration flow.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompanyRegistrationRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully for company registration
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
 *         description: Too many registration attempts - rate limit exceeded
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
router.post('/register/initiate', (0, validation_middleware_1.validateRequest)(initiateRegistrationSchema), companyController.initiateRegistration.bind(companyController));
/**
 * @swagger
 * /companies/register/complete:
 *   post:
 *     summary: Complete company registration with OTP verification
 *     tags: [Companies]
 *     description: Completes the company registration process by verifying the OTP and creating the company with ISO-compliant company ID format (COUNTRY-SHORT-RANDOM). Creates both the company and owner user account.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompanyRegistrationCompleteRequest'
 *     responses:
 *       201:
 *         description: Company registered successfully with ISO-compliant ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyRegistrationResponse'
 *       400:
 *         description: Invalid OTP, expired OTP, or validation errors
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
 *       409:
 *         description: Company name or email already exists
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
router.post('/register/complete', (0, validation_middleware_1.validateRequest)(completeRegistrationSchema), companyController.completeRegistration.bind(companyController));
/**
 * @swagger
 * /companies/generate-id:
 *   post:
 *     summary: Generate ISO-compliant company ID
 *     tags: [Companies]
 *     description: Generates a unique company ID following ISO standards in format COUNTRY-SHORT-RANDOM (e.g., KE-ACME-A1B2C3). Used for preview during registration process.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               countryCode:
 *                 type: string
 *                 pattern: '^[A-Z]{2}$'
 *                 description: ISO 3166-1 alpha-2 country code
 *                 example: 'KE'
 *               shortName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 20
 *                 description: Company short name for ID generation
 *                 example: 'ACME'
 *     responses:
 *       200:
 *         description: ISO-compliant company ID generated successfully
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
 *                       description: Generated ISO-compliant company ID
 *                       example: 'KE-ACME-A1B2C3'
 *                     format:
 *                       type: string
 *                       description: ID format explanation
 *                       example: 'COUNTRY-SHORT-RANDOM'
 *       400:
 *         description: Invalid country code or company name
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/generate-id', (0, validation_middleware_1.validateRequest)(generateCompanyIdSchema), companyController.generateCompanyId.bind(companyController));
/**
 * @swagger
 * /companies/{id}/registration-status:
 *   get:
 *     summary: Get company registration and setup status
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     responses:
 *       200:
 *         description: Registration status retrieved successfully
 */
router.get('/:id/registration-status', auth_middleware_1.authenticate, companyController.getRegistrationStatus.bind(companyController));
exports.default = router;
