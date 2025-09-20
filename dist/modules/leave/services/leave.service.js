"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../../../shared/utils/AppError");
const tenant_scoped_service_1 = require("../../../shared/services/tenant-scoped.service");
const prisma = new client_1.PrismaClient();
class LeaveService extends tenant_scoped_service_1.TenantScopedService {
    async listLeaveTypes(companyId) {
        return prisma.leaveType.findMany({
            where: { companyId },
        });
    }
    async createLeaveType(data) {
        return prisma.leaveType.create({
            data,
        });
    }
    async updateLeaveType(id, data) {
        return prisma.leaveType.update({
            where: { id },
            data,
        });
    }
    async listLeaveRequests(companyId, options) {
        const { page, limit, ...filters } = options;
        const skip = (page - 1) * limit;
        const [requests, total] = await Promise.all([
            prisma.leaveRequest.findMany({
                where: { companyId, ...filters },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    employee: true,
                    leaveType: true,
                },
            }),
            prisma.leaveRequest.count({
                where: { companyId, ...filters },
            }),
        ]);
        return {
            data: requests,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getLeaveRequest(id, companyId) {
        return prisma.leaveRequest.findFirst({
            where: { id, companyId },
            include: {
                employee: true,
                leaveType: true,
            },
        });
    }
    async createLeaveRequest(data) {
        const { employeeId, typeId, startDate, endDate } = data;
        // Check leave balance
        const balance = await prisma.leaveBalance.findFirst({
            where: { employeeId, typeId },
        });
        if (!balance) {
            throw new AppError_1.AppError('Leave balance not found', 404);
        }
        const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
        if (balance.remainingDays < days) {
            throw new AppError_1.AppError('Insufficient leave balance', 400);
        }
        // Create leave request with default status
        const request = await prisma.leaveRequest.create({
            data: {
                ...data,
                status: 'PENDING',
            },
            include: {
                employee: true,
                leaveType: true,
            },
        });
        // Update leave balance
        await prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
                usedDays: balance.usedDays + days,
                remainingDays: balance.remainingDays - days,
            },
        });
        return request;
    }
    async updateLeaveRequest(id, data) {
        return prisma.leaveRequest.update({
            where: { id },
            data,
            include: {
                employee: true,
                leaveType: true,
            },
        });
    }
    async approveLeaveRequest(id, data) {
        const { approverId, notes } = data;
        const request = await prisma.leaveRequest.findUnique({
            where: { id },
            include: {
                employee: true,
                leaveType: true,
            },
        });
        if (!request) {
            throw new AppError_1.AppError('Leave request not found', 404);
        }
        if (request.status !== 'PENDING') {
            throw new AppError_1.AppError('Leave request is not in pending status', 400);
        }
        return prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedBy: approverId,
                comments: notes,
                approvedAt: new Date(),
            },
            include: {
                employee: true,
                leaveType: true,
            },
        });
    }
    async rejectLeaveRequest(id, data) {
        const { approverId, notes } = data;
        const request = await prisma.leaveRequest.findUnique({
            where: { id },
            include: {
                employee: true,
                leaveType: true,
            },
        });
        if (!request) {
            throw new AppError_1.AppError('Leave request not found', 404);
        }
        if (request.status !== 'PENDING') {
            throw new AppError_1.AppError('Leave request is not in pending status', 400);
        }
        // Restore leave balance
        const balance = await prisma.leaveBalance.findFirst({
            where: {
                employeeId: request.employeeId,
                typeId: request.typeId,
            },
        });
        if (balance) {
            const days = Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24));
            await prisma.leaveBalance.update({
                where: { id: balance.id },
                data: {
                    usedDays: balance.usedDays - days,
                    remainingDays: balance.remainingDays + days,
                },
            });
        }
        return prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedBy: approverId,
                comments: notes,
                rejectedAt: new Date(),
            },
            include: {
                employee: true,
                leaveType: true,
            },
        });
    }
    async getLeaveBalance(employeeId, companyId) {
        const balances = await prisma.leaveBalance.findMany({
            where: { employeeId },
            include: {
                leaveType: true,
            },
        });
        return balances;
    }
    async deleteLeaveRequest(id, companyId) {
        const request = await prisma.leaveRequest.findFirst({
            where: { id, companyId },
            include: {
                employee: true,
                leaveType: true,
            },
        });
        if (!request) {
            throw new AppError_1.AppError('Leave request not found', 404);
        }
        // Only allow deletion of pending requests
        if (request.status !== 'PENDING') {
            throw new AppError_1.AppError('Cannot delete non-pending leave request', 400);
        }
        await prisma.leaveRequest.delete({
            where: { id },
        });
    }
}
exports.LeaveService = LeaveService;
