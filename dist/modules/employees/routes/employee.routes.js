"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employee_controller_1 = require("../controllers/employee.controller");
const validation_middleware_1 = require("../../../shared/middlewares/validation.middleware");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const employeeController = new employee_controller_1.EmployeeController();
/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee management operations
 */
// Validation schemas
const createEmployeeSchema = zod_1.z.object({
    body: zod_1.z.object({
        employeeId: zod_1.z.string().min(1, 'Employee ID is required'),
        firstName: zod_1.z.string().min(2, 'First name must be at least 2 characters'),
        lastName: zod_1.z.string().min(2, 'Last name must be at least 2 characters'),
        email: zod_1.z.string().email('Invalid email address'),
        phoneNumber: zod_1.z.string().optional(),
        department: zod_1.z.string().min(2, 'Department must be at least 2 characters'),
        position: zod_1.z.string().min(2, 'Position must be at least 2 characters'),
        status: zod_1.z.string().min(2, 'Status must be at least 2 characters'),
        hireDate: zod_1.z.string().transform((str) => new Date(str)),
        terminationDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
        salary: zod_1.z.number().positive('Salary must be a positive number'),
        emergencyContact: zod_1.z.record(zod_1.z.any()).optional(),
        address: zod_1.z.record(zod_1.z.any()).optional(),
        bankDetails: zod_1.z.record(zod_1.z.any()).optional(),
        taxInfo: zod_1.z.record(zod_1.z.any()).optional(),
        benefits: zod_1.z.record(zod_1.z.any()).optional(),
        managerId: zod_1.z.string().uuid().optional(),
        companyId: zod_1.z.string().uuid('Company ID must be a valid UUID'),
    }),
});
const updateEmployeeSchema = zod_1.z.object({
    body: zod_1.z.object({
        employeeId: zod_1.z.string().optional(),
        firstName: zod_1.z.string().min(2).optional(),
        lastName: zod_1.z.string().min(2).optional(),
        email: zod_1.z.string().email().optional(),
        phoneNumber: zod_1.z.string().optional(),
        department: zod_1.z.string().min(2).optional(),
        position: zod_1.z.string().min(2).optional(),
        status: zod_1.z.string().min(2).optional(),
        hireDate: zod_1.z.string().transform((str) => new Date(str)).optional(),
        terminationDate: zod_1.z.string().transform((str) => new Date(str)).optional(),
        salary: zod_1.z.number().positive().optional(),
        emergencyContact: zod_1.z.record(zod_1.z.any()).optional(),
        address: zod_1.z.record(zod_1.z.any()).optional(),
        bankDetails: zod_1.z.record(zod_1.z.any()).optional(),
        taxInfo: zod_1.z.record(zod_1.z.any()).optional(),
        benefits: zod_1.z.record(zod_1.z.any()).optional(),
        managerId: zod_1.z.string().uuid().optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().uuid(),
    }),
});
const paginationSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
        search: zod_1.z.string().optional(),
        department: zod_1.z.string().optional(),
        position: zod_1.z.string().optional(),
        status: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['firstName', 'lastName', 'email', 'department', 'position', 'hireDate']).optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    }),
});
// Public routes
/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Get a list of all employees
 *     tags: [Employees]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: position
 *         schema:
 *           type: string
 *         description: Filter by position
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 */
router.get('/', auth_middleware_1.authenticate, (0, validation_middleware_1.validateRequest)(paginationSchema), employeeController.getEmployees.bind(employeeController));
/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get an employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the employee to retrieve
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 */
router.get('/:id', auth_middleware_1.authenticate, employeeController.getEmployeeById.bind(employeeController));
// Protected routes
/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmployeeInput'
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 */
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('write:employees'), (0, validation_middleware_1.validateRequest)(createEmployeeSchema), employeeController.createEmployee.bind(employeeController));
/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: Update an employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the employee to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEmployeeInput'
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 */
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('write:employees'), (0, validation_middleware_1.validateRequest)(updateEmployeeSchema), employeeController.updateEmployee.bind(employeeController));
/**
 * @swagger
 * /employees/{id}/manager:
 *   get:
 *     summary: Get an employee's manager
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the employee
 *     responses:
 *       200:
 *         description: Employee's manager retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 */
router.get('/:id/manager', auth_middleware_1.authenticate, employeeController.getEmployeeManager.bind(employeeController));
/**
 * @swagger
 * /employees/{id}/direct-reports:
 *   get:
 *     summary: Get an employee's direct reports
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the employee
 *     responses:
 *       200:
 *         description: Employee's direct reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 */
router.get('/:id/direct-reports', auth_middleware_1.authenticate, employeeController.getEmployeeDirectReports.bind(employeeController));
exports.default = router;
