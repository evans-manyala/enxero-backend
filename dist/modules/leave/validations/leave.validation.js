"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectLeaveSchema = exports.approveLeaveSchema = exports.updateLeaveRequestSchema = exports.leaveRequestSchema = exports.leaveTypeSchema = void 0;
const zod_1 = require("zod");
exports.leaveTypeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    maxDays: zod_1.z.number().min(1),
    accrualRate: zod_1.z.number().min(0).max(1),
    isPaid: zod_1.z.boolean().default(true),
    requiresApproval: zod_1.z.boolean().default(true),
});
exports.leaveRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        typeId: zod_1.z.string().uuid(),
        startDate: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format',
        }),
        endDate: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format',
        }),
        notes: zod_1.z.string().min(1),
        attachments: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    }),
});
exports.updateLeaveRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        typeId: zod_1.z.string().uuid().optional(),
        startDate: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format',
        }).optional(),
        endDate: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format',
        }).optional(),
        notes: zod_1.z.string().min(1).optional(),
        status: zod_1.z.string().optional(),
        attachments: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().uuid(),
    }),
});
exports.approveLeaveSchema = zod_1.z.object({
    notes: zod_1.z.string().optional(),
});
exports.rejectLeaveSchema = zod_1.z.object({
    notes: zod_1.z.string().min(1),
});
