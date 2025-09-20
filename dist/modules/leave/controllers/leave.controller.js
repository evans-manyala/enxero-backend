"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveController = void 0;
const leave_service_1 = require("../services/leave.service");
const catch_async_1 = require("../../../shared/utils/catch-async");
const AppError_1 = require("../../../shared/utils/AppError");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class LeaveController {
    constructor() {
        this.listLeaveTypes = (0, catch_async_1.catchAsync)(async (req, res) => {
            const companyId = this.getCompanyId(req);
            const types = await this.leaveService.listLeaveTypes(companyId);
            res.json(types);
        });
        this.createLeaveType = (0, catch_async_1.catchAsync)(async (req, res) => {
            const companyId = this.getCompanyId(req);
            const type = await this.leaveService.createLeaveType({
                ...req.body,
                companyId,
            });
            res.status(201).json(type);
        });
        this.updateLeaveType = (0, catch_async_1.catchAsync)(async (req, res) => {
            const { id } = req.params;
            const companyId = this.getCompanyId(req);
            const type = await this.leaveService.updateLeaveType(id, {
                ...req.body,
                companyId,
            });
            res.json(type);
        });
        this.listLeaveRequests = (0, catch_async_1.catchAsync)(async (req, res) => {
            const companyId = this.getCompanyId(req);
            const { page = 1, limit = 10, ...filters } = req.query;
            const requests = await this.leaveService.listLeaveRequests(companyId, {
                page: Number(page),
                limit: Number(limit),
                ...filters,
            });
            res.json({ status: 'success', data: requests.data, meta: requests.meta });
        });
        this.getLeaveRequest = (0, catch_async_1.catchAsync)(async (req, res) => {
            const { id } = req.params;
            const companyId = this.getCompanyId(req);
            const request = await this.leaveService.getLeaveRequest(id, companyId);
            if (!request) {
                throw new AppError_1.AppError('Leave request not found', 404);
            }
            res.json({ status: 'success', data: request });
        });
        this.createLeaveRequest = (0, catch_async_1.catchAsync)(async (req, res) => {
            const companyId = this.getCompanyId(req);
            // Manual validation
            const { typeId, startDate, endDate, notes } = req.body;
            if (!typeId || !startDate || !endDate || !notes) {
                throw new AppError_1.AppError('Missing required fields: typeId, startDate, endDate, notes', 400);
            }
            // Get the employee record for the authenticated user
            const employee = await prisma.employee.findFirst({
                where: { userId: req.user.id, companyId },
            });
            if (!employee) {
                throw new AppError_1.AppError('Employee record not found for user', 400);
            }
            const request = await this.leaveService.createLeaveRequest({
                ...req.body,
                companyId,
                employeeId: employee.id,
            });
            res.status(201).json({ status: 'success', data: request });
        });
        this.updateLeaveRequest = (0, catch_async_1.catchAsync)(async (req, res) => {
            const { id } = req.params;
            const companyId = this.getCompanyId(req);
            const request = await this.leaveService.updateLeaveRequest(id, {
                ...req.body,
                companyId,
            });
            res.json({ status: 'success', data: request });
        });
        this.deleteLeaveRequest = (0, catch_async_1.catchAsync)(async (req, res) => {
            const { id } = req.params;
            const companyId = this.getCompanyId(req);
            await this.leaveService.deleteLeaveRequest(id, companyId);
            res.status(204).send();
        });
        this.approveLeaveRequest = (0, catch_async_1.catchAsync)(async (req, res) => {
            const { id } = req.params;
            const companyId = this.getCompanyId(req);
            const request = await this.leaveService.approveLeaveRequest(id, {
                ...req.body,
                companyId,
                approverId: req.user.id,
            });
            res.json(request);
        });
        this.rejectLeaveRequest = (0, catch_async_1.catchAsync)(async (req, res) => {
            const { id } = req.params;
            const companyId = this.getCompanyId(req);
            const request = await this.leaveService.rejectLeaveRequest(id, {
                ...req.body,
                companyId,
                approverId: req.user.id,
            });
            res.json(request);
        });
        this.getLeaveBalance = (0, catch_async_1.catchAsync)(async (req, res) => {
            const companyId = this.getCompanyId(req);
            const balance = await this.leaveService.getLeaveBalance(req.user.id, companyId);
            res.json(balance);
        });
        this.leaveService = new leave_service_1.LeaveService();
    }
    getCompanyId(req) {
        if (!req.user?.companyId) {
            throw new AppError_1.AppError('Company ID is required', 400);
        }
        return req.user.companyId;
    }
}
exports.LeaveController = LeaveController;
