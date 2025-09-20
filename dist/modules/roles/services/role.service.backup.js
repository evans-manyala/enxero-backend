"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../../../shared/utils/AppError");
class RoleService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    async createRole(data) {
        const existingRole = await this.prisma.role.findUnique({
            where: { name: data.name },
        });
        if (existingRole) {
            throw new AppError_1.AppError('Role already exists', 400);
        }
        return this.prisma.role.create({
            data: {
                name: data.name,
                description: data.description,
                permissions: data.permissions,
            },
        });
    }
    async getRoles() {
        return this.prisma.role.findMany({
            where: { isActive: true },
        });
    }
    async getRoleById(id) {
        const role = await this.prisma.role.findUnique({
            where: { id },
        });
        if (!role) {
            throw new AppError_1.AppError('Role not found', 404);
        }
        return role;
    }
    async updateRole(id, data) {
        const role = await this.getRoleById(id);
        if (data.name && data.name !== role.name) {
            const existingRole = await this.prisma.role.findUnique({
                where: { name: data.name },
            });
            if (existingRole) {
                throw new AppError_1.AppError('Role name already exists', 400);
            }
        }
        return this.prisma.role.update({
            where: { id },
            data,
        });
    }
    async deleteRole(id) {
        const role = await this.getRoleById(id);
        // Check if role is assigned to any users
        const usersWithRole = await this.prisma.user.findFirst({
            where: { roleId: id },
        });
        if (usersWithRole) {
            throw new AppError_1.AppError('Cannot delete role that is assigned to users', 400);
        }
        return this.prisma.role.delete({
            where: { id },
        });
    }
}
exports.RoleService = RoleService;
