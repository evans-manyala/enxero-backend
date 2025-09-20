"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
const uuid_1 = require("uuid");
const tenant_scoped_service_1 = require("../../../shared/services/tenant-scoped.service");
class FormService extends tenant_scoped_service_1.TenantScopedService {
    constructor() {
        super();
    }
    async getForms(companyId, options) {
        return this.executeTenantOperation(async () => {
            const { page, limit, search, status, sortBy, sortOrder } = options;
            const skip = (page - 1) * limit;
            const where = this.createTenantWhere({
                AND: [
                    search
                        ? {
                            OR: [
                                { title: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                                { description: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                            ],
                        }
                        : {},
                    status ? { status } : {},
                ],
            }, companyId);
            const [forms, total] = await Promise.all([
                this.prisma.form.findMany({
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
                this.prisma.form.count({ where }),
            ]);
            return this.createPaginationResponse(forms, total, page, limit);
        }, 'fetching forms', companyId);
    }
    async getFormById(id, companyId) {
        return this.executeTenantOperation(async () => {
            // Validate tenant access first
            await this.validateTenantAccess('form', id, companyId, 'Form');
            const form = await this.prisma.form.findUnique({
                where: { id },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    fields: true,
                    submissions: {
                        take: 10,
                        orderBy: { submittedAt: 'desc' },
                    },
                },
            });
            if (!form) {
                throw new AppError_1.AppError('Form not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            return form;
        }, 'fetching form', companyId);
    }
    async createForm(data) {
        return this.executeTenantOperation(async () => {
            const companyId = this.requireCompanyId(data.companyId, 'creating form');
            const form = await this.prisma.form.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    title: data.title,
                    description: data.description,
                    category: data.type,
                    status: data.status,
                    isTemplate: false,
                    settings: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    companyId,
                    createdBy: data.userId,
                    fields: {
                        create: data.fields.map((field, index) => ({
                            ...field,
                            id: (0, uuid_1.v4)(),
                            order: index,
                            companyId,
                        })),
                    },
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    fields: true,
                },
            });
            return form;
        }, 'creating form');
    }
    async updateForm(id, companyId, data) {
        return this.executeTenantOperation(async () => {
            // Validate tenant access first
            await this.validateTenantAccess('form', id, companyId, 'Form');
            const { fields, ...updateData } = data;
            const form = await this.prisma.form.update({
                where: { id },
                data: updateData,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            return form;
        }, 'updating form', companyId);
    }
    async deleteForm(id, companyId) {
        return this.executeTenantOperation(async () => {
            // Validate tenant access first
            await this.validateTenantAccess('form', id, companyId, 'Form');
            await this.prisma.form.delete({
                where: { id },
            });
        }, 'deleting form', companyId);
    }
    async submitForm(id, companyId, data, userId) {
        return this.executeTenantOperation(async () => {
            const form = await this.prisma.form.findUnique({
                where: { id },
                include: {
                    fields: true,
                },
            });
            if (!form) {
                throw new AppError_1.AppError('Form not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            if (form.status !== 'published') {
                throw new AppError_1.AppError('Cannot submit to a non-published form', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Transform responses array to field name mapping if needed
            let fieldData = data;
            if (data.responses && Array.isArray(data.responses)) {
                fieldData = {};
                for (const response of data.responses) {
                    if (response.fieldName && response.value !== undefined) {
                        fieldData[response.fieldName] = response.value;
                    }
                }
            }
            // Validate required fields
            const requiredFields = form.fields.filter((field) => field.required);
            for (const field of requiredFields) {
                if (!fieldData[field.name]) {
                    throw new AppError_1.AppError(`Field ${field.label} is required`, http_status_1.HttpStatus.BAD_REQUEST);
                }
            }
            const submission = await this.prisma.formSubmission.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    formId: id,
                    submittedBy: userId,
                    submittedAt: new Date(),
                    companyId: form.companyId,
                },
            });
            return submission;
        }, 'submitting form', companyId);
    }
    async getFormSubmissions(id, options) {
        try {
            const { page, limit, search, status, sortBy, sortOrder } = options;
            const skip = (page - 1) * limit;
            const where = {
                formId: id,
            };
            const [submissions, total] = await Promise.all([
                this.prisma.formSubmission.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { submittedAt: sortOrder || 'desc' },
                }),
                this.prisma.formSubmission.count({ where }),
            ]);
            return {
                data: submissions,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getFormSubmissions service:', error);
            throw new AppError_1.AppError('Failed to fetch form submissions', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
exports.FormService = FormService;
