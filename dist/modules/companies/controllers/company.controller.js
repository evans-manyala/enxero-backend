"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyController = void 0;
const company_service_1 = require("../services/company.service");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
class CompanyController {
    constructor() {
        this.getCompanies = async (req, res) => {
            try {
                const { page, limit, search } = req.query;
                const result = await this.companyService.getCompanies({
                    page: Number(page) || 1,
                    limit: Number(limit) || 10,
                    search: search,
                });
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: result.data,
                    meta: result.meta,
                });
            }
            catch (error) {
                throw new AppError_1.AppError('Failed to fetch companies', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.getCompanyById = async (req, res) => {
            try {
                const { id } = req.params;
                const company = await this.companyService.getCompanyById(id);
                if (!company) {
                    throw new AppError_1.AppError('Company not found', http_status_1.HttpStatus.NOT_FOUND);
                }
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: company,
                });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to fetch company', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.createCompany = async (req, res) => {
            try {
                const companyData = req.body;
                const company = await this.companyService.createCompany(companyData);
                res.status(http_status_1.HttpStatus.CREATED).json({
                    status: 'success',
                    data: company,
                });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to create company', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.updateCompany = async (req, res) => {
            try {
                const { id } = req.params;
                const updateData = req.body;
                const company = await this.companyService.updateCompany(id, updateData);
                if (!company) {
                    throw new AppError_1.AppError('Company not found', http_status_1.HttpStatus.NOT_FOUND);
                }
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: company,
                });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to update company', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.deleteCompany = async (req, res) => {
            try {
                const { id } = req.params;
                await this.companyService.deleteCompany(id);
                res.status(http_status_1.HttpStatus.NO_CONTENT).send();
            }
            catch (error) {
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to delete company', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.inviteUser = async (req, res) => {
            try {
                const { id } = req.params;
                const inviteData = req.body;
                const invite = await this.companyService.inviteUser(id, inviteData);
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: invite,
                });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to invite user', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.getCompanyMembers = async (req, res) => {
            try {
                const { id } = req.params;
                const members = await this.companyService.getCompanyMembers(id);
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: members,
                });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to fetch company members', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.getCompanySettings = async (req, res) => {
            try {
                const { id } = req.params;
                const settings = await this.companyService.getCompanySettings(id);
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: settings,
                });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to fetch company settings', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.updateCompanySettings = async (req, res) => {
            try {
                const { id } = req.params;
                const settings = req.body.settings;
                const updatedSettings = await this.companyService.updateCompanySettings(id, settings);
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: updatedSettings,
                });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to update company settings', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        /**
         * Initiate company registration with OTP
         * POST /api/v1/companies/register/initiate
         */
        this.initiateRegistration = async (req, res) => {
            try {
                const { phoneNumber } = req.body;
                if (!phoneNumber) {
                    throw new AppError_1.AppError('Phone number is required', http_status_1.HttpStatus.BAD_REQUEST);
                }
                const result = await this.companyService.initiateCompanyRegistration(phoneNumber);
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    message: 'OTP sent successfully',
                    data: result,
                });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to initiate company registration', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        /**
         * Complete company registration with OTP verification
         * POST /api/v1/companies/register/complete
         */
        this.completeRegistration = async (req, res) => {
            try {
                const registrationData = req.body;
                const result = await this.companyService.registerCompanyWithOtp(registrationData);
                res.status(http_status_1.HttpStatus.CREATED).json({
                    status: 'success',
                    message: 'Company registered successfully',
                    data: result,
                });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to complete company registration', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        /**
         * Get company registration status
         * GET /api/v1/companies/:id/registration-status
         */
        this.getRegistrationStatus = async (req, res) => {
            try {
                const { id } = req.params;
                const status = await this.companyService.getRegistrationStatus(id);
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: status,
                });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError)
                    throw error;
                throw new AppError_1.AppError('Failed to get registration status', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        /**
         * Generate company ID
         * POST /api/v1/companies/generate-id
         */
        this.generateCompanyId = async (req, res) => {
            try {
                const { countryCode, shortName } = req.body;
                const companyId = this.companyService.generateCompanyId(countryCode, shortName);
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: { companyId },
                });
            }
            catch (error) {
                throw new AppError_1.AppError('Failed to generate company ID', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        };
        this.companyService = new company_service_1.CompanyService();
    }
}
exports.CompanyController = CompanyController;
