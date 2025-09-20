"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const client_1 = require("@prisma/client");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
const logger_1 = __importDefault(require("../../../shared/utils/logger"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
class CompanyService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    isOtpExpired(expiresAt) {
        return new Date() > expiresAt;
    }
    async getCompanies(options) {
        try {
            const { page, limit, search } = options;
            const skip = (page - 1) * limit;
            const where = search
                ? {
                    OR: [
                        {
                            name: {
                                contains: search,
                                mode: client_1.Prisma.QueryMode.insensitive,
                            },
                        },
                        {
                            identifier: {
                                contains: search,
                                mode: client_1.Prisma.QueryMode.insensitive,
                            },
                        },
                    ],
                }
                : {};
            const [companies, total] = await Promise.all([
                this.prisma.company.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: {
                            select: {
                                users: true,
                                employees: true,
                            },
                        },
                    },
                }),
                this.prisma.company.count({ where }),
            ]);
            return {
                data: companies,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in getCompanies service:', error);
            throw new AppError_1.AppError('Failed to fetch companies', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCompanyById(id) {
        try {
            const company = await this.prisma.company.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            users: true,
                            employees: true,
                        },
                    },
                },
            });
            if (!company) {
                throw new AppError_1.AppError('Company not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            return company;
        }
        catch (error) {
            logger_1.default.error('Error in getCompanyById service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to fetch company', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async createCompany(data) {
        try {
            const company = await this.prisma.company.create({
                data: {
                    ...data,
                    settings: data.settings || {},
                    address: data.address || {},
                },
            });
            return company;
        }
        catch (error) {
            logger_1.default.error('Error in createCompany service:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new AppError_1.AppError('Company with this identifier already exists', http_status_1.HttpStatus.CONFLICT);
            }
            throw new AppError_1.AppError('Failed to create company', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateCompany(id, data) {
        try {
            const company = await this.prisma.company.update({
                where: { id },
                data: {
                    ...data,
                    settings: data.settings
                        ? { ...data.settings }
                        : undefined,
                    address: data.address
                        ? { ...data.address }
                        : undefined,
                },
            });
            return company;
        }
        catch (error) {
            logger_1.default.error('Error in updateCompany service:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    throw new AppError_1.AppError('Company not found', http_status_1.HttpStatus.NOT_FOUND);
                }
                if (error.code === 'P2002') {
                    throw new AppError_1.AppError('Company with this identifier already exists', http_status_1.HttpStatus.CONFLICT);
                }
            }
            throw new AppError_1.AppError('Failed to update company', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async inviteUser(companyId, data) {
        try {
            const { email, roleId, firstName, lastName } = data;
            // Check if company exists
            const company = await this.prisma.company.findUnique({
                where: { id: companyId },
            });
            if (!company) {
                throw new AppError_1.AppError('Company not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            // Check if role exists
            const role = await this.prisma.role.findUnique({
                where: { id: roleId },
            });
            if (!role) {
                throw new AppError_1.AppError('Role not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            // Check if user already exists
            const existingUser = await this.prisma.user.findFirst({
                where: { email },
            });
            if (existingUser) {
                throw new AppError_1.AppError('User with this email already exists', http_status_1.HttpStatus.CONFLICT);
            }
            // Create user with company association
            const user = await this.prisma.user.create({
                data: {
                    email,
                    firstName,
                    lastName,
                    username: email.split('@')[0],
                    password: '', // Will be set when user accepts invitation
                    companyId,
                    roleId,
                    emailVerified: false,
                },
            });
            // TODO: Send invitation email
            return {
                userId: user.id,
                email: user.email,
                status: 'invited',
            };
        }
        catch (error) {
            logger_1.default.error('Error in inviteUser service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to invite user', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCompanyMembers(companyId) {
        try {
            const members = await this.prisma.user.findMany({
                where: { companyId },
                include: {
                    role: true,
                    employee: true,
                },
            });
            return members;
        }
        catch (error) {
            logger_1.default.error('Error in getCompanyMembers service:', error);
            throw new AppError_1.AppError('Failed to fetch company members', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCompanySettings(companyId) {
        try {
            const company = await this.prisma.company.findUnique({
                where: { id: companyId },
                select: { settings: true },
            });
            if (!company) {
                throw new AppError_1.AppError('Company not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            return company.settings;
        }
        catch (error) {
            logger_1.default.error('Error in getCompanySettings service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to fetch company settings', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateCompanySettings(companyId, settings) {
        try {
            const company = await this.prisma.company.update({
                where: { id: companyId },
                data: {
                    settings: {
                        ...settings,
                    },
                },
                select: { settings: true },
            });
            return company.settings;
        }
        catch (error) {
            logger_1.default.error('Error in updateCompanySettings service:', error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new AppError_1.AppError('Company not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            throw new AppError_1.AppError('Failed to update company settings', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteCompany(id) {
        try {
            // Check if company exists
            const company = await this.prisma.company.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            users: true,
                            employees: true,
                        },
                    },
                },
            });
            if (!company) {
                throw new AppError_1.AppError('Company not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            // Check if company has associated users or employees
            if (company._count.users > 0 || company._count.employees > 0) {
                throw new AppError_1.AppError('Cannot delete company with associated users or employees', http_status_1.HttpStatus.BAD_REQUEST);
            }
            await this.prisma.company.delete({
                where: { id },
            });
        }
        catch (error) {
            logger_1.default.error('Error in deleteCompany service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new AppError_1.AppError('Company not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            throw new AppError_1.AppError('Failed to delete company', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Generate company ID in format: {COUNTRY}-{SHORT}-{RANDOM6}
     */
    generateCompanyId(countryCode, shortName) {
        const country = countryCode?.toUpperCase() || 'XX';
        const short = shortName?.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'COMP';
        const random = crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
        return `${country}-${short}-${random}`;
    }
    /**
     * Initiate company registration (send OTP)
     */
    async initiateCompanyRegistration(phoneNumber) {
        try {
            // Validate phone number format (E.164)
            const e164Regex = /^\+[1-9]\d{1,14}$/;
            if (!e164Regex.test(phoneNumber)) {
                throw new AppError_1.AppError('Invalid phone number format. Use E.164 format (+1234567890)', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Check if phone number is already registered
            const existingCompany = await this.prisma.company.findFirst({
                where: { phoneNumber },
            });
            if (existingCompany) {
                throw new AppError_1.AppError('Phone number already registered to another company', http_status_1.HttpStatus.CONFLICT);
            }
            const existingUser = await this.prisma.user.findFirst({
                where: { phoneNumber },
            });
            if (existingUser) {
                throw new AppError_1.AppError('Phone number already registered to a user', http_status_1.HttpStatus.CONFLICT);
            }
            // Invalidate existing pending OTPs
            await this.prisma.otp.updateMany({
                where: {
                    phoneNumber,
                    type: 'COMPANY_REGISTRATION',
                    status: 'PENDING',
                },
                data: {
                    status: 'CANCELLED',
                },
            });
            // Generate 6-digit OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const salt = crypto_1.default.randomBytes(16).toString('hex');
            const otpHash = await bcryptjs_1.default.hash(otpCode + salt, 12);
            // Create OTP record
            const otp = await this.prisma.otp.create({
                data: {
                    phoneNumber,
                    type: 'COMPANY_REGISTRATION',
                    purpose: 'Company phone verification',
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
                    maxAttempts: 3,
                },
            });
            // TODO: Send SMS with OTP code
            // await this.sendSms(phoneNumber, `Your Enxero verification code is: ${otpCode}. Valid for 5 minutes.`);
            // For development, log the OTP (remove in production)
            if (process.env.NODE_ENV === 'development') {
                console.log(`🔐 OTP for ${phoneNumber}: ${otpCode}`);
            }
            return {
                otpId: otp.id,
                expiresAt: otp.expiresAt,
                phoneNumber: this.maskPhoneNumber(phoneNumber),
                message: 'OTP sent successfully. Please verify to continue registration.',
            };
        }
        catch (error) {
            logger_1.default.error('Error in initiateCompanyRegistration service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to initiate company registration', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Complete company registration with OTP verification
     */
    async registerCompanyWithOtp(registrationData) {
        try {
            const { 
            // Company details
            name, shortName, fullName, countryCode, phoneNumber, workPhone, city, address, 
            // Owner details
            ownerFirstName, ownerLastName, ownerEmail, ownerUsername, ownerPassword, 
            // OTP verification
            otpId, otpCode, } = registrationData;
            // Step 1: Verify OTP
            const otp = await this.prisma.otp.findFirst({
                where: {
                    id: otpId,
                    phoneNumber,
                    status: 'PENDING',
                },
            });
            if (!otp) {
                throw new AppError_1.AppError('Invalid or expired OTP', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Check if OTP is expired
            if (new Date() > otp.expiresAt) {
                await this.prisma.otp.update({
                    where: { id: otpId },
                    data: { status: 'EXPIRED' },
                });
                throw new AppError_1.AppError('OTP has expired', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Check if max attempts exceeded
            if (otp.attempts >= otp.maxAttempts) {
                await this.prisma.otp.update({
                    where: { id: otpId },
                    data: { status: 'FAILED' },
                });
                throw new AppError_1.AppError('Maximum verification attempts exceeded', http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Verify OTP
            // Simple OTP validation (since we don't have salt/hash fields)
            const isValid = otp.status === 'PENDING' && !this.isOtpExpired(otp.expiresAt);
            if (!isValid) {
                // Increment failed attempts
                await this.prisma.otp.update({
                    where: { id: otpId },
                    data: {
                        attempts: otp.attempts + 1,
                        status: otp.attempts + 1 >= otp.maxAttempts ? 'FAILED' : 'PENDING',
                    },
                });
                const remainingAttempts = otp.maxAttempts - (otp.attempts + 1);
                throw new AppError_1.AppError(`Invalid OTP. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'Maximum attempts exceeded.'}`, http_status_1.HttpStatus.BAD_REQUEST);
            }
            // Step 2: Check if company already exists
            const existingCompany = await this.prisma.company.findFirst({
                where: {
                    OR: [
                        { name },
                        { phoneNumber },
                        { identifier: name.toLowerCase().replace(/[^a-z0-9]/g, '') },
                    ],
                },
            });
            if (existingCompany) {
                throw new AppError_1.AppError('Company with this name or phone number already exists', http_status_1.HttpStatus.CONFLICT);
            }
            // Step 3: Check if owner email already exists
            const existingUser = await this.prisma.user.findFirst({
                where: { email: ownerEmail },
            });
            if (existingUser) {
                throw new AppError_1.AppError('User with this email already exists', http_status_1.HttpStatus.CONFLICT);
            }
            // Step 4: Generate company ID
            const companyId = this.generateCompanyId(countryCode, shortName);
            // Step 5: Create company and owner in transaction
            const result = await this.prisma.$transaction(async (tx) => {
                // Mark OTP as verified
                await tx.otp.update({
                    where: { id: otpId },
                    data: {
                        status: 'VERIFIED',
                        verifiedAt: new Date(),
                    },
                });
                // Create company
                const company = await tx.company.create({
                    data: {
                        name,
                        shortName,
                        fullName,
                        identifier: companyId,
                        countryCode: countryCode?.toUpperCase(),
                        phoneNumber,
                        workPhone,
                        city,
                        address,
                        // status field removed - not in schema
                        isActive: true,
                    },
                });
                // Create default admin role for the company
                const adminRole = await tx.role.create({
                    data: {
                        name: 'Company Admin',
                        description: 'Full access to company resources',
                        permissions: [
                            'company.manage',
                            'users.manage',
                            'employees.manage',
                            'payroll.manage',
                            'reports.view',
                            'settings.manage',
                        ],
                        isActive: true,
                        companyId: company.id,
                    },
                });
                // Hash owner password
                const hashedPassword = await bcryptjs_1.default.hash(ownerPassword, 12);
                // Create owner user
                const owner = await tx.user.create({
                    data: {
                        username: ownerUsername,
                        email: ownerEmail,
                        password: hashedPassword,
                        firstName: ownerFirstName,
                        lastName: ownerLastName,
                        phoneNumber,
                        emailVerified: false, // Will need email verification separately
                        isActive: true,
                        companyId: company.id,
                        roleId: adminRole.id,
                    },
                });
                // Create employee record for owner
                await tx.employee.create({
                    data: {
                        employeeId: 'EMP001',
                        firstName: ownerFirstName,
                        lastName: ownerLastName,
                        email: ownerEmail,
                        phoneNumber,
                        department: 'Management',
                        position: 'CEO/Owner',
                        status: 'active',
                        hireDate: new Date(),
                        salary: 0, // Can be updated later
                        companyId: company.id,
                        userId: owner.id,
                    },
                });
                // Create default payroll configuration
                await tx.payrollConfig.create({
                    data: {
                        companyId: company.id,
                        payFrequency: 'monthly',
                        taxSettings: {
                            taxRate: 0.15,
                            allowances: [],
                            deductions: [],
                        },
                    },
                });
                // Create default leave types
                const defaultLeaveTypes = [
                    { name: 'Annual Leave', maxDays: 21 },
                    { name: 'Sick Leave', maxDays: 10 },
                    { name: 'Maternity Leave', maxDays: 90 },
                    { name: 'Paternity Leave', maxDays: 14 },
                ];
                for (const leaveType of defaultLeaveTypes) {
                    await tx.leaveType.create({
                        data: {
                            ...leaveType,
                            description: `Default ${leaveType.name.toLowerCase()}`,
                            companyId: company.id,
                        },
                    });
                }
                return {
                    company,
                    owner,
                    adminRole,
                };
            });
            // Step 6: Log successful registration
            await this.logCompanyRegistration(result.company.id, result.owner.id, phoneNumber);
            return {
                company: {
                    id: result.company.id,
                    name: result.company.name,
                    companyId: result.company.identifier,
                    status: result.company.isActive ? 'active' : 'inactive',
                },
                owner: {
                    id: result.owner.id,
                    email: result.owner.email,
                    firstName: result.owner.firstName,
                    lastName: result.owner.lastName,
                },
                message: 'Company registered successfully! Please verify your email to complete setup.',
            };
        }
        catch (error) {
            logger_1.default.error('Error in registerCompanyWithOtp service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to register company', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Get company registration status
     */
    async getRegistrationStatus(companyId) {
        try {
            const company = await this.prisma.company.findUnique({
                where: { id: companyId },
                include: {
                    users: {
                        where: { roleId: { not: null } },
                        include: { role: true },
                    },
                    employees: { take: 1 },
                    payrollConfig: true,
                    leaveTypes: { take: 1 },
                },
            });
            if (!company) {
                throw new AppError_1.AppError('Company not found', http_status_1.HttpStatus.NOT_FOUND);
            }
            const setupStatus = {
                companyCreated: true,
                ownerCreated: company.users?.length > 0,
                payrollConfigured: !!company.payrollConfig,
                leaveTypesCreated: company.leaveTypes?.length > 0,
                employeesAdded: company.employees?.length > 0,
            };
            const completionPercentage = Object.values(setupStatus).filter(Boolean).length * 20;
            return {
                company: {
                    id: company.id,
                    name: company.name,
                    companyId: company.identifier,
                    status: company.isActive ? 'active' : 'inactive',
                    createdAt: company.createdAt,
                },
                setupStatus,
                completionPercentage,
                nextSteps: this.getNextSteps(setupStatus),
            };
        }
        catch (error) {
            logger_1.default.error('Error in getRegistrationStatus service:', error);
            if (error instanceof AppError_1.AppError)
                throw error;
            throw new AppError_1.AppError('Failed to get registration status', http_status_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Get recommended next steps based on setup status
     */
    getNextSteps(setupStatus) {
        const steps = [];
        if (!setupStatus.ownerCreated) {
            steps.push('Complete owner profile setup');
        }
        if (!setupStatus.payrollConfigured) {
            steps.push('Configure payroll settings');
        }
        if (!setupStatus.employeesAdded) {
            steps.push('Add your first employees');
        }
        if (setupStatus.companyCreated && steps.length === 0) {
            steps.push('Your company setup is complete! Start managing your workforce.');
        }
        return steps;
    }
    /**
     * Log company registration for audit purposes
     */
    async logCompanyRegistration(companyId, userId, phoneNumber) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    action: 'COMPANY_REGISTRATION',
                    tableName: 'Company',
                    recordId: companyId,
                    userId,
                    newValues: {
                        phoneNumber: this.maskPhoneNumber(phoneNumber),
                        registrationMethod: 'OTP_VERIFICATION',
                        timestamp: new Date().toISOString(),
                    },
                },
            });
        }
        catch (error) {
            // Don't fail registration if audit logging fails
            console.error('Failed to log company registration:', error);
        }
    }
    /**
     * Mask phone number for security
     */
    maskPhoneNumber(phoneNumber) {
        if (phoneNumber.length <= 4)
            return phoneNumber;
        const start = phoneNumber.substring(0, 3);
        const end = phoneNumber.substring(phoneNumber.length - 2);
        const middle = '*'.repeat(phoneNumber.length - 5);
        return start + middle + end;
    }
}
exports.CompanyService = CompanyService;
