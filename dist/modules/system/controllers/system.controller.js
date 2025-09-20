"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemController = void 0;
const system_service_1 = require("../services/system.service");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
class SystemController {
    constructor() {
        this.systemService = new system_service_1.SystemService();
    }
    async getConfigs(req, res) {
        try {
            const { page = 1, limit = 10, search, isActive } = req.query;
            const result = await this.systemService.getConfigs({
                page: Number(page),
                limit: Number(limit),
                search: search,
                isActive: isActive === 'true',
            });
            res.json({ status: 'success', data: result.data, meta: result.meta });
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                    error: 'Failed to fetch system configurations',
                });
            }
        }
    }
    async getConfigByKey(req, res) {
        try {
            const { key } = req.params;
            const config = await this.systemService.getConfigByKey(key);
            res.json({ status: 'success', data: config });
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                    error: 'Failed to fetch system configuration',
                });
            }
        }
    }
    async createConfig(req, res) {
        try {
            const { key, value, description } = req.body;
            const config = await this.systemService.createConfig({
                key,
                value,
                description,
            });
            res.status(http_status_1.HttpStatus.CREATED).json({ status: 'success', data: config });
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                    error: 'Failed to create system configuration',
                });
            }
        }
    }
    async updateConfig(req, res) {
        try {
            const { key } = req.params;
            const { value, description, isActive } = req.body;
            const config = await this.systemService.updateConfig(key, {
                value,
                description,
                isActive,
            });
            res.json({ status: 'success', data: config });
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                    error: 'Failed to update system configuration',
                });
            }
        }
    }
    async getLogs(req, res) {
        try {
            const { page = 1, limit = 10, level } = req.query;
            const result = await this.systemService.getLogs({
                page: Number(page),
                limit: Number(limit),
                level: level,
            });
            res.json({ status: 'success', data: result.data, meta: result.meta });
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
                res.status(error.statusCode).json({ error: error.message });
            }
            else {
                res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                    error: 'Failed to fetch system logs',
                });
            }
        }
    }
}
exports.SystemController = SystemController;
