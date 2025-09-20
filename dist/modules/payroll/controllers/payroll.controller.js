"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollController = void 0;
const AppError_1 = require("../../../shared/utils/AppError");
class PayrollController {
    constructor(payrollService) {
        this.payrollService = payrollService;
        this.getPayrollConfig = async (req, res, next) => {
            try {
                const companyId = this.getCompanyId(req);
                const config = await this.payrollService.getPayrollConfig(companyId);
                res.json(config);
            }
            catch (error) {
                next(error);
            }
        };
        this.createPayrollConfig = async (req, res, next) => {
            try {
                const companyId = this.getCompanyId(req);
                const config = await this.payrollService.createPayrollConfig({
                    ...req.body,
                    companyId,
                });
                res.status(201).json(config);
            }
            catch (error) {
                next(error);
            }
        };
        this.updatePayrollConfig = async (req, res, next) => {
            try {
                const { id } = req.params;
                const config = await this.payrollService.updatePayrollConfig(id, req.body);
                res.json(config);
            }
            catch (error) {
                next(error);
            }
        };
        this.listPayrollPeriods = async (req, res, next) => {
            try {
                const companyId = this.getCompanyId(req);
                const { page, limit, ...filters } = req.query;
                const periods = await this.payrollService.listPayrollPeriods(companyId, {
                    page: Number(page) || 1,
                    limit: Number(limit) || 10,
                    ...filters,
                });
                res.json(periods);
            }
            catch (error) {
                next(error);
            }
        };
        this.createPayrollPeriod = async (req, res, next) => {
            try {
                const companyId = this.getCompanyId(req);
                const period = await this.payrollService.createPayrollPeriod({
                    ...req.body,
                    companyId,
                });
                res.status(201).json(period);
            }
            catch (error) {
                next(error);
            }
        };
        this.getPayrollPeriod = async (req, res, next) => {
            try {
                const companyId = this.getCompanyId(req);
                const { id } = req.params;
                const period = await this.payrollService.getPayrollPeriod(companyId, id);
                if (!period) {
                    throw new AppError_1.AppError('Payroll period not found', 404);
                }
                res.json(period);
            }
            catch (error) {
                next(error);
            }
        };
        this.processPayroll = async (req, res, next) => {
            try {
                const companyId = this.getCompanyId(req);
                const { id } = req.params;
                const period = await this.payrollService.processPayroll(id, companyId);
                res.json(period);
            }
            catch (error) {
                next(error);
            }
        };
        this.approvePayroll = async (req, res, next) => {
            try {
                const companyId = this.getCompanyId(req);
                const { id } = req.params;
                const period = await this.payrollService.approvePayroll(id, companyId);
                res.json(period);
            }
            catch (error) {
                next(error);
            }
        };
        this.listPayrollRecords = async (req, res, next) => {
            try {
                const companyId = this.getCompanyId(req);
                const { page, limit, ...filters } = req.query;
                const records = await this.payrollService.listPayrollRecords(companyId, {
                    page: Number(page) || 1,
                    limit: Number(limit) || 10,
                    ...filters,
                });
                res.json(records);
            }
            catch (error) {
                next(error);
            }
        };
        this.getPayrollRecord = async (req, res, next) => {
            try {
                const companyId = this.getCompanyId(req);
                const { id } = req.params;
                const record = await this.payrollService.getPayrollRecord(id, companyId);
                if (!record) {
                    throw new AppError_1.AppError('Payroll record not found', 404);
                }
                res.json(record);
            }
            catch (error) {
                next(error);
            }
        };
        this.createPayrollRecord = async (req, res, next) => {
            try {
                const companyId = this.getCompanyId(req);
                const record = await this.payrollService.createPayrollRecord({
                    ...req.body,
                    companyId,
                });
                res.status(201).json(record);
            }
            catch (error) {
                next(error);
            }
        };
        this.updatePayrollRecord = async (req, res, next) => {
            try {
                const { id } = req.params;
                const record = await this.payrollService.updatePayrollRecord(id, req.body);
                res.json(record);
            }
            catch (error) {
                next(error);
            }
        };
        this.getEmployeePayroll = async (req, res, next) => {
            try {
                const { employeeId, periodId } = req.params;
                const payroll = await this.payrollService.getEmployeePayroll(employeeId, periodId);
                if (!payroll) {
                    throw new AppError_1.AppError('Payroll record not found', 404);
                }
                res.json(payroll);
            }
            catch (error) {
                next(error);
            }
        };
    }
    getCompanyId(req) {
        if (!req.user?.companyId) {
            throw new AppError_1.AppError('Company ID is required', 400);
        }
        return req.user.companyId;
    }
}
exports.PayrollController = PayrollController;
