"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logTenantOperation = exports.validateTenantAccess = exports.getTenantId = exports.validateResourceTenancy = exports.validateTenant = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../utils/AppError");
const http_status_1 = require("../utils/http-status");
const prisma = new client_1.PrismaClient();
/**
 * Middleware to validate and attach tenant context to the request
 * Ensures the authenticated user's company is active and accessible
 */
const validateTenant = async (req, res, next) => {
    try {
        // Ensure user is authenticated first
        if (!req.user?.companyId) {
            throw new AppError_1.AppError('Authentication required with valid company context', http_status_1.HttpStatus.UNAUTHORIZED);
        }
        // Fetch and validate the tenant/company
        const company = await prisma.company.findUnique({
            where: { id: req.user.companyId },
            select: {
                id: true,
                name: true,
                identifier: true,
                isActive: true,
            },
        });
        if (!company) {
            throw new AppError_1.AppError('Company not found', http_status_1.HttpStatus.NOT_FOUND);
        }
        if (!company.isActive) {
            throw new AppError_1.AppError('Company account is suspended', http_status_1.HttpStatus.FORBIDDEN);
        }
        // Attach tenant context to request
        req.tenant = {
            id: company.id,
            name: company.name,
            identifier: company.identifier || '',
            isActive: company.isActive,
        };
        // Also ensure user's company context matches
        req.user.company = {
            id: company.id,
            name: company.name,
            identifier: company.identifier || '',
        };
        next();
    }
    catch (error) {
        if (error instanceof AppError_1.AppError) {
            return res.status(error.statusCode).json({
                status: 'error',
                message: error.message,
            });
        }
        return res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Failed to validate tenant context',
        });
    }
};
exports.validateTenant = validateTenant;
/**
 * Middleware to ensure resource belongs to the authenticated user's company
 * Use this for routes that access specific resources by ID
 */
const validateResourceTenancy = (resourceModel, paramName = 'id', resourceName = 'resource') => {
    return async (req, res, next) => {
        try {
            if (!req.tenant?.id) {
                throw new AppError_1.AppError('Tenant validation required', http_status_1.HttpStatus.UNAUTHORIZED);
            }
            const resourceId = req.params[paramName];
            if (!resourceId) {
                throw new AppError_1.AppError(`${resourceName} ID is required`, http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Check if resource belongs to the tenant
            const resource = await prisma[resourceModel].findUnique({
                where: { id: resourceId },
                select: { id: true, companyId: true },
            });
            if (!resource) {
                throw new AppError_1.AppError(`${resourceName} not found`, http_status_1.HttpStatus.NOT_FOUND);
            }
            if (resource.companyId !== req.tenant.id) {
                throw new AppError_1.AppError(`Access denied: ${resourceName} does not belong to your company`, http_status_1.HttpStatus.FORBIDDEN);
            }
            next();
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message,
                });
            }
            return res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                message: `Failed to validate ${resourceName} tenancy`,
            });
        }
    };
};
exports.validateResourceTenancy = validateResourceTenancy;
/**
 * Utility function to get tenant ID from request
 */
const getTenantId = (req) => {
    if (!req.tenant?.id) {
        throw new AppError_1.AppError('Tenant context is required', http_status_1.HttpStatus.BAD_REQUEST);
    }
    return req.tenant.id;
};
exports.getTenantId = getTenantId;
/**
 * Utility function to validate tenant access in services
 */
const validateTenantAccess = async (model, resourceId, tenantId, resourceName = 'resource') => {
    const resource = await prisma[model].findUnique({
        where: { id: resourceId },
        select: { id: true, companyId: true },
    });
    if (!resource) {
        throw new AppError_1.AppError(`${resourceName} not found`, http_status_1.HttpStatus.NOT_FOUND);
    }
    if (resource.companyId !== tenantId) {
        throw new AppError_1.AppError(`Access denied: ${resourceName} does not belong to your company`, http_status_1.HttpStatus.FORBIDDEN);
    }
};
exports.validateTenantAccess = validateTenantAccess;
/**
 * Middleware to log tenant-scoped operations for audit purposes
 */
const logTenantOperation = (operation) => {
    return (req, res, next) => {
        const originalSend = res.send;
        res.send = function (body) {
            // Log successful operations
            if (res.statusCode < 400 && req.tenant) {
                console.log(`[TENANT-OP] ${operation} by user ${req.user?.id} in company ${req.tenant.id}`);
            }
            return originalSend.call(this, body);
        };
        next();
    };
};
exports.logTenantOperation = logTenantOperation;
