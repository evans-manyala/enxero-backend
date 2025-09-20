"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = require("../controllers/audit.controller");
const validation_middleware_1 = require("../../../shared/middlewares/validation.middleware");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const auditController = new audit_controller_1.AuditController();
/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Audit trail management
 */
// Validation schemas
const paginationSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        search: zod_1.z.string().optional(),
        action: zod_1.z.string().optional(),
        entityType: zod_1.z.string().optional(),
        entityId: zod_1.z.string().optional(),
        userId: zod_1.z.string().optional(),
        startDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
        endDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
    }),
});
// Protected routes
/**
 * @swagger
 * /audit/logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
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
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filter by entity type
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: Filter by entity ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: List of audit logs
 */
router.get('/logs', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('read:all'), (0, validation_middleware_1.validateRequest)(paginationSchema), auditController.getLogs.bind(auditController));
/**
 * @swagger
 * /audit/logs/{id}:
 *   get:
 *     summary: Get audit log by ID
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Audit log ID
 *     responses:
 *       200:
 *         description: Audit log details
 */
router.get('/logs/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('read:all'), auditController.getLogById.bind(auditController));
/**
 * @swagger
 * /audit/logs/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get audit logs for an entity
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         schema:
 *           type: string
 *         required: true
 *         description: Entity type
 *       - in: path
 *         name: entityId
 *         schema:
 *           type: string
 *         required: true
 *         description: Entity ID
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
 *         description: List of audit logs for the entity
 */
router.get('/logs/entity/:entityType/:entityId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('read:all'), (0, validation_middleware_1.validateRequest)(paginationSchema), auditController.getEntityLogs.bind(auditController));
exports.default = router;
