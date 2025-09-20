"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../../../shared/utils/AppError");
const tenant_scoped_service_1 = require("../../../shared/services/tenant-scoped.service");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const UPLOAD_DIR = path_1.default.resolve(__dirname, '../../../../uploads');
class FileService extends tenant_scoped_service_1.TenantScopedService {
    constructor() {
        super();
        if (!fs_1.default.existsSync(UPLOAD_DIR)) {
            fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
        }
    }
    async listFiles(options) {
        try {
            const { page, limit, search, entityType, entityId, sortBy, sortOrder } = options;
            const skip = (page - 1) * limit;
            const where = {
                AND: [
                    search ? { filename: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } } : {},
                    entityType ? { entityType } : {},
                    entityId ? { entityId } : {},
                ],
            };
            const [files, total] = await Promise.all([
                this.prisma.file.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
                }),
                this.prisma.file.count({ where }),
            ]);
            return {
                data: files,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in listFiles service:', error);
            throw new AppError_1.AppError('Failed to fetch files', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getFileMetadata(id) {
        try {
            const file = await this.prisma.file.findUnique({ where: { id } });
            if (!file) {
                throw new AppError_1.AppError('File not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            return file;
        }
        catch (error) {
            logger_1.default.error('Error in getFileMetadata service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to fetch file metadata', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async downloadFile(id) {
        try {
            const file = await this.prisma.file.findUnique({ where: { id } });
            if (!file) {
                throw new AppError_1.AppError('File not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            const filePath = path_1.default.join(UPLOAD_DIR, file.storageName);
            if (!fs_1.default.existsSync(filePath)) {
                throw new AppError_1.AppError('File not found on disk', http_status_1.HttpStatus.NOT_FOUND);
            }
            return fs_1.default.createReadStream(filePath);
        }
        catch (error) {
            logger_1.default.error('Error in downloadFile service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to download file', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async uploadFile(data) {
        try {
            const { file, description, tags, entityType, entityId } = data;
            if (!file) {
                throw new AppError_1.AppError('No file uploaded', http_status_1.HttpStatus.BAD_REQUEST);
            }
            const storageName = `${Date.now()}_${file.originalname}`;
            const filePath = path_1.default.join(UPLOAD_DIR, storageName);
            fs_1.default.writeFileSync(filePath, file.buffer);
            const created = await this.prisma.file.create({
                data: {
                    filename: file.originalname,
                    storageName,
                    mimetype: file.mimetype,
                    size: file.size,
                    description,
                    tags: tags || [],
                    entityType,
                    entityId,
                    companyId: 'default-company', // TODO: Get from context
                    uploadedBy: 'default-user', // TODO: Get from context
                },
            });
            return created;
        }
        catch (error) {
            logger_1.default.error('Error in uploadFile service:', error);
            throw new AppError_1.AppError('Failed to upload file', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteFile(id) {
        try {
            const file = await this.prisma.file.findUnique({ where: { id } });
            if (!file) {
                throw new AppError_1.AppError('File not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            const filePath = path_1.default.join(UPLOAD_DIR, file.storageName);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
            await this.prisma.file.delete({ where: { id } });
        }
        catch (error) {
            logger_1.default.error('Error in deleteFile service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to delete file', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
exports.FileService = FileService;
