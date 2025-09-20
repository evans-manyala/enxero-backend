import { PrismaClient, Prisma } from '@prisma/client';
import { hash, compare } from 'bcryptjs';
import { AppError } from '../../../shared/utils/AppError';
import { HttpStatus } from '../../../shared/utils/http-status';
import logger from '../../../shared/utils/logger';
import { TenantScopedService } from '../../../shared/services/tenant-scoped.service';

export interface CreateUserDto {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatar?: string;
  roleId?: string;
  companyId: string;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatar?: string;
  roleId?: string;
}

export interface ListUsersOptions {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class UserService extends TenantScopedService {
  constructor() {
    super();
  }

  public async getUserById(id: string) {
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
      throw new AppError('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  public async updateUser(id: string, data: UpdateUserDto) {
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

  public async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        updatedAt: true
      },
    });

    if (!user) {
      throw new AppError('User not found', HttpStatus.NOT_FOUND);
    }

    // Verify current password
    const isPasswordValid = await compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
      },
    });

    return { message: 'Password updated successfully' };
  }

  public async updateUserStatus(userId: string, status: string, reason?: string) {
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

  public async getUserPasswordHistory(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        updatedAt: true
      },
    });

    if (!user) {
      throw new AppError('User not found', HttpStatus.NOT_FOUND);
    }

    return {
      userId: user.id,
      hasPasswordHistory: false,
      lastPasswordChange: user.updatedAt,
      passwordHistory: []
    };
  }

  public async listUsers(options: ListUsersOptions) {
    const { page, limit, search, role, status, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { username: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
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

  public async createUser(data: CreateUserDto) {
    try {
      const user = await this.prisma.user.create({
        data: {
          ...data,
          password: await hash('defaultPassword123!', 12), // Temporary password
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError('User with this email or username already exists', HttpStatus.CONFLICT);
        }
      }
      throw error;
    }
  }

  public async deleteUser(id: string) {
    try {
      await this.prisma.user.delete({
        where: { id },
      });

      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }
      }
      throw error;
    }
  }

  public async getUsersByCompany(companyId: string, options: ListUsersOptions) {
    const { page, limit, search, role, status, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      companyId,
      AND: [
        search
          ? {
              OR: [
                { username: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
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
