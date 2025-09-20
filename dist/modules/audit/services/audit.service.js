"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const AppError_1 = require("../../../shared/utils/AppError");
const tenant_scoped_service_1 = require("../../../shared/services/tenant-scoped.service");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
class AuditService extends tenant_scoped_service_1.TenantScopedService {
    constructor() {
        super();
    }
    async getLogs(options) {
        try {
            const { page, limit, action, entityType, entityId, userId, startDate, endDate } = options;
            const skip = (page - 1) * limit;
            const where = {
                AND: [
                    action ? { action } : {},
                    entityType ? { tableName: entityType } : {},
                    entityId ? { recordId: entityId } : {},
                    userId ? { userId } : {},
                    startDate ? { createdAt: { gte: startDate } } : {},
                    endDate ? { createdAt: { lte: endDate } } : {},
                ],
            };
            const [logs, total] = await Promise.all([
                this.prisma.auditLog.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.auditLog.count({ where }),
            ]);
            return {
                data: logs,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getLogs service:', error);
            throw new AppError_1.AppError('Failed to fetch audit logs', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getLogById(id) {
        try {
            const log = await this.prisma.auditLog.findUnique({
                where: { id },
            });
            if (!log) {
                throw new AppError_1.AppError('Audit log not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            return log;
        }
        catch (error) {
            logger_1.default.error('Error in getLogById service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to fetch audit log', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getEntityLogs(options) {
        try {
            const { entityType, entityId, page, limit } = options;
            const skip = (page - 1) * limit;
            const where = {
                tableName: entityType,
                recordId: entityId,
            };
            const [logs, total] = await Promise.all([
                this.prisma.auditLog.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.auditLog.count({ where }),
            ]);
            return {
                data: logs,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getEntityLogs service:', error);
            throw new AppError_1.AppError('Failed to fetch entity audit logs', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
exports.AuditService = AuditService;
