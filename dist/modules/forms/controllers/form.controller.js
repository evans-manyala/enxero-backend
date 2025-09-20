"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormController = void 0;
const form_service_1 = require("../services/form.service");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
class FormController {
    constructor() {
        this.getForms = async (req, res) => {
            try {
                const companyId = this.getCompanyId(req);
                const { page = 1, limit = 10, search, type, status, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
                const result = await this.service.getForms(companyId, {
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
        this.getFormById = async (req, res) => {
            try {
                const companyId = this.getCompanyId(req);
                const { id } = req.params;
                const form = await this.service.getFormById(id, companyId);
                res.status(http_status_1.HttpStatus.OK).json({ status: 'success', data: form });
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
        this.createForm = async (req, res) => {
            try {
                const companyId = this.getCompanyId(req);
                if (!req.user || !req.user.id) {
                    throw new AppError_1.AppError('Unauthorized: user not found', http_status_1.HttpStatus.UNAUTHORIZED);
                }
                const form = await this.service.createForm({
                    ...req.body,
                    companyId,
                    userId: req.user.id,
                });
                res.status(http_status_1.HttpStatus.CREATED).json({ status: 'success', data: form });
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
        this.updateForm = async (req, res) => {
            try {
                const companyId = this.getCompanyId(req);
                const { id } = req.params;
                const form = await this.service.updateForm(id, companyId, req.body);
                res.status(http_status_1.HttpStatus.OK).json({ status: 'success', data: form });
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
        this.deleteForm = async (req, res) => {
            try {
                const companyId = this.getCompanyId(req);
                const { id } = req.params;
                await this.service.deleteForm(id, companyId);
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
        this.submitForm = async (req, res) => {
            try {
                const companyId = this.getCompanyId(req);
                const { id } = req.params;
                if (!req.user || !req.user.id) {
                    throw new AppError_1.AppError('Unauthorized: user not found', http_status_1.HttpStatus.UNAUTHORIZED);
                }
                const submission = await this.service.submitForm(id, companyId, req.body, req.user.id);
                res.status(http_status_1.HttpStatus.CREATED).json({ status: 'success', data: submission });
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
        this.getFormSubmissions = async (req, res) => {
            try {
                const { id } = req.params;
                const { page = 1, limit = 10, search, type, status, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
                const result = await this.service.getFormSubmissions(id, {
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
        this.service = new form_service_1.FormService();
    }
    getCompanyId(req) {
        if (!req.user?.companyId) {
            throw new AppError_1.AppError('Company ID is required', 400);
        }
        return req.user.companyId;
    }
}
exports.FormController = FormController;
