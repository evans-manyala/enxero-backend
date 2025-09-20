"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollService = void 0;
const AppError_1 = require("../../../shared/utils/AppError");
const tenant_scoped_service_1 = require("../../../shared/services/tenant-scoped.service");
class PayrollService extends tenant_scoped_service_1.TenantScopedService {
    constructor() {
        super();
    }
    async getPayrollConfig(companyId) {
        const config = await this.prisma.payrollConfig.findFirst({
            where: { companyId },
        });
        return config;
    }
    async getPayrollPeriod(companyId, periodId) {
        const period = await this.prisma.payrollPeriod.findFirst({
            where: {
                companyId,
                id: periodId,
            },
            include: {
                records: {
                    include: {
                        employee: true,
                    },
                },
            },
        });
        return period;
    }
    async getEmployeePayroll(employeeId, periodId) {
        const payroll = await this.prisma.payrollRecord.findFirst({
            where: {
                employeeId,
                period: { id: periodId },
            },
        });
        return payroll;
    }
    async updatePayrollConfig(id, data) {
        const config = await this.prisma.payrollConfig.update({
            where: { id },
            data: data,
        });
        return config;
    }
    async processPayroll(periodId, companyId) {
        const period = await this.prisma.payrollPeriod.findFirst({
            where: { id: periodId, companyId },
            include: {
                records: true,
            },
        });
        if (!period) {
            throw new AppError_1.AppError('Payroll period not found', 404);
        }
        if (period.status !== 'DRAFT') {
            throw new AppError_1.AppError('Payroll period is not in draft status', 400);
        }
        // Calculate totals and update records
        await Promise.all(period.records.map(async (record) => {
            const total = Number(record.grossSalary) - Number(record.totalDeductions);
            return this.prisma.payrollRecord.update({
                where: { id: record.id },
                data: {
                    netSalary: total,
                    status: 'PROCESSED',
                    processedAt: new Date(),
                },
            });
        }));
        // Update period status
        const updatedPeriod = await this.prisma.payrollPeriod.update({
            where: { id: periodId },
            data: {
                status: 'PROCESSED',
            },
            include: {
                records: true,
            },
        });
        return updatedPeriod;
    }
    async createPayrollConfig(data) {
        const config = await this.prisma.payrollConfig.create({
            data: data,
        });
        return config;
    }
    async listPayrollPeriods(companyId, options) {
        const { page, limit, ...filters } = options;
        const skip = (page - 1) * limit;
        const [periods, total] = await Promise.all([
            this.prisma.payrollPeriod.findMany({
                where: { companyId, ...filters },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    records: true,
                },
            }),
            this.prisma.payrollPeriod.count({
                where: { companyId, ...filters },
            }),
        ]);
        return {
            data: periods,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async createPayrollPeriod(data) {
        const period = await this.prisma.payrollPeriod.create({
            data: data,
            include: {
                records: true,
            },
        });
        return period;
    }
    async listPayrollRecords(companyId, options) {
        const { page, limit, ...filters } = options;
        const skip = (page - 1) * limit;
        const [records, total] = await Promise.all([
            this.prisma.payrollRecord.findMany({
                where: { companyId, ...filters },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    employee: true,
                    period: {
                        select: {
                            id: true,
                            startDate: true,
                            endDate: true,
                            status: true,
                        },
                    },
                },
            }),
            this.prisma.payrollRecord.count({
                where: { companyId, ...filters },
            }),
        ]);
        return {
            data: records,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getPayrollRecord(id, companyId) {
        const record = await this.prisma.payrollRecord.findFirst({
            where: { id, companyId },
            include: {
                employee: true,
                period: {
                    select: {
                        id: true,
                        startDate: true,
                        endDate: true,
                        status: true,
                    },
                },
            },
        });
        return record;
    }
    async createPayrollRecord(data) {
        const record = await this.prisma.payrollRecord.create({
            data: data,
            include: {
                employee: true,
                period: {
                    select: {
                        id: true,
                        startDate: true,
                        endDate: true,
                        status: true,
                    },
                },
            },
        });
        return record;
    }
    async updatePayrollRecord(id, data) {
        const record = await this.prisma.payrollRecord.update({
            where: { id },
            data: data,
            include: {
                employee: true,
                period: {
                    select: {
                        id: true,
                        startDate: true,
                        endDate: true,
                        status: true,
                    },
                },
            },
        });
        return record;
    }
    async approvePayroll(periodId, companyId) {
        const period = await this.prisma.payrollPeriod.findFirst({
            where: { id: periodId, companyId },
            include: {
                records: true,
            },
        });
        if (!period) {
            throw new AppError_1.AppError('Payroll period not found', 404);
        }
        if (period.status !== 'PROCESSED') {
            throw new AppError_1.AppError('Payroll period is not in processed status', 400);
        }
        // Update records status
        await Promise.all(period.records.map((record) => this.prisma.payrollRecord.update({
            where: { id: record.id },
            data: {
                status: 'APPROVED',
            },
        })));
        // Update period status
        const updatedPeriod = await this.prisma.payrollPeriod.update({
            where: { id: periodId },
            data: {
                status: 'APPROVED',
            },
            include: {
                records: true,
            },
        });
        return updatedPeriod;
    }
}
exports.PayrollService = PayrollService;
