"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantScopedService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../utils/AppError");
const http_status_1 = require("../utils/http-status");
/**
 * Base service class for multi-tenant SAAS applications
 * Ensures all database operations are properly scoped to the tenant (company)
 */
class TenantScopedService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    /**
     * Validates and returns companyId, throwing error if missing
     */
    requireCompanyId(companyId, operation = 'this operation') {
        if (!companyId) {
            throw new AppError_1.AppError(`Company ID is required for ${operation}. Ensure user is authenticated and belongs to a company.`, http_status_1.HttpStatus.BAD_REQUEST);
        }
        return companyId;
    }
    /**
     * Adds companyId filter to any where clause
     */
    addCompanyFilter(where, companyId) {
        return { ...where, companyId };
    }
    /**
     * Creates a tenant-scoped where clause
     */
    createTenantWhere(baseWhere, companyId) {
        return this.addCompanyFilter(baseWhere, companyId);
    }
    /**
     * Validates that a resource belongs to the specified company
     */
    async validateTenantAccess(model, resourceId, companyId, resourceName = 'resource') {
        const resource = await this.prisma[model].findUnique({
            where: { id: resourceId },
            select: { id: true, companyId: true },
        });
        if (!resource) {
            throw new AppError_1.AppError(`${resourceName} not found`, http_status_1.HttpStatus.NOT_FOUND);
        }
        if (resource.companyId !== companyId) {
            throw new AppError_1.AppError(`Access denied: ${resourceName} does not belong to your company`, http_status_1.HttpStatus.FORBIDDEN);
        }
    }
    /**
     * Creates pagination options with tenant filtering
     */
    createTenantPagination(companyId, options) {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const skip = (page - 1) * limit;
        return {
            where: { companyId },
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
        };
    }
    /**
     * Standard pagination response format
     */
    createPaginationResponse(data, total, page, limit) {
        return {
            data,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Safely execute a tenant-scoped operation with error handling
     */
    async executeTenantOperation(operation, operationName, companyId) {
        try {
            if (companyId) {
                this.requireCompanyId(companyId, operationName);
            }
            return await operation();
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
                throw error;
            }
            // Handle Prisma errors
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new AppError_1.AppError('A record with this information already exists in your company', http_status_1.HttpStatus.CONFLICT);
                }
                if (error.code === 'P2025') {
                    throw new AppError_1.AppError('The requested resource was not found in your company', http_status_1.HttpStatus.NOT_FOUND);
                }
            }
            console.error(`Error in ${operationName}:`, error);
            throw new AppError_1.AppError(`Failed to ${operationName}`, http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Cleanup method to close Prisma connection
     */
    async cleanup() {
        await this.prisma.$disconnect();
    }
}
exports.TenantScopedService = TenantScopedService;
