"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const integration_controller_1 = require("../controllers/integration.controller");
const validation_middleware_1 = require("../../../shared/middlewares/validation.middleware");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const controller = new integration_controller_1.IntegrationController();
// Validation schemas
const createIntegrationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    type: zod_1.z.string().min(1).max(50),
    config: zod_1.z.record(zod_1.z.any()),
    status: zod_1.z.enum(['active', 'inactive']).default('active'),
});
const updateIntegrationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    type: zod_1.z.string().min(1).max(50).optional(),
    config: zod_1.z.record(zod_1.z.any()).optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
});
const paginationSchema = zod_1.z.object({
    page: zod_1.z.string().transform(Number).default('1'),
    limit: zod_1.z.string().transform(Number).default('10'),
    search: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
    sortBy: zod_1.z.enum(['name', 'type', 'status', 'createdAt']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
const paramsSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
// Wrap schemas for validateRequest
const queryPaginationSchema = zod_1.z.object({ query: paginationSchema });
const bodyCreateIntegrationSchema = zod_1.z.object({ body: createIntegrationSchema });
const bodyUpdateIntegrationSchema = zod_1.z.object({
    body: updateIntegrationSchema,
    params: paramsSchema
});
const queryPaginationWithParamsSchema = zod_1.z.object({
    query: paginationSchema,
    params: paramsSchema
});
/**
 * @swagger
 * tags:
 *   name: Integrations
 *   description: Third-party integrations management
 */
/**
 * @swagger
 * /integrations:
 *   get:
 *     summary: Retrieve a list of integrations for the company
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of integrations
 */
router.get('/', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(queryPaginationSchema), controller.getIntegrations);
/**
 * @swagger
 * /integrations/{id}:
 *   get:
 *     summary: Retrieve a specific integration by its ID
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Integration UUID
 *     responses:
 *       200:
 *         description: Integration details
 */
router.get('/:id', auth_middleware_1.authenticate, controller.getIntegrationById);
/**
 * @swagger
 * /integrations:
 *   post:
 *     summary: Create a new integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Integration'
 *     responses:
 *       201:
 *         description: Integration created successfully
 */
router.post('/', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(bodyCreateIntegrationSchema), controller.createIntegration);
/**
 * @swagger
 * /integrations/{id}:
 *   put:
 *     summary: Update an integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Integration UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Integration'
 *     responses:
 *       200:
 *         description: Integration updated successfully
 */
router.put('/:id', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(bodyUpdateIntegrationSchema), controller.updateIntegration);
/**
 * @swagger
 * /integrations/{id}:
 *   delete:
 *     summary: Delete an integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Integration UUID
 *     responses:
 *       200:
 *         description: Integration deleted successfully
 */
router.delete('/:id', auth_middleware_1.authenticate, controller.deleteIntegration);
/**
 * @swagger
 * /integrations/{id}/logs:
 *   get:
 *     summary: Retrieve logs for a specific integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Integration UUID
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
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (success, error)
 *     responses:
 *       200:
 *         description: List of integration logs
 */
router.get('/:id/logs', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(queryPaginationWithParamsSchema), controller.getIntegrationLogs);
exports.default = router;
