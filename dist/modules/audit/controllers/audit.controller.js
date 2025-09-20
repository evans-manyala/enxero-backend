"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const audit_service_1 = require("../services/audit.service");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
class AuditController {
    constructor() {
        this.auditService = new audit_service_1.AuditService();
    }
    async getLogs(req, res) {
        try {
            const { page = 1, limit = 10, action, entityType, entityId, userId, startDate, endDate, } = req.query;
            const result = await this.auditService.getLogs({
                page: Number(page),
                limit: Number(limit),
                action: action,
                entityType: entityType,
                entityId: entityId,
                userId: userId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
            });
            res.json(result);
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                    error: 'Failed to fetch audit logs',
                });
            }
        }
    }
    async getLogById(req, res) {
        try {
            const { id } = req.params;
            const log = await this.auditService.getLogById(id);
            res.json({ status: 'success', data: log });
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                    error: 'Failed to fetch audit log',
                });
            }
        }
    }
    async getEntityLogs(req, res) {
        try {
            const { entityType, entityId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const result = await this.auditService.getEntityLogs({
                entityType,
                entityId,
                page: Number(page),
                limit: Number(limit),
            });
            res.json(result);
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                    error: 'Failed to fetch entity audit logs',
                });
            }
        }
    }
}
exports.AuditController = AuditController;
