"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const AppError_1 = require("../../../shared/utils/AppError");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
class UserService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                avatar: true,
                preferences: true,
                language: true,
                timezone: true,
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
                    },
                },
            },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        return user;
    }
    async updateProfile(userId, data) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                avatar: true,
                preferences: true,
                language: true,
                timezone: true,
            },
        });
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                password: true,
                lastPasswordChange: true
            },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        const isPasswordValid = await (0, bcryptjs_1.compare)(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new AppError_1.AppError('Current password is incorrect', 400);
        }
        // Check if new password is in password history
        const passwordHistory = [];
        for (const history of passwordHistory) {
            const isPasswordInHistory = await (0, bcryptjs_1.compare)(newPassword, history.password);
            if (isPasswordInHistory) {
                throw new AppError_1.AppError('New password cannot be the same as any of your last 5 passwords', 400);
            }
        }
        const hashedPassword = await (0, bcryptjs_1.hash)(newPassword, 10);
        // Update password history (keep last 5 passwords)
        const updatedHistory = [
            { password: hashedPassword, changedAt: new Date().toISOString() },
            ...passwordHistory.slice(0, 4)
        ];
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                updatedAt: new Date()
            },
        });
        return { message: 'Password updated successfully' };
    }
    async updateAccountStatus(userId, status, reason) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        const updateData = {
            accountStatus: status,
            isActive: status === 'active'
        };
        if (status === 'deactivated') {
            updateData.deactivatedAt = new Date();
            updateData.deactivationReason = reason;
        }
        else if (status === 'active') {
            updateData.deactivatedAt = null;
            updateData.deactivationReason = null;
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                username: true,
                deactivatedAt: true,
                deactivationReason: true,
                isActive: true
            },
        });
    }
    async getPasswordHistory(userId) {
        logger_1.default.info('getPasswordHistory service - userId received:', { userId });
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    isActive: true,
                    lastPasswordChange: true
                },
            });
            logger_1.default.info('User query result:', {
                found: !!user,
                userId: user?.id,
                email: user?.email,
                isActive: user?.isActive,
                hasPasswordHistory: !!user?.passwordHistory,
                lastPasswordChange: user?.lastPasswordChange,
                rawPasswordHistory: user?.passwordHistory
            });
            if (!user) {
                throw new AppError_1.AppError('User not found', 404);
            }
            // Safely handle password history data
            let passwordHistory = [];
            try {
                if (user.passwordHistory) {
                    logger_1.default.info('Raw password history:', user.passwordHistory);
                    const history = Array.isArray(user.passwordHistory)
                        ? user.passwordHistory
                        : JSON.parse(user.passwordHistory);
                    logger_1.default.info('Parsed password history:', history);
                    passwordHistory = history.map((entry) => ({
                        changedAt: entry.changedAt
                    }));
                    logger_1.default.info('Final password history:', passwordHistory);
                }
            }
            catch (error) {
                logger_1.default.error('Error parsing password history:', error);
                passwordHistory = [];
            }
            return {
                passwordHistory,
                lastPasswordChange: user.lastPasswordChange
            };
        }
        catch (error) {
            logger_1.default.error('Error in getPasswordHistory:', error);
            throw error;
        }
    }
    async getUsers(params = {}) {
        const { page = 1, limit = 10, search, roleId, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = params;
        const skip = (page - 1) * limit;
        // Build where clause
        const where = {};
        // Add search condition if search term is provided
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }
        // Add role filter if roleId is provided
        if (roleId) {
            where.roleId = roleId;
        }
        // Add active status filter if isActive is provided
        if (typeof isActive === 'boolean') {
            where.isActive = isActive;
        }
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                    createdAt: true,
                    role: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: {
                    [sortBy]: sortOrder,
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
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getUserById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                avatar: true,
                isActive: true,
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
                    },
                },
            },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        return user;
    }
    async updateUser(id, data) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        if (data.roleId) {
            const role = await this.prisma.role.findUnique({
                where: { id: data.roleId },
            });
            if (!role) {
                throw new AppError_1.AppError('Role not found', 404);
            }
        }
        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                isActive: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    async toggleUserActiveStatus(userId, newIsActiveStatus) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, isActive: true, accountStatus: true, deactivatedAt: true, deactivationReason: true },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        if (user.isActive === newIsActiveStatus) {
            // No change needed, return current status
            return {
                id: user.id,
                isActive: user.isActive,
                accountStatus: user.accountStatus,
                message: `User is already ${newIsActiveStatus ? 'active' : 'inactive'}`
            };
        }
        const newAccountStatus = newIsActiveStatus ? 'active' : 'deactivated';
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                isActive: newIsActiveStatus,
                accountStatus: newAccountStatus,
                // Clear deactivation reasons if reactivating
                deactivatedAt: newIsActiveStatus ? null : user.deactivatedAt,
                deactivationReason: newIsActiveStatus ? null : user.deactivationReason,
            },
            select: {
                id: true,
                email: true,
                username: true,
                isActive: true,
                deactivatedAt: true,
                deactivationReason: true,
            },
        });
        return {
            id: updatedUser.id,
            isActive: updatedUser.isActive,
            accountStatus: updatedUser.accountStatus,
            message: `User account has been ${newIsActiveStatus ? 'activated' : 'deactivated'}.`
        };
    }
}
exports.UserService = UserService;
