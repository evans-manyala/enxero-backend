"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
const tenant_scoped_service_1 = require("../../../shared/services/tenant-scoped.service");
class UserService extends tenant_scoped_service_1.TenantScopedService {
    constructor() {
        super();
    }
    async getUserById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                avatar: true,
                isActive: true,
                emailVerified: true,
                twoFactorEnabled: true,
                twoFactorSetupRequired: true,
                createdAt: true,
                updatedAt: true,
                companyId: true,
                roleId: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                        permissions: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                        identifier: true,
                    },
                },
            },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', http_status_1.HttpStatus.NOT_FOUND);
        }
        return user;
    }
    async updateUser(id, data) {
        const user = await this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                avatar: true,
                isActive: true,
                emailVerified: true,
                updatedAt: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        return user;
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                password: true,
                updatedAt: true
            },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', http_status_1.HttpStatus.NOT_FOUND);
        }
        // Verify current password
        const isPasswordValid = await (0, bcryptjs_1.compare)(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new AppError_1.AppError('Current password is incorrect', 400);
        }
        // Hash new password
        const hashedPassword = await (0, bcryptjs_1.hash)(newPassword, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                updatedAt: new Date()
            },
        });
        return { message: 'Password updated successfully' };
    }
    async updateUserStatus(userId, status, reason) {
        const isActive = status === 'active';
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                isActive,
                updatedAt: new Date()
            },
            select: {
                id: true,
                isActive: true,
                updatedAt: true,
            },
        });
        return {
            id: updatedUser.id,
            isActive: updatedUser.isActive,
            updatedAt: updatedUser.updatedAt,
        };
    }
    async getUserPasswordHistory(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                updatedAt: true
            },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', http_status_1.HttpStatus.NOT_FOUND);
        }
        return {
            userId: user.id,
            hasPasswordHistory: false,
            lastPasswordChange: user.updatedAt,
            passwordHistory: []
        };
    }
    async listUsers(options) {
        const { page, limit, search, role, status, sortBy, sortOrder } = options;
        const skip = (page - 1) * limit;
        const where = {
            AND: [
                search
                    ? {
                        OR: [
                            { username: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                            { email: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                            { firstName: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                            { lastName: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                        ],
                    }
                    : {},
                role ? { role: { name: role } } : {},
                status ? { isActive: status === 'active' } : {},
            ],
        };
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    avatar: true,
                    isActive: true,
                    emailVerified: true,
                    createdAt: true,
                    role: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            data: users,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async createUser(data) {
        try {
            const user = await this.prisma.user.create({
                data: {
                    ...data,
                    password: await (0, bcryptjs_1.hash)('defaultPassword123!', 12), // Temporary password
                    isActive: true,
                    emailVerified: false,
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    isActive: true,
                    createdAt: true,
                    role: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            return user;
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new AppError_1.AppError('User with this email or username already exists', http_status_1.HttpStatus.CONFLICT);
                }
            }
            throw error;
        }
    }
    async deleteUser(id) {
        try {
            await this.prisma.user.delete({
                where: { id },
            });
            return { message: 'User deleted successfully' };
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new AppError_1.AppError('User not found', http_status_1.HttpStatus.NOT_FOUND);
                }
            }
            throw error;
        }
    }
    async getUsersByCompany(companyId, options) {
        const { page, limit, search, role, status, sortBy, sortOrder } = options;
        const skip = (page - 1) * limit;
        const where = {
            companyId,
            AND: [
                search
                    ? {
                        OR: [
                            { username: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                            { email: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                            { firstName: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                            { lastName: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                        ],
                    }
                    : {},
                role ? { role: { name: role } } : {},
                status ? { isActive: status === 'active' } : {},
            ],
        };
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    avatar: true,
                    isActive: true,
                    emailVerified: true,
                    createdAt: true,
                    role: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            data: users,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }
}
exports.UserService = UserService;
