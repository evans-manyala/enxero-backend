"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvePayrollSchema = exports.processPayrollSchema = exports.payrollRecordSchema = exports.payrollPeriodSchema = exports.payrollConfigSchema = void 0;
const zod_1 = require("zod");
exports.payrollConfigSchema = zod_1.z.object({
    payFrequency: zod_1.z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
    taxSettings: zod_1.z.object({
        taxRate: zod_1.z.number().min(0).max(100),
        taxThreshold: zod_1.z.number().min(0),
    }),
    deductions: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        amount: zod_1.z.number().min(0),
        type: zod_1.z.enum(['FIXED', 'PERCENTAGE']),
    })),
    allowances: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        amount: zod_1.z.number().min(0),
        type: zod_1.z.enum(['FIXED', 'PERCENTAGE']),
    })),
});
exports.payrollPeriodSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    status: zod_1.z.enum(['DRAFT', 'PROCESSED', 'APPROVED']).default('DRAFT'),
});
exports.payrollRecordSchema = zod_1.z.object({
    employeeId: zod_1.z.string().uuid(),
    periodId: zod_1.z.string().uuid(),
    basicSalary: zod_1.z.number().min(0),
    allowances: zod_1.z.number().min(0),
    deductions: zod_1.z.number().min(0),
    total: zod_1.z.number().min(0),
    status: zod_1.z.enum(['PENDING', 'PAID']).default('PENDING'),
    paymentDate: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().optional(),
});
exports.processPayrollSchema = zod_1.z.object({
    periodId: zod_1.z.string().uuid(),
});
exports.approvePayrollSchema = zod_1.z.object({
    periodId: zod_1.z.string().uuid(),
});
