import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../../../shared/utils/AppError';
import { TenantScopedService } from '../../../shared/services/tenant-scoped.service';
import { HttpStatus } from '../../../shared/utils/http-status';
import logger from '../../../shared/utils/logger';

interface GetLogsOptions {
  page: number;
  limit: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface GetEntityLogsOptions {
  entityType: string;
  entityId: string;
  page: number;
  limit: number;
}

export class AuditService extends TenantScopedService {  constructor() {
    super();
  }

  public async getLogs(options: GetLogsOptions) {
    try {
      const { page, limit, action, entityType, entityId, userId, startDate, endDate } = options;
      const skip = (page - 1) * limit;

      const where: Prisma.AuditLogWhereInput = {
        AND: [
          action ? { action } : {},
          entityType ? { tableName: entityType } : {},
          entityId ? { recordId: entityId } : {},
          userId ? { userId } : {},
          startDate ? { createdAt: { gte: startDate } } : {},
          endDate ? { createdAt: { lte: endDate } } : {},
        ],
      };

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return {
        data: logs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getLogs service:', error);
      throw new AppError(
        'Failed to fetch audit logs',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getLogById(id: string) {
    try {
      const log = await this.prisma.auditLog.findUnique({
        where: { id },
      });

      if (!log) {
        throw new AppError('Audit log not found', HttpStatus.NOT_FOUND);
      }

      return log;
    } catch (error) {
      logger.error('Error in getLogById service:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to fetch audit log',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getEntityLogs(options: GetEntityLogsOptions) {
    try {
      const { entityType, entityId, page, limit } = options;
      const skip = (page - 1) * limit;

      const where: Prisma.AuditLogWhereInput = {
        tableName: entityType,
        recordId: entityId,
      };

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return {
        data: logs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getEntityLogs service:', error);
      throw new AppError(
        'Failed to fetch entity audit logs',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 