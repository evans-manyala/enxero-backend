"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const form_controller_1 = require("../controllers/form.controller");
const validation_middleware_1 = require("../../../shared/middlewares/validation.middleware");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const controller = new form_controller_1.FormController();
// Validation schemas
const createFormSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(200),
        description: zod_1.z.string().optional(),
        type: zod_1.z.string().min(1).max(50),
        fields: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().min(1).max(100),
            label: zod_1.z.string().min(1).max(200),
            type: zod_1.z.string().min(1).max(50),
            required: zod_1.z.boolean().default(false),
            options: zod_1.z.array(zod_1.z.string()).optional(),
            validation: zod_1.z.record(zod_1.z.any()).optional(),
        })),
        status: zod_1.z.enum(['draft', 'published', 'archived']).default('draft'),
    }),
});
const updateFormSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(200).optional(),
        description: zod_1.z.string().optional(),
        type: zod_1.z.string().min(1).max(50).optional(),
        fields: zod_1.z
            .array(zod_1.z.object({
            name: zod_1.z.string().min(1).max(100),
            label: zod_1.z.string().min(1).max(200),
            type: zod_1.z.string().min(1).max(50),
            required: zod_1.z.boolean().default(false),
            options: zod_1.z.array(zod_1.z.string()).optional(),
            validation: zod_1.z.record(zod_1.z.any()).optional(),
        }))
            .optional(),
        status: zod_1.z.enum(['draft', 'published', 'archived']).optional(),
    }),
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
const submitFormSchema = zod_1.z.object({
    body: zod_1.z.record(zod_1.z.any()),
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
const paginationSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().transform(Number).default('1'),
        limit: zod_1.z.string().transform(Number).default('10'),
        search: zod_1.z.string().optional(),
        type: zod_1.z.string().optional(),
        status: zod_1.z.enum(['draft', 'published', 'archived']).optional(),
        sortBy: zod_1.z.enum(['title', 'type', 'status', 'createdAt']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
const paginationWithParamsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().transform(Number).default('1'),
        limit: zod_1.z.string().transform(Number).default('10'),
        search: zod_1.z.string().optional(),
        type: zod_1.z.string().optional(),
        status: zod_1.z.enum(['draft', 'published', 'archived']).optional(),
        sortBy: zod_1.z.enum(['title', 'type', 'status', 'createdAt']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
/**
 * @swagger
 * tags:
 *   name: Forms
 *   description: Dynamic forms management
 */
/**
 * @swagger
 * /forms:
 *   get:
 *     summary: Retrieve a list of forms with pagination and filtering
 *     tags: [Forms]
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
 *         description: Search term for form title
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by form type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (active, inactive)
 *     responses:
 *       200:
 *         description: List of forms
 */
router.get('/', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(paginationSchema), controller.getForms);
/**
 * @swagger
 * /forms/{id}:
 *   get:
 *     summary: Retrieve a specific form by its ID
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Form UUID
 *     responses:
 *       200:
 *         description: Form details
 */
router.get('/:id', auth_middleware_1.authenticate, controller.getFormById);
/**
 * @swagger
 * /forms/{id}/submissions:
 *   get:
 *     summary: Retrieve submissions for a specific form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Form UUID
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
 *     responses:
 *       200:
 *         description: List of form submissions
 */
router.get('/:id/submissions', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(paginationWithParamsSchema), controller.getFormSubmissions);
/**
 * @swagger
 * /forms:
 *   post:
 *     summary: Create a new form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Form'
 *     responses:
 *       201:
 *         description: Form created successfully
 */
router.post('/', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(createFormSchema), controller.createForm);
/**
 * @swagger
 * /forms/{id}:
 *   patch:
 *     summary: Update a form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Form UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Form'
 *     responses:
 *       200:
 *         description: Form updated successfully
 */
router.patch('/:id', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(updateFormSchema), controller.updateForm);
/**
 * @swagger
 * /forms/{id}:
 *   delete:
 *     summary: Delete a form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Form UUID
 *     responses:
 *       204:
 *         description: Form deleted successfully
 */
router.delete('/:id', auth_middleware_1.authenticate, controller.deleteForm);
/**
 * @swagger
 * /forms/{id}/submit:
 *   post:
 *     summary: Submit a form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Form UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Form submitted successfully
 */
router.post('/:id/submit', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(submitFormSchema), controller.submitForm);
exports.default = router;
