import { PrismaClient } from '@prisma/client';
import { AppError } from '../../../shared/utils/AppError';
import { TenantScopedService } from '../../../shared/services/tenant-scoped.service';

export class RoleService extends TenantScopedService {  constructor() {
    super();
  }

  async createRole(data: { name: string; description?: string; permissions: string[]; companyId: string }) {
    const existingRole = await this.prisma.role.findFirst({
      where: { 
        name: data.name,
        companyId: data.companyId
      },
    });

    if (existingRole) {
      throw new AppError('Role already exists in this company', 400);
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

  async getRoles(companyId?: string) {
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

  async getRoleById(id: string) {
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
      throw new AppError('Role not found', 404);
    }

    return role;
  }

  async updateRole(id: string, data: { name?: string; description?: string; permissions?: string[] }) {
    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      throw new AppError('Role not found', 404);
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
        throw new AppError('Role name already exists in this company', 400);
      }
    }

    return this.prisma.role.update({
      where: { id },
      data,
    });
  }

  async deleteRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        users: true,
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    if (role.users.length > 0) {
      throw new AppError('Cannot delete role that is assigned to users', 400);
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return { message: 'Role deleted successfully' };
  }

  async getRolesByCompany(companyId: string) {
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

  async assignRoleToUser(userId: string, roleId: string) {
    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Verify user exists and belongs to the same company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.companyId !== role.companyId) {
      throw new AppError('User and role must belong to the same company', 400);
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
