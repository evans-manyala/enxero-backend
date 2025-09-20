"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../../../shared/utils/AppError");
const tenant_scoped_service_1 = require("../../../shared/services/tenant-scoped.service");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
const uuid_1 = require("uuid");
class NotificationService extends tenant_scoped_service_1.TenantScopedService {
    constructor() {
        super();
    }
    async listNotifications(options) {
        try {
            const { page, limit, search, type, status, sortBy, sortOrder, userId } = options;
            const skip = (page - 1) * limit;
            const where = {
                AND: [
                    userId ? { userId } : {},
                    search ? { message: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } } : {},
                    type ? { type } : {},
                    status ? { isRead: status === 'read' } : {},
                ],
            };
            const [notifications, total] = await Promise.all([
                this.prisma.notification.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
                }),
                this.prisma.notification.count({ where }),
            ]);
            return {
                data: notifications,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in listNotifications service:', error);
            throw new AppError_1.AppError('Failed to fetch notifications', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async markAsRead(id, userId) {
        try {
            const notification = await this.prisma.notification.findUnique({ where: { id } });
            if (!notification || (userId && notification.userId !== userId)) {
                throw new AppError_1.AppError('Notification not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            await this.prisma.notification.update({
                where: { id },
                data: { isRead: true },
            });
        }
        catch (error) {
            logger_1.default.error('Error in markAsRead service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to mark notification as read', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteNotification(id, userId) {
        try {
            const notification = await this.prisma.notification.findUnique({ where: { id } });
            if (!notification || (userId && notification.userId !== userId)) {
                throw new AppError_1.AppError('Notification not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            await this.prisma.notification.delete({ where: { id } });
        }
        catch (error) {
            logger_1.default.error('Error in deleteNotification service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to delete notification', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async sendNotification(data) {
        try {
            if (!data.companyId) {
                throw new AppError_1.AppError('Company ID is required', http_status_1.HttpStatus.BAD_REQUEST);
            }
            const notification = await this.prisma.notification.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId: data.userId,
                    type: data.type,
                    message: data.message,
                    data: data.data,
                    isRead: false,
                    title: data.title || 'Notification',
                    category: data.category || 'general',
                    companyId: data.companyId,
                },
            });
            return notification;
        }
        catch (error) {
            logger_1.default.error('Error in sendNotification service:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2003') {
                    throw new AppError_1.AppError('Invalid company ID or user ID', http_status_1.HttpStatus.BAD_REQUEST);
                }
            }
            throw new AppError_1.AppError('Failed to send notification', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
exports.NotificationService = NotificationService;
