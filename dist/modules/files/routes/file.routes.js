"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const file_controller_1 = require("../controllers/file.controller");
const validation_middleware_1 = require("../../../shared/middlewares/validation.middleware");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const controller = new file_controller_1.FileController();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
const uploadSchema = zod_1.z.object({
    body: zod_1.z.object({
        description: zod_1.z.string().optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        entityType: zod_1.z.string().optional(),
        entityId: zod_1.z.string().optional(),
    }),
});
const fileIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid(),
    }),
});
const paginationSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().transform(Number).default('1'),
        limit: zod_1.z.string().transform(Number).default('10'),
        search: zod_1.z.string().optional(),
        entityType: zod_1.z.string().optional(),
        entityId: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['filename', 'createdAt']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File upload, download, and metadata management
 */
/**
 * @swagger
 * /files:
 *   get:
 *     summary: Retrieve a paginated list of files with optional filtering and sorting
 *     tags: [Files]
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
 *         description: Search term for filename
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
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort field (filename, createdAt)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *         description: Sort direction (asc, desc)
 *     responses:
 *       200:
 *         description: List of files
 */
router.get('/', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(paginationSchema), controller.listFiles);
/**
 * @swagger
 * /files/{id}:
 *   get:
 *     summary: Retrieve metadata for a specific file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: File UUID
 *     responses:
 *       200:
 *         description: File metadata
 */
router.get('/:id', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(fileIdSchema), controller.getFileMetadata);
/**
 * @swagger
 * /files/{id}/download:
 *   get:
 *     summary: Download a specific file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: File UUID
 *     responses:
 *       200:
 *         description: File stream
 */
router.get('/:id/download', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(fileIdSchema), controller.downloadFile);
/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Upload a new file with optional metadata
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               entityType:
 *                 type: string
 *               entityId:
 *                 type: string
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post('/upload', auth_middleware_1.authenticate, upload.single('file'), controller.uploadFile);
/**
 * @swagger
 * /files/{id}:
 *   delete:
 *     summary: Delete a specific file and its metadata
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: File UUID
 *     responses:
 *       204:
 *         description: File deleted successfully
 */
router.delete('/:id', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(fileIdSchema), controller.deleteFile);
exports.default = router;
