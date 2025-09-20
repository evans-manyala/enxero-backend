"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../../../shared/utils/AppError");
const tenant_scoped_service_1 = require("../../../shared/services/tenant-scoped.service");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
class IntegrationService extends tenant_scoped_service_1.TenantScopedService {
    constructor() {
        super();
    }
    async getIntegrations(options) {
        try {
            const { page, limit, search, type, status, sortBy, sortOrder } = options;
            const skip = (page - 1) * limit;
            const where = {
                AND: [
                    search
                        ? {
                            OR: [
                                { name: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                                { type: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                            ],
                        }
                        : {},
                    type ? { type } : {},
                    status ? { status } : {},
                ],
            };
            const [integrations, total] = await Promise.all([
                this.prisma.integration.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
                    include: {
                        company: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                }),
                this.prisma.integration.count({ where }),
            ]);
            return {
                data: integrations,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getIntegrations service:', error);
            throw new AppError_1.AppError('Failed to fetch integrations', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getIntegrationById(id) {
        try {
            const integration = await this.prisma.integration.findUnique({
                where: { id },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    logs: {
                        take: 10,
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
            if (!integration) {
                throw new AppError_1.AppError('Integration not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            return integration;
        }
        catch (error) {
            logger_1.default.error('Error in getIntegrationById service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to fetch integration', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async createIntegration(data) {
        try {
            const integration = await this.prisma.integration.create({
                data,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            return integration;
        }
        catch (error) {
            logger_1.default.error('Error in createIntegration service:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new AppError_1.AppError('Integration with this name already exists', http_status_1.HttpStatus.CONFLICT);
                }
            }
            throw new AppError_1.AppError('Failed to create integration', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateIntegration(id, data) {
        try {
            const integration = await this.prisma.integration.update({
                where: { id },
                data,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            return integration;
        }
        catch (error) {
            logger_1.default.error('Error in updateIntegration service:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new AppError_1.AppError('Integration not found', http_status_1.HttpStatus.NOT_FOUND);
                }
                if (error.code === 'P2002') {
                    throw new AppError_1.AppError('Integration with this name already exists', http_status_1.HttpStatus.CONFLICT);
                }
            }
            throw new AppError_1.AppError('Failed to update integration', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteIntegration(id) {
        try {
            await this.prisma.integration.delete({
                where: { id },
            });
        }
        catch (error) {
            logger_1.default.error('Error in deleteIntegration service:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new AppError_1.AppError('Integration not found', http_status_1.HttpStatus.NOT_FOUND);
                }
            }
            throw new AppError_1.AppError('Failed to delete integration', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getIntegrationLogs(id, options) {
        try {
            const { page, limit, search, type, status, sortBy, sortOrder } = options;
            const skip = (page - 1) * limit;
            // First check if integration exists
            const integration = await this.prisma.integration.findUnique({
                where: { id },
            });
            if (!integration) {
                throw new AppError_1.AppError('Integration not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            const where = {
                integrationId: id,
                AND: [
                    search
                        ? {
                            OR: [
                                { message: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                                { status: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                            ],
                        }
                        : {},
                    status ? { status } : {},
                ],
            };
            const [logs, total] = await Promise.all([
                this.prisma.integrationLog.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
                }),
                this.prisma.integrationLog.count({ where }),
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
            logger_1.default.error('Error in getIntegrationLogs service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to fetch integration logs', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
exports.IntegrationService = IntegrationService;
