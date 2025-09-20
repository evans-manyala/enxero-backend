"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leave_controller_1 = require("../controllers/leave.controller");
const validation_middleware_1 = require("../../../shared/middlewares/validation.middleware");
const auth_middleware_1 = require("../../../shared/middlewares/auth.middleware");
const leave_validation_1 = require("../validations/leave.validation");
const router = (0, express_1.Router)();
const leaveController = new leave_controller_1.LeaveController();
/**
 * @swagger
 * tags:
 *   name: Leave
 *   description: Leave management operations
 */
/**
 * @swagger
 * /leave/types:
 *   get:
 *     summary: Retrieve a list of leave types for the company
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of leave types
 */
router.get('/types', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('view:leave_types'), leaveController.listLeaveTypes);
/**
 * @swagger
 * /leave/types:
 *   post:
 *     summary: Create a new leave type
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaveType'
 *     responses:
 *       201:
 *         description: Leave type created successfully
 */
router.post('/types', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('create:leave_types'), (0, validation_middleware_1.validateRequest)(leave_validation_1.leaveTypeSchema), leaveController.createLeaveType);
/**
 * @swagger
 * /leave/types/{id}:
 *   put:
 *     summary: Update a leave type
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: LeaveType UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaveType'
 *     responses:
 *       200:
 *         description: Leave type updated successfully
 */
router.put('/types/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('update:leave_types'), (0, validation_middleware_1.validateRequest)(leave_validation_1.leaveTypeSchema), leaveController.updateLeaveType);
/**
 * @swagger
 * /leave/requests:
 *   get:
 *     summary: Retrieve a list of leave requests with filtering and pagination
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by employee
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (pending, approved, rejected, cancelled)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by leave type
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
 *         description: List of leave requests
 */
router.get('/requests', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('view:leave_requests'), leaveController.listLeaveRequests);
/**
 * @swagger
 * /leave/requests/{id}:
 *   get:
 *     summary: Retrieve a specific leave request by ID
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: LeaveRequest UUID
 *     responses:
 *       200:
 *         description: Leave request details
 */
router.get('/requests/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('view:leave_requests'), leaveController.getLeaveRequest);
/**
 * @swagger
 * /leave/requests:
 *   post:
 *     summary: Create a new leave request
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaveRequest'
 *     responses:
 *       201:
 *         description: Leave request created successfully
 */
router.post('/requests', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('create:leave_requests'), (0, validation_middleware_1.validateRequest)(leave_validation_1.leaveRequestSchema), leaveController.createLeaveRequest);
/**
 * @swagger
 * /leave/requests/{id}:
 *   put:
 *     summary: Update a leave request
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: LeaveRequest UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaveRequest'
 *     responses:
 *       200:
 *         description: Leave request updated successfully
 */
router.put('/requests/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('update:leave_requests'), (0, validation_middleware_1.validateRequest)(leave_validation_1.updateLeaveRequestSchema), leaveController.updateLeaveRequest);
/**
 * @swagger
 * /requests/{id}:
 *   delete:
 *     summary: Delete a leave request by ID
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the leave request to delete
 *     responses:
 *       204:
 *         description: Leave request deleted successfully
 *       400:
 *         description: Cannot delete non-pending leave request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden, insufficient permissions
 *       404:
 *         description: Leave request not found
 */
router.delete('/requests/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('delete:leave_requests'), leaveController.deleteLeaveRequest);
// Leave Approval Routes
router.post('/requests/:id/approve', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('approve:leave_requests'), (0, validation_middleware_1.validateRequest)(leave_validation_1.approveLeaveSchema), leaveController.approveLeaveRequest);
router.post('/requests/:id/reject', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('reject:leave_requests'), (0, validation_middleware_1.validateRequest)(leave_validation_1.rejectLeaveSchema), leaveController.rejectLeaveRequest);
/**
 * @swagger
 * /leave/balance:
 *   get:
 *     summary: Retrieve leave balances for employees
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by employee
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *     responses:
 *       200:
 *         description: List of leave balances
 */
router.get('/balance', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('view:leave_balance'), leaveController.getLeaveBalance);
exports.default = router;
