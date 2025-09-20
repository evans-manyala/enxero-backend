"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payroll_controller_1 = require("../controllers/payroll.controller");
const payroll_service_1 = require("../services/payroll.service");
const client_1 = require("@prisma/client");
const validation_middleware_1 = require("../../../shared/middlewares/validation.middleware");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const payrollService = new payroll_service_1.PayrollService();
const payrollController = new payroll_controller_1.PayrollController(payrollService);
// Validation schemas
const payrollConfigSchema = zod_1.z.object({
    body: zod_1.z.object({
        payFrequency: zod_1.z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
        payDay: zod_1.z.number().min(1).max(31),
        taxSettings: zod_1.z.any(),
        deductions: zod_1.z.array(zod_1.z.any()),
        allowances: zod_1.z.array(zod_1.z.any()),
    }),
});
const payrollPeriodSchema = zod_1.z.object({
    body: zod_1.z.object({
        startDate: zod_1.z.string().transform((str) => new Date(str)),
        endDate: zod_1.z.string().transform((str) => new Date(str)),
        status: zod_1.z.enum(['DRAFT', 'PROCESSED', 'APPROVED', 'PAID']).default('DRAFT'),
    }),
});
const payrollRecordSchema = zod_1.z.object({
    body: zod_1.z.object({
        employeeId: zod_1.z.string(),
        periodId: zod_1.z.string(),
        payPeriodStart: zod_1.z.string().transform((str) => new Date(str)),
        payPeriodEnd: zod_1.z.string().transform((str) => new Date(str)),
        grossSalary: zod_1.z.number(),
        totalDeductions: zod_1.z.number(),
        netSalary: zod_1.z.number(),
        workingDays: zod_1.z.number(),
        deductions: zod_1.z.any(),
        allowances: zod_1.z.any(),
        status: zod_1.z.enum(['DRAFT', 'PROCESSED', 'APPROVED', 'PAID']).default('DRAFT'),
    }),
});
const payrollRecordUpdateSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string(),
    }),
    body: zod_1.z.object({
        employeeId: zod_1.z.string(),
        periodId: zod_1.z.string(),
        payPeriodStart: zod_1.z.string().transform((str) => new Date(str)),
        payPeriodEnd: zod_1.z.string().transform((str) => new Date(str)),
        grossSalary: zod_1.z.number(),
        totalDeductions: zod_1.z.number(),
        netSalary: zod_1.z.number(),
        workingDays: zod_1.z.number(),
        deductions: zod_1.z.any(),
        allowances: zod_1.z.any(),
        status: zod_1.z.enum(['DRAFT', 'PROCESSED', 'APPROVED', 'PAID']).default('DRAFT'),
    }),
});
const paginationSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().transform(Number).default('1'),
        limit: zod_1.z.string().transform(Number).default('10'),
    }),
});
/**
 * @swagger
 * tags:
 *   name: Payroll
 *   description: Payroll management operations
 */
/**
 * @swagger
 * /payroll/config:
 *   get:
 *     summary: Retrieve payroll configuration for the current company
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payroll configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayrollConfig'
 */
router.get('/config', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(paginationSchema), payrollController.getPayrollConfig);
/**
 * @swagger
 * /payroll/config:
 *   post:
 *     summary: Create payroll configuration for the company
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayrollConfig'
 *     responses:
 *       201:
 *         description: Payroll config created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayrollConfig'
 */
router.post('/config', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(payrollConfigSchema), payrollController.createPayrollConfig);
/**
 * @swagger
 * /payroll/config/{id}:
 *   put:
 *     summary: Update payroll configuration
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: PayrollConfig UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayrollConfig'
 *     responses:
 *       200:
 *         description: Payroll config updated successfully
 */
router.put('/config/:id', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(payrollConfigSchema), payrollController.updatePayrollConfig);
/**
 * @swagger
 * /payroll/periods:
 *   get:
 *     summary: Retrieve a list of payroll periods
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (open, closed, processed)
 *     responses:
 *       200:
 *         description: List of payroll periods
 */
router.get('/periods', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(paginationSchema), payrollController.listPayrollPeriods);
/**
 * @swagger
 * /payroll/periods:
 *   post:
 *     summary: Create a new payroll period
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayrollPeriod'
 *     responses:
 *       201:
 *         description: Payroll period created successfully
 */
router.post('/periods', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(payrollPeriodSchema), payrollController.createPayrollPeriod);
/**
 * @swagger
 * /payroll/periods/{id}:
 *   get:
 *     summary: Get payroll period by ID
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: PayrollPeriod UUID
 *     responses:
 *       200:
 *         description: Payroll period details
 */
router.get('/periods/:id', auth_middleware_1.authenticate, payrollController.getPayrollPeriod);
/**
 * @swagger
 * /payroll/periods/{id}/process:
 *   post:
 *     summary: Process payroll for a period
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: PayrollPeriod UUID
 *     responses:
 *       200:
 *         description: Payroll processed successfully
 */
router.post('/periods/:id/process', auth_middleware_1.authenticate, payrollController.processPayroll);
/**
 * @swagger
 * /payroll/periods/{id}/approve:
 *   post:
 *     summary: Approve payroll for a period
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: PayrollPeriod UUID
 *     responses:
 *       200:
 *         description: Payroll approved successfully
 */
router.post('/periods/:id/approve', auth_middleware_1.authenticate, payrollController.approvePayroll);
/**
 * @swagger
 * /payroll/records:
 *   get:
 *     summary: Retrieve a list of payroll records for the company
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodId
 *         schema:
 *           type: string
 *         description: Filter by payroll period
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by employee
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (pending, processed, paid)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of payroll records
 */
router.get('/records', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(paginationSchema), payrollController.listPayrollRecords);
/**
 * @swagger
 * /payroll/records:
 *   post:
 *     summary: Create a new payroll record
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayrollRecord'
 *     responses:
 *       201:
 *         description: Payroll record created successfully
 */
router.post('/records', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(payrollRecordSchema), payrollController.createPayrollRecord);
/**
 * @swagger
 * /payroll/records/{id}:
 *   get:
 *     summary: Get payroll record by ID
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: PayrollRecord UUID
 *     responses:
 *       200:
 *         description: Payroll record details
 */
router.get('/records/:id', auth_middleware_1.authenticate, payrollController.getPayrollRecord);
/**
 * @swagger
 * /payroll/records/{id}:
 *   put:
 *     summary: Update payroll record by ID
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: PayrollRecord UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayrollRecord'
 *     responses:
 *       200:
 *         description: Payroll record updated successfully
 */
router.put('/records/:id', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(payrollRecordUpdateSchema), payrollController.updatePayrollRecord);
/**
 * @swagger
 * /payroll/employee/{employeeId}/period/{periodId}:
 *   get:
 *     summary: Get payroll details for an employee in a specific period
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee UUID
 *       - in: path
 *         name: periodId
 *         schema:
 *           type: string
 *         required: true
 *         description: PayrollPeriod UUID
 *     responses:
 *       200:
 *         description: Payroll details for the employee and period
 */
router.get('/employee/:employeeId/period/:periodId', auth_middleware_1.authenticate, payrollController.getEmployeePayroll);
exports.default = router;
