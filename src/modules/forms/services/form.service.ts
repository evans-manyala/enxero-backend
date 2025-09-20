import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../../../shared/utils/AppError';
import { HttpStatus } from '../../../shared/utils/http-status';
import logger from '../../../shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { TenantScopedService } from '../../../shared/services/tenant-scoped.service';

interface GetFormsOptions {
  page: number;
  limit: number;
  search?: string;
  type?: string;
  status?: 'draft' | 'published' | 'archived';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateFormData {
  title: string;
  description?: string;
  type: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    validation?: Record<string, any>;
  }>;
  status: 'draft' | 'published' | 'archived';
  companyId: string;
  userId: string;
}

interface UpdateFormData {
  title?: string;
  description?: string;
  type?: string;
  fields?: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    validation?: Record<string, any>;
  }>;
  status?: 'draft' | 'published' | 'archived';
}

export class FormService extends TenantScopedService {
  constructor() {
    super();
  }

  public async getForms(companyId: string, options: GetFormsOptions) {
    return this.executeTenantOperation(async () => {
      const { page, limit, search, status, sortBy, sortOrder } = options;
      const skip = (page - 1) * limit;

      const where: Prisma.FormWhereInput = this.createTenantWhere({
        AND: [
          search
            ? {
                OR: [
                  { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
                  { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
                ],
              }
            : {},
          status ? { status } : {},
        ],
      }, companyId);

      const [forms, total] = await Promise.all([
        this.prisma.form.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
          include: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.form.count({ where }),
      ]);

      return this.createPaginationResponse(forms, total, page, limit);
    }, 'fetching forms', companyId);
  }

  public async getFormById(id: string, companyId: string) {
    return this.executeTenantOperation(async () => {
      // Validate tenant access first
      await this.validateTenantAccess('form', id, companyId, 'Form');
      
      const form = await this.prisma.form.findUnique({
        where: { id },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          fields: true,
          submissions: {
            take: 10,
            orderBy: { submittedAt: 'desc' },
          },
        },
      });

      if (!form) {
        throw new AppError('Form not found', HttpStatus.NOT_FOUND);
      }

      return form;
    }, 'fetching form', companyId);
  }

  public async createForm(data: CreateFormData) {
    return this.executeTenantOperation(async () => {
      const companyId = this.requireCompanyId(data.companyId, 'creating form');
      const form = await this.prisma.form.create({
        data: {
          id: uuidv4(),
          title: data.title,
          description: data.description,
          category: data.type,
          status: data.status,
          isTemplate: false,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          companyId,
          createdBy: data.userId,
          fields: {
            create: data.fields.map((field, index) => ({
              ...field,
              id: uuidv4(),
              order: index,
              companyId,
            })),
          },
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          fields: true,
        },
      });
      return form;
    }, 'creating form');
  }

  public async updateForm(id: string, companyId: string, data: UpdateFormData) {
    return this.executeTenantOperation(async () => {
      // Validate tenant access first
      await this.validateTenantAccess('form', id, companyId, 'Form');
      const { fields, ...updateData } = data;
      const form = await this.prisma.form.update({
        where: { id },
        data: updateData,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return form;
    }, 'updating form', companyId);
  }

  public async deleteForm(id: string, companyId: string) {
    return this.executeTenantOperation(async () => {
      // Validate tenant access first
      await this.validateTenantAccess('form', id, companyId, 'Form');
      
      await this.prisma.form.delete({
        where: { id },
      });
    }, 'deleting form', companyId);
  }

  public async submitForm(id: string, companyId: string, data: Record<string, any>, userId: string) {
    return this.executeTenantOperation(async () => {
      const form = await this.prisma.form.findUnique({
        where: { id },
        include: {
          fields: true,
        },
      });

      if (!form) {
        throw new AppError('Form not found', HttpStatus.NOT_FOUND);
      }

      if (form.status !== 'published') {
        throw new AppError(
          'Cannot submit to a non-published form',
          HttpStatus.BAD_REQUEST
        );
      }

      // Transform responses array to field name mapping if needed
      let fieldData: Record<string, any> = data;
      if (data.responses && Array.isArray(data.responses)) {
        fieldData = {};
        for (const response of data.responses) {
          if (response.fieldName && response.value !== undefined) {
            fieldData[response.fieldName] = response.value;
          }
        }
      }

      // Validate required fields
      const requiredFields = form.fields.filter((field: any) => field.required);
      for (const field of requiredFields) {
        if (!fieldData[field.name]) {
          throw new AppError(
            `Field ${field.label} is required`,
            HttpStatus.BAD_REQUEST
          );
        }
      }

      const submission = await this.prisma.formSubmission.create({
        data: {
          id: uuidv4(),
          formId: id,
          submittedBy: userId,
          submittedAt: new Date(),
          companyId: form.companyId,
        },
      });

      return submission;
    }, 'submitting form', companyId);
  }

  public async getFormSubmissions(id: string, options: GetFormsOptions) {
    try {
      const { page, limit, search, status, sortBy, sortOrder } = options;
      const skip = (page - 1) * limit;

      const where: Prisma.FormSubmissionWhereInput = {
        formId: id,
      };

      const [submissions, total] = await Promise.all([
        this.prisma.formSubmission.findMany({
          where,
          skip,
          take: limit,
          orderBy: { submittedAt: sortOrder || 'desc' },
        }),
        this.prisma.formSubmission.count({ where }),
      ]);

      return {
        data: submissions,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getFormSubmissions service:', error);
      throw new AppError(
        'Failed to fetch form submissions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 