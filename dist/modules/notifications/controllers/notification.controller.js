"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = require("../services/notification.service");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
class NotificationController {
    constructor() {
        this.listNotifications = async (req, res) => {
            try {
                const { page = 1, limit = 10, search, type, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
                const result = await this.service.listNotifications({
                    page: Number(page),
                    limit: Number(limit),
                    search: search,
                    type: type,
                    status: status,
                    sortBy: sortBy,
                    sortOrder: sortOrder,
                    userId: req.user?.id,
                });
                res.status(http_status_1.HttpStatus.OK).json({ status: 'success', data: result.data, meta: result.meta });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
                }
            }
        };
        this.markAsRead = async (req, res) => {
            try {
                const { id } = req.params;
                await this.service.markAsRead(id, req.user?.id);
                res.status(http_status_1.HttpStatus.NO_CONTENT).send();
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
                }
            }
        };
        this.deleteNotification = async (req, res) => {
            try {
                const { id } = req.params;
                await this.service.deleteNotification(id, req.user?.id);
                res.status(http_status_1.HttpStatus.NO_CONTENT).send();
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
                }
            }
        };
        this.sendNotification = async (req, res) => {
            try {
                const { type, message, data } = req.body;
                const userId = req.user?.id;
                const companyId = req.user?.companyId;
                if (!userId) {
                    throw new AppError_1.AppError('User ID is required', http_status_1.HttpStatus.BAD_REQUEST);
                }
                if (!companyId) {
                    throw new AppError_1.AppError('Company ID is required', http_status_1.HttpStatus.BAD_REQUEST);
                }
                const notification = await this.service.sendNotification({ userId, type, message, data, companyId });
                res.status(http_status_1.HttpStatus.CREATED).json({ status: 'success', data: notification });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
                }
            }
        };
        this.service = new notification_service_1.NotificationService();
    }
}
exports.NotificationController = NotificationController;
