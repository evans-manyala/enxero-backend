"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationController = void 0;
const integration_service_1 = require("../services/integration.service");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
class IntegrationController {
    constructor() {
        this.getIntegrations = async (req, res) => {
            try {
                const { page = 1, limit = 10, search, type, status, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
                const result = await this.service.getIntegrations({
                    page: Number(page),
                    limit: Number(limit),
                    search: search,
                    type: type,
                    status: status,
                    sortBy: sortBy,
                    sortOrder: sortOrder,
                });
                res.status(http_status_1.HttpStatus.OK).json({ status: 'success', data: result.data, meta: result.meta });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res
                        .status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ message: 'Internal server error' });
                }
            }
        };
        this.getIntegrationById = async (req, res) => {
            try {
                const { id } = req.params;
                const integration = await this.service.getIntegrationById(id);
                res.status(http_status_1.HttpStatus.OK).json({ status: 'success', data: integration });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res
                        .status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ message: 'Internal server error' });
                }
            }
        };
        this.createIntegration = async (req, res) => {
            try {
                const companyId = this.getCompanyId(req);
                const integration = await this.service.createIntegration({
                    ...req.body,
                    companyId,
                });
                res.status(http_status_1.HttpStatus.CREATED).json({ status: 'success', data: integration });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res
                        .status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ message: 'Internal server error' });
                }
            }
        };
        this.updateIntegration = async (req, res) => {
            try {
                const { id } = req.params;
                const integration = await this.service.updateIntegration(id, req.body);
                res.status(http_status_1.HttpStatus.OK).json({ status: 'success', data: integration });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res
                        .status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ message: 'Internal server error' });
                }
            }
        };
        this.deleteIntegration = async (req, res) => {
            try {
                const { id } = req.params;
                await this.service.deleteIntegration(id);
                res.status(http_status_1.HttpStatus.NO_CONTENT).send();
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res
                        .status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ message: 'Internal server error' });
                }
            }
        };
        this.getIntegrationLogs = async (req, res) => {
            try {
                const { id } = req.params;
                const { page = 1, limit = 10, search, type, status, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
                const result = await this.service.getIntegrationLogs(id, {
                    page: Number(page),
                    limit: Number(limit),
                    search: search,
                    type: type,
                    status: status,
                    sortBy: sortBy,
                    sortOrder: sortOrder,
                });
                res.status(http_status_1.HttpStatus.OK).json({ status: 'success', data: result.data, meta: result.meta });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res
                        .status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ message: 'Internal server error' });
                }
            }
        };
        this.service = new integration_service_1.IntegrationService();
    }
    getCompanyId(req) {
        if (!req.user?.companyId) {
            throw new AppError_1.AppError('Company ID is required', 400);
        }
        return req.user.companyId;
    }
}
exports.IntegrationController = IntegrationController;
