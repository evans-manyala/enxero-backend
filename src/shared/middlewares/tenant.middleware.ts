import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../utils/http-status';
import { AuthRequest } from './auth.middleware';

const prisma = new PrismaClient();

/**
 * Tenant-aware middleware that ensures proper multi-tenant data isolation
 * This middleware should be used after authentication middleware
 */

export interface TenantRequest extends AuthRequest {
  tenant?: {
    id: string;
    name: string;
    identifier: string;
    isActive: boolean;
  };
}

/**
 * Middleware to validate and attach tenant context to the request
 * Ensures the authenticated user's company is active and accessible
 */
export const validateTenant = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    // Ensure user is authenticated first
    if (!req.user?.companyId) {
      throw new AppError('Authentication required with valid company context', HttpStatus.UNAUTHORIZED);
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
      throw new AppError('Company not found', HttpStatus.NOT_FOUND);
    }

    if (!company.isActive) {
      throw new AppError('Company account is suspended', HttpStatus.FORBIDDEN);
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
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    }
    
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to validate tenant context',
    });
  }
};

/**
 * Middleware to ensure resource belongs to the authenticated user's company
 * Use this for routes that access specific resources by ID
 */
export const validateResourceTenancy = (
  resourceModel: string,
  paramName: string = 'id',
  resourceName: string = 'resource'
) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant?.id) {
        throw new AppError('Tenant validation required', HttpStatus.UNAUTHORIZED);
      }

      const resourceId = req.params[paramName];
      if (!resourceId) {
        throw new AppError(`${resourceName} ID is required`, HttpStatus.BAD_REQUEST);
      }

      // Check if resource belongs to the tenant
      const resource = await (prisma as any)[resourceModel].findUnique({
        where: { id: resourceId },
        select: { id: true, companyId: true },
      });

      if (!resource) {
        throw new AppError(`${resourceName} not found`, HttpStatus.NOT_FOUND);
      }

      if (resource.companyId !== req.tenant.id) {
        throw new AppError(
          `Access denied: ${resourceName} does not belong to your company`,
          HttpStatus.FORBIDDEN
        );
      }

      next();
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
        });
      }
      
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: `Failed to validate ${resourceName} tenancy`,
      });
    }
  };
};

/**
 * Utility function to get tenant ID from request
 */
export const getTenantId = (req: TenantRequest): string => {
  if (!req.tenant?.id) {
    throw new AppError('Tenant context is required', HttpStatus.BAD_REQUEST);
  }
  return req.tenant.id;
};

/**
 * Utility function to validate tenant access in services
 */
export const validateTenantAccess = async (
  model: string,
  resourceId: string,
  tenantId: string,
  resourceName: string = 'resource'
): Promise<void> => {
  const resource = await (prisma as any)[model].findUnique({
    where: { id: resourceId },
    select: { id: true, companyId: true },
  });

  if (!resource) {
    throw new AppError(`${resourceName} not found`, HttpStatus.NOT_FOUND);
  }

  if (resource.companyId !== tenantId) {
    throw new AppError(
      `Access denied: ${resourceName} does not belong to your company`,
      HttpStatus.FORBIDDEN
    );
  }
};

/**
 * Middleware to log tenant-scoped operations for audit purposes
 */
export const logTenantOperation = (operation: string) => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(body: any) {
      // Log successful operations
      if (res.statusCode < 400 && req.tenant) {
        console.log(`[TENANT-OP] ${operation} by user ${req.user?.id} in company ${req.tenant.id}`);
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
};
