"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleService = void 0;
const AppError_1 = require("../../../shared/utils/AppError");
const tenant_scoped_service_1 = require("../../../shared/services/tenant-scoped.service");
class RoleService extends tenant_scoped_service_1.TenantScopedService {
    constructor() {
        super();
    }
    async createRole(data) {
        const existingRole = await this.prisma.role.findFirst({
            where: {
                name: data.name,
                companyId: data.companyId
            },
        });
        if (existingRole) {
            throw new AppError_1.AppError('Role already exists in this company', 400);
        }
        return this.prisma.role.create({
            data: {
                name: data.name,
                description: data.description,
                permissions: data.permissions,
                companyId: data.companyId,
            },
        });
    }
    async getRoles(companyId) {
        const where = companyId ? { companyId } : {};
        return this.prisma.role.findMany({
            where,
            include: {
                users: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
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
    }
    async getRoleById(id) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
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
        if (!role) {
            throw new AppError_1.AppError('Role not found', 404);
        }
        return role;
    }
    async updateRole(id, data) {
        const existingRole = await this.prisma.role.findUnique({
            where: { id },
        });
        if (!existingRole) {
            throw new AppError_1.AppError('Role not found', 404);
        }
        // If updating name, check for conflicts within the same company
        if (data.name && data.name !== existingRole.name) {
            const conflictingRole = await this.prisma.role.findFirst({
                where: {
                    name: data.name,
                    companyId: existingRole.companyId,
                    id: { not: id }
                },
            });
            if (conflictingRole) {
                throw new AppError_1.AppError('Role name already exists in this company', 400);
            }
        }
        return this.prisma.role.update({
            where: { id },
            data,
        });
    }
    async deleteRole(id) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                users: true,
            },
        });
        if (!role) {
            throw new AppError_1.AppError('Role not found', 404);
        }
        if (role.users.length > 0) {
            throw new AppError_1.AppError('Cannot delete role that is assigned to users', 400);
        }
        await this.prisma.role.delete({
            where: { id },
        });
        return { message: 'Role deleted successfully' };
    }
    async getRolesByCompany(companyId) {
        return this.prisma.role.findMany({
            where: { companyId },
            include: {
                users: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
    }
    async assignRoleToUser(userId, roleId) {
        // Verify role exists
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
        });
        if (!role) {
            throw new AppError_1.AppError('Role not found', 404);
        }
        // Verify user exists and belongs to the same company
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new AppError_1.AppError('User not found', 404);
        }
        if (user.companyId !== role.companyId) {
            throw new AppError_1.AppError('User and role must belong to the same company', 400);
        }
        // Update user's role
        return this.prisma.user.update({
            where: { id: userId },
            data: { roleId },
            include: {
                role: true,
            },
        });
    }
}
exports.RoleService = RoleService;
