"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../../../shared/utils/AppError");
const tenant_scoped_service_1 = require("../../../shared/services/tenant-scoped.service");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
class EmployeeService extends tenant_scoped_service_1.TenantScopedService {
    constructor() {
        super();
    }
    async getEmployees(options) {
        try {
            const { page, limit, search, department, position, status, sortBy, sortOrder } = options;
            const skip = (page - 1) * limit;
            const where = {
                AND: [
                    search
                        ? {
                            OR: [
                                {
                                    firstName: {
                                        contains: search,
                                        mode: client_1.Prisma.QueryMode.insensitive,
                                    },
                                },
                                {
                                    lastName: {
                                        contains: search,
                                        mode: client_1.Prisma.QueryMode.insensitive,
                                    },
                                },
                                {
                                    email: {
                                        contains: search,
                                        mode: client_1.Prisma.QueryMode.insensitive,
                                    },
                                },
                            ],
                        }
                        : {},
                    department ? { department } : {},
                    position ? { position } : {},
                    status ? { status } : {},
                ],
            };
            const orderBy = sortBy
                ? { [sortBy]: sortOrder || 'asc' }
                : { createdAt: 'desc' };
            const [employees, total] = await Promise.all([
                this.prisma.employee.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy,
                    include: {
                        manager: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                position: true,
                            },
                        },
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                                role: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                }),
                this.prisma.employee.count({ where }),
            ]);
            return {
                data: employees,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getEmployees service:', error);
            throw new AppError_1.AppError('Failed to fetch employees', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getEmployeeById(id) {
        try {
            const employee = await this.prisma.employee.findUnique({
                where: { id },
                include: {
                    manager: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            position: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            role: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    directReports: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            position: true,
                        },
                    },
                },
            });
            if (!employee) {
                throw new AppError_1.AppError('Employee not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            return employee;
        }
        catch (error) {
            logger_1.default.error('Error in getEmployeeById service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to fetch employee', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async createEmployee(data) {
        try {
            const { managerId, companyId, ...employeeData } = data;
            const employee = await this.prisma.employee.create({
                data: {
                    ...employeeData,
                    emergencyContact: data.emergencyContact || {},
                    address: data.address || {},
                    bankDetails: data.bankDetails || {},
                    taxInfo: data.taxInfo || {},
                    benefits: data.benefits || {},
                    manager: managerId ? {
                        connect: { id: managerId }
                    } : undefined,
                    company: {
                        connect: { id: companyId }
                    }
                },
                include: {
                    manager: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            position: true,
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
            return employee;
        }
        catch (error) {
            logger_1.default.error('Error in createEmployee service:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new AppError_1.AppError('Employee with this email or employee ID already exists', http_status_1.HttpStatus.CONFLICT);
                }
                if (error.code === 'P2025') {
                    throw new AppError_1.AppError('Company or manager not found', http_status_1.HttpStatus.NOT_FOUND);
                }
            }
            throw new AppError_1.AppError('Failed to create employee', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateEmployee(id, data) {
        try {
            const employee = await this.prisma.employee.update({
                where: { id },
                data: {
                    ...data,
                    emergencyContact: data.emergencyContact
                        ? { ...data.emergencyContact }
                        : undefined,
                    address: data.address ? { ...data.address } : undefined,
                    bankDetails: data.bankDetails ? { ...data.bankDetails } : undefined,
                    taxInfo: data.taxInfo ? { ...data.taxInfo } : undefined,
                    benefits: data.benefits ? { ...data.benefits } : undefined,
                },
                include: {
                    manager: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            position: true,
                        },
                    },
                },
            });
            return employee;
        }
        catch (error) {
            logger_1.default.error('Error in updateEmployee service:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new AppError_1.AppError('Employee not found', http_status_1.HttpStatus.NOT_FOUND);
                }
                if (error.code === 'P2002') {
                    throw new AppError_1.AppError('Employee with this email or employee ID already exists', http_status_1.HttpStatus.CONFLICT);
                }
            }
            throw new AppError_1.AppError('Failed to update employee', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getEmployeeManager(id) {
        try {
            const employee = await this.prisma.employee.findUnique({
                where: { id },
                include: {
                    manager: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            position: true,
                            department: true,
                        },
                    },
                },
            });
            if (!employee) {
                throw new AppError_1.AppError('Employee not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            if (!employee.manager) {
                throw new AppError_1.AppError('Employee has no manager', http_status_1.HttpStatus.NOT_FOUND);
            }
            return employee.manager;
        }
        catch (error) {
            logger_1.default.error('Error in getEmployeeManager service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to fetch employee manager', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getEmployeeDirectReports(id) {
        try {
            const employee = await this.prisma.employee.findUnique({
                where: { id },
                include: {
                    directReports: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            position: true,
                            department: true,
                        },
                    },
                },
            });
            if (!employee) {
                throw new AppError_1.AppError('Employee not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            return employee.directReports;
        }
        catch (error) {
            logger_1.default.error('Error in getEmployeeDirectReports service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to fetch employee direct reports', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
exports.EmployeeService = EmployeeService;
