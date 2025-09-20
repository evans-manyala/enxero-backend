"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const AppError_1 = require("../utils/AppError");
const environment_1 = __importDefault(require("../../config/environment"));
const prisma = new client_1.PrismaClient();
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new AppError_1.AppError('No token provided', 401);
        }
        const token = authHeader.split(' ')[1];
        // Support both old and new token formats
        const decoded = jsonwebtoken_1.default.verify(token, environment_1.default.JWT_SECRET);
        // Handle old token format
        if (decoded.type === 'access') {
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    roleId: true,
                    companyId: true,
                    email: true,
                    isActive: true,
                    role: {
                        select: {
                            name: true,
                            permissions: true,
                        },
                    },
                },
            });
            if (!user || !user.isActive || !user.role) {
                throw new AppError_1.AppError('User not found or inactive', 401);
            }
            req.user = {
                id: user.id,
                roleId: user.roleId,
                companyId: user.companyId,
                email: user.email,
                role: {
                    name: user.role.name,
                    permissions: user.role.permissions,
                },
            };
            return next();
        }
        // Handle new token format
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                roleId: true,
                companyId: true,
                isActive: true,
                role: {
                    select: {
                        name: true,
                        permissions: true,
                    },
                },
            },
        });
        if (!user || !user.isActive || !user.role) {
            throw new AppError_1.AppError('User not found or inactive', 401);
        }
        req.user = {
            id: user.id,
            roleId: user.roleId,
            companyId: user.companyId,
            email: user.email,
            role: {
                name: user.role.name,
                permissions: user.role.permissions,
            },
        };
        next();
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            next(new AppError_1.AppError('Invalid token', 401));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
const authorize = (...permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user?.roleId) {
                throw new AppError_1.AppError('User not authenticated', 401);
            }
            // Get user's role and permissions
            const role = await prisma.role.findUnique({
                where: { id: req.user.roleId },
                select: { permissions: true },
            });
            if (!role) {
                throw new AppError_1.AppError('Role not found', 401);
            }
            // Check if user has required permissions
            const hasPermission = permissions.every((permission) => role.permissions.includes(permission));
            if (!hasPermission) {
                throw new AppError_1.AppError('Insufficient permissions', 403);
            }
            next();
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
                next(error);
            }
            else {
                next(new AppError_1.AppError('Authorization failed', 403));
            }
        }
    };
};
exports.authorize = authorize;
