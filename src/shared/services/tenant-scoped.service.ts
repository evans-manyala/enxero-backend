import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../utils/http-status';

/**
 * Base service class for multi-tenant SAAS applications
 * Ensures all database operations are properly scoped to the tenant (company)
 */
export abstract class TenantScopedService {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Validates and returns companyId, throwing error if missing
   */
  protected requireCompanyId(companyId?: string, operation: string = 'this operation'): string {
    if (!companyId) {
      throw new AppError(
        `Company ID is required for ${operation}. Ensure user is authenticated and belongs to a company.`,
        HttpStatus.BAD_REQUEST
      );
    }
    return companyId;
  }

  /**
   * Adds companyId filter to any where clause
   */
  protected addCompanyFilter<T>(where: T, companyId: string): T & { companyId: string } {
    return { ...where, companyId };
  }

  /**
   * Creates a tenant-scoped where clause
   */
  protected createTenantWhere<T>(baseWhere: T, companyId: string): T & { companyId: string } {
    return this.addCompanyFilter(baseWhere, companyId);
  }

  /**
   * Validates that a resource belongs to the specified company
   */
  protected async validateTenantAccess(
    model: string,
    resourceId: string,
    companyId: string,
    resourceName: string = 'resource'
  ): Promise<void> {
    const resource = await (this.prisma as any)[model].findUnique({
      where: { id: resourceId },
      select: { id: true, companyId: true },
    });

    if (!resource) {
      throw new AppError(`${resourceName} not found`, HttpStatus.NOT_FOUND);
    }

    if (resource.companyId !== companyId) {
      throw new AppError(
        `Access denied: ${resourceName} does not belong to your company`,
        HttpStatus.FORBIDDEN
      );
    }
  }

  /**
   * Creates pagination options with tenant filtering
   */
  protected createTenantPagination(
    companyId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
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
  protected createPaginationResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ) {
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
  protected async executeTenantOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    companyId?: string
  ): Promise<T> {
    try {
      if (companyId) {
        this.requireCompanyId(companyId, operationName);
      }
      return await operation();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError('A record with this information already exists in your company', HttpStatus.CONFLICT);
        }
        if (error.code === 'P2025') {
          throw new AppError('The requested resource was not found in your company', HttpStatus.NOT_FOUND);
        }
      }

      console.error(`Error in ${operationName}:`, error);
      throw new AppError(`Failed to ${operationName}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Cleanup method to close Prisma connection
   */
  protected async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

/**
 * Utility type for tenant-scoped create operations
 */
export type TenantScopedCreate<T> = T & { companyId: string };

/**
 * Utility type for tenant-scoped update operations
 */
export type TenantScopedUpdate<T> = T & { companyId?: string };

/**
 * Utility type for tenant-scoped where clauses
 */
export type TenantScopedWhere<T> = T & { companyId: string };
