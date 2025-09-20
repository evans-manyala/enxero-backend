"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("../modules/auth/routes/auth.routes"));
const user_routes_1 = __importDefault(require("../modules/users/routes/user.routes"));
const role_routes_1 = __importDefault(require("../modules/roles/routes/role.routes"));
const company_routes_1 = __importDefault(require("../modules/companies/routes/company.routes"));
const employee_routes_1 = __importDefault(require("../modules/employees/routes/employee.routes"));
const form_routes_1 = __importDefault(require("../modules/forms/routes/form.routes"));
const integration_routes_1 = __importDefault(require("../modules/integrations/routes/integration.routes"));
const leave_routes_1 = __importDefault(require("../modules/leave/routes/leave.routes"));
const notification_routes_1 = __importDefault(require("../modules/notifications/routes/notification.routes"));
const audit_routes_1 = __importDefault(require("../modules/audit/routes/audit.routes"));
const system_routes_1 = __importDefault(require("../modules/system/routes/system.routes"));
const payroll_routes_1 = __importDefault(require("../modules/payroll/routes/payroll.routes"));
const file_routes_1 = __importDefault(require("../modules/files/routes/file.routes"));
const otp_routes_1 = __importDefault(require("../modules/otp/routes/otp.routes"));
const router = express_1.default.Router();
router.use('/auth', auth_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/roles', role_routes_1.default);
router.use('/companies', company_routes_1.default);
router.use('/employees', employee_routes_1.default);
router.use('/forms', form_routes_1.default);
router.use('/integrations', integration_routes_1.default);
router.use('/leave', leave_routes_1.default);
router.use('/notifications', notification_routes_1.default);
router.use('/audit', audit_routes_1.default);
router.use('/system', system_routes_1.default);
router.use('/payroll', payroll_routes_1.default);
router.use('/files', file_routes_1.default);
router.use('/otp', otp_routes_1.default);
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
