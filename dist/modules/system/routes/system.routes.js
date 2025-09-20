"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const system_controller_1 = require("../controllers/system.controller");
const validation_middleware_1 = require("../../../shared/middlewares/validation.middleware");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const systemController = new system_controller_1.SystemController();
/**
 * @swagger
 * tags:
 *   name: System
 *   description: System configuration and management
 */
// Validation schemas
const createConfigSchema = zod_1.z.object({
    body: zod_1.z.object({
        key: zod_1.z.string().min(2, 'Key must be at least 2 characters'),
        value: zod_1.z.any(),
        description: zod_1.z.string().optional(),
    }),
});
const updateConfigSchema = zod_1.z.object({
    body: zod_1.z.object({
        value: zod_1.z.any(),
        description: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
    params: zod_1.z.object({
        key: zod_1.z.string(),
    }),
});
const paginationSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        search: zod_1.z.string().optional(),
        isActive: zod_1.z.string().optional().transform(val => val === 'true'),
    }),
});
// Public routes
/**
 * @swagger
 * /system/configs:
 *   get:
 *     summary: Get system configurations
 *     tags: [System]
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
 *         description: List of system configurations
 */
router.get('/configs', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('read:all'), (0, validation_middleware_1.validateRequest)(paginationSchema), systemController.getConfigs.bind(systemController));
/**
 * @swagger
 * /system/configs/{key}:
 *   get:
 *     summary: Get system configuration by key
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         schema:
 *           type: string
 *         required: true
 *         description: Configuration key
 *     responses:
 *       200:
 *         description: System configuration details
 */
router.get('/configs/:key', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('read:all'), systemController.getConfigByKey.bind(systemController));
// Protected routes
/**
 * @swagger
 * /system/configs:
 *   post:
 *     summary: Create system configuration
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 type: object
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: System configuration created
 */
router.post('/configs', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('write:all'), (0, validation_middleware_1.validateRequest)(createConfigSchema), systemController.createConfig.bind(systemController));
/**
 * @swagger
 * /system/configs/{key}:
 *   put:
 *     summary: Update system configuration
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         schema:
 *           type: string
 *         required: true
 *         description: Configuration key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: object
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: System configuration updated
 */
router.put('/configs/:key', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('write:all'), (0, validation_middleware_1.validateRequest)(updateConfigSchema), systemController.updateConfig.bind(systemController));
/**
 * @swagger
 * /system/logs:
 *   get:
 *     summary: Get system logs
 *     tags: [System]
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
 *         name: level
 *         schema:
 *           type: string
 *         description: Log level filter
 *     responses:
 *       200:
 *         description: List of system logs
 */
router.get('/logs', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('read:all'), systemController.getLogs.bind(systemController));
exports.default = router;
