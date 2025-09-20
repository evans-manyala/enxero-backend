"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const employee_service_1 = require("../services/employee.service");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
class EmployeeController {
    constructor() {
        this.getEmployees = async (req, res) => {
            try {
                const { page, limit, search, department, position, status, sortBy, sortOrder } = req.query;
                const employees = await this.employeeService.getEmployees({
                    page: Number(page) || 1,
                    limit: Number(limit) || 10,
                    search: search,
                    department: department,
                    position: position,
                    status: status,
                    sortBy: sortBy,
                    sortOrder: sortOrder,
                });
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: employees,
                });
            }
            catch (error) {
                logger_1.default.error('Error in getEmployees:', error);
                throw new AppError_1.AppError('Failed to fetch employees', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.getEmployeeById = async (req, res) => {
            try {
                const { id } = req.params;
                const employee = await this.employeeService.getEmployeeById(id);
                if (!employee) {
                    throw new AppError_1.AppError('Employee not found', http_status_1.HttpStatus.NOT_FOUND);
                }
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: employee,
                });
            }
            catch (error) {
                logger_1.default.error('Error in getEmployeeById:', error);
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to fetch employee', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.createEmployee = async (req, res) => {
            try {
                const employeeData = req.body;
                const employee = await this.employeeService.createEmployee(employeeData);
                res.status(http_status_1.HttpStatus.CREATED).json({
                    status: 'success',
                    data: employee,
                });
            }
            catch (error) {
                logger_1.default.error('Error in createEmployee:', error);
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to create employee', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.updateEmployee = async (req, res) => {
            try {
                const { id } = req.params;
                const updateData = req.body;
                const employee = await this.employeeService.updateEmployee(id, updateData);
                if (!employee) {
                    throw new AppError_1.AppError('Employee not found', http_status_1.HttpStatus.NOT_FOUND);
                }
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: employee,
                });
            }
            catch (error) {
                logger_1.default.error('Error in updateEmployee:', error);
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to update employee', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.getEmployeeManager = async (req, res) => {
            try {
                const { id } = req.params;
                const manager = await this.employeeService.getEmployeeManager(id);
                if (!manager) {
                    throw new AppError_1.AppError('Manager not found', http_status_1.HttpStatus.NOT_FOUND);
                }
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: manager,
                });
            }
            catch (error) {
                logger_1.default.error('Error in getEmployeeManager:', error);
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to fetch employee manager', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.getEmployeeDirectReports = async (req, res) => {
            try {
                const { id } = req.params;
                const directReports = await this.employeeService.getEmployeeDirectReports(id);
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: directReports,
                });
            }
            catch (error) {
                logger_1.default.error('Error in getEmployeeDirectReports:', error);
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to fetch employee direct reports', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.employeeService = new employee_service_1.EmployeeService();
    }
}
exports.EmployeeController = EmployeeController;
