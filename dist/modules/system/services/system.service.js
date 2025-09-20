"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
class SystemService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    async getConfigs(options) {
        try {
            const { page, limit, search, isActive } = options;
            const skip = (page - 1) * limit;
            const where = {
                AND: [
                    search
                        ? {
                            key: {
                                contains: search,
                                mode: client_1.Prisma.QueryMode.insensitive,
                            },
                        }
                        : {},
                    isActive !== undefined ? { isActive } : {},
                ],
            };
            const [configs, total] = await Promise.all([
                this.prisma.systemConfig.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.systemConfig.count({ where }),
            ]);
            return {
                data: configs,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getConfigs service:', error);
            throw new AppError_1.AppError('Failed to fetch system configurations', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getConfigByKey(key) {
        try {
            const config = await this.prisma.systemConfig.findUnique({
                where: { key },
            });
            if (!config) {
                throw new AppError_1.AppError('Configuration not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            return config;
        }
        catch (error) {
            logger_1.default.error('Error in getConfigByKey service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to fetch system configuration', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async createConfig(data) {
        try {
            const config = await this.prisma.systemConfig.create({
                data: {
                    key: data.key,
                    value: data.value,
                    description: data.description,
                },
            });
            return config;
        }
        catch (error) {
            logger_1.default.error('Error in createConfig service:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new AppError_1.AppError('Configuration with this key already exists', http_status_1.HttpStatus.CONFLICT);
                }
            }
            throw new AppError_1.AppError('Failed to create system configuration', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateConfig(key, data) {
        try {
            const config = await this.prisma.systemConfig.update({
                where: { key },
                data: {
                    value: data.value,
                    description: data.description,
                    isActive: data.isActive,
                },
            });
            return config;
        }
        catch (error) {
            logger_1.default.error('Error in updateConfig service:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new AppError_1.AppError('Configuration not found', http_status_1.HttpStatus.NOT_FOUND);
                }
            }
            throw new AppError_1.AppError('Failed to update system configuration', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getLogs(options) {
        try {
            const { page, limit, level } = options;
            const skip = (page - 1) * limit;
            const where = {
                level: level ? { equals: level } : undefined,
            };
            const [logs, total] = await Promise.all([
                this.prisma.systemLog.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.systemLog.count({ where }),
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
            throw new AppError_1.AppError('Failed to fetch system logs', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
exports.SystemService = SystemService;
