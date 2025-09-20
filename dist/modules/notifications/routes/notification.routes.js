"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const validation_middleware_1 = require("../../../shared/middlewares/validation.middleware");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const controller = new notification_controller_1.NotificationController();
const notificationIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid(),
    }),
});
const paginationSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().transform(Number).default('1'),
        limit: zod_1.z.string().transform(Number).default('10'),
        search: zod_1.z.string().optional(),
        type: zod_1.z.string().optional(),
        status: zod_1.z.enum(['unread', 'read']).optional(),
        sortBy: zod_1.z.enum(['createdAt', 'type', 'status']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
const sendNotificationSchema = zod_1.z.object({
    body: zod_1.z.object({
        type: zod_1.z.string().min(1),
        message: zod_1.z.string().min(1),
        data: zod_1.z.record(zod_1.z.any()).optional(),
    }),
});
/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notifications management
 */
/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Retrieve a paginated list of notifications with optional filtering and sorting
 *     tags: [Notifications]
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
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for message content
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by notification type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (unread, read)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort field (createdAt, type, status)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *         description: Sort direction (asc, desc)
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(paginationSchema), controller.listNotifications);
/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a specific notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Notification UUID
 *     responses:
 *       204:
 *         description: Notification marked as read
 */
router.patch('/:id/read', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(notificationIdSchema), controller.markAsRead);
/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a specific notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Notification UUID
 *     responses:
 *       204:
 *         description: Notification deleted successfully
 */
router.delete('/:id', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(notificationIdSchema), controller.deleteNotification);
/**
 * @swagger
 * /notifications/send:
 *   post:
 *     summary: Send a new notification to a specific user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               type:
 *                 type: string
 *               message:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Notification sent successfully
 */
router.post('/send', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(sendNotificationSchema), controller.sendNotification);
exports.default = router;
