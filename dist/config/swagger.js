"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const environment_1 = __importDefault(require("./environment"));
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Enxero Platform Backend API',
            version: '1.0.0',
            description: 'Comprehensive API documentation for the Enxero Platform Backend, including Authentication, User Management, Company Management, Employee Management, Payroll Management, Leave Management, Forms Management, File Management, Notifications, Audit Logging, Integrations, and System Configuration.',
            contact: {
                name: 'Enxero Support',
                url: 'https://www.enxero.com/support',
                email: 'support@enxero.com',
            },
        },
        servers: [
            {
                url: `http://localhost:${environment_1.default.PORT}/api/v1`,
                description: 'Development Server',
            },
            // You can add more servers for different environments (e.g., production, staging)
            // {
            //   url: 'https://api.yourdomain.com/api/v1',
            //   description: 'Production Server',
            // },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter the JWT token in the format "Bearer <token>"',
                },
            },
            schemas: {
                // User schemas
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string' },
                        status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
                        companyId: { type: 'string', format: 'uuid' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                // Company schemas
                Company: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        phone: { type: 'string' },
                        address: { type: 'string' },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        country: { type: 'string' },
                        postalCode: { type: 'string' },
                        status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
                        subscriptionPlan: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                // Employee schemas
                Employee: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        employeeId: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        phone: { type: 'string' },
                        position: { type: 'string' },
                        department: { type: 'string' },
                        hireDate: { type: 'string', format: 'date' },
                        salary: { type: 'number' },
                        status: { type: 'string', enum: ['active', 'inactive', 'terminated'] },
                        companyId: { type: 'string', format: 'uuid' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                // Payroll schemas
                PayrollConfig: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        companyId: { type: 'string', format: 'uuid' },
                        payFrequency: { type: 'string', enum: ['weekly', 'biweekly', 'monthly'] },
                        taxSettings: { type: 'object' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                PayrollPeriod: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        companyId: { type: 'string', format: 'uuid' },
                        startDate: { type: 'string', format: 'date' },
                        endDate: { type: 'string', format: 'date' },
                        status: { type: 'string', enum: ['open', 'closed', 'processed'] },
                        totalAmount: { type: 'number' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                PayrollRecord: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        employeeId: { type: 'string', format: 'uuid' },
                        periodId: { type: 'string', format: 'uuid' },
                        grossSalary: { type: 'number' },
                        totalDeductions: { type: 'number' },
                        netPay: { type: 'number' },
                        status: { type: 'string', enum: ['pending', 'processed', 'paid'] },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                // Leave schemas
                LeaveType: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        companyId: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        maxDays: { type: 'integer' },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                LeaveRequest: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        employeeId: { type: 'string', format: 'uuid' },
                        leaveTypeId: { type: 'string', format: 'uuid' },
                        startDate: { type: 'string', format: 'date' },
                        endDate: { type: 'string', format: 'date' },
                        status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] },
                        reason: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                LeaveBalance: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        employeeId: { type: 'string', format: 'uuid' },
                        leaveTypeId: { type: 'string', format: 'uuid' },
                        year: { type: 'integer' },
                        totalDays: { type: 'integer' },
                        usedDays: { type: 'integer' },
                        remainingDays: { type: 'integer' },
                    },
                },
                // Form schemas
                Form: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        type: { type: 'string' },
                        fields: { type: 'array', items: { type: 'object' } },
                        status: { type: 'string', enum: ['active', 'inactive'] },
                        createdBy: { type: 'string', format: 'uuid' },
                        companyId: { type: 'string', format: 'uuid' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                FormSubmission: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        formId: { type: 'string', format: 'uuid' },
                        data: { type: 'object' },
                        submittedBy: { type: 'string', format: 'uuid' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                // File schemas
                File: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'File ID',
                        },
                        filename: {
                            type: 'string',
                            description: 'Original filename',
                        },
                        storageName: {
                            type: 'string',
                            description: 'Name of the file in storage',
                        },
                        mimetype: {
                            type: 'string',
                            description: 'MIME type of the file',
                        },
                        size: {
                            type: 'integer',
                            description: 'File size in bytes',
                        },
                        description: {
                            type: 'string',
                            description: 'File description',
                        },
                        tags: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: 'File tags',
                        },
                        entityType: {
                            type: 'string',
                            description: 'Type of entity the file is associated with',
                        },
                        entityId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID of the entity the file is associated with',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'File creation timestamp',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp',
                        },
                    },
                },
                // Notification schemas
                Notification: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Notification ID',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'User ID',
                        },
                        type: {
                            type: 'string',
                            description: 'Notification type',
                            enum: ['system_alert', 'user_mention', 'document_shared', 'task_assigned', 'leave_request', 'payroll_update', 'system_update'],
                        },
                        message: {
                            type: 'string',
                            description: 'Notification message',
                        },
                        data: {
                            type: 'object',
                            description: 'Additional notification data',
                        },
                        status: {
                            type: 'string',
                            enum: ['unread', 'read'],
                            description: 'Notification status',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Notification creation timestamp',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp',
                        },
                    },
                },
                // Audit schemas
                AuditLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        action: { type: 'string' },
                        entityType: { type: 'string' },
                        entityId: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        description: { type: 'string' },
                        ipAddress: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                // Integration schemas
                Integration: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        companyId: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        type: { type: 'string' },
                        status: { type: 'string', enum: ['active', 'inactive'] },
                        config: { type: 'object' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                IntegrationLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        integrationId: { type: 'string', format: 'uuid' },
                        status: { type: 'string', enum: ['success', 'error'] },
                        message: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                // OTP schemas
                OTP: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        phoneNumber: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$' },
                        type: { type: 'string', enum: ['COMPANY_REGISTRATION', 'USER_LOGIN', 'PASSWORD_RESET'] },
                        purpose: { type: 'string' },
                        status: { type: 'string', enum: ['PENDING', 'VERIFIED', 'EXPIRED', 'FAILED', 'CANCELLED'] },
                        attempts: { type: 'integer', minimum: 0, maximum: 3 },
                        maxAttempts: { type: 'integer', default: 3 },
                        expiresAt: { type: 'string', format: 'date-time' },
                        verifiedAt: { type: 'string', format: 'date-time', nullable: true },
                        userId: { type: 'string', format: 'uuid', nullable: true },
                        companyId: { type: 'string', format: 'uuid', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                OTPGenerateRequest: {
                    type: 'object',
                    required: ['phoneNumber'],
                    properties: {
                        phoneNumber: {
                            type: 'string',
                            pattern: '^\\+[1-9]\\d{1,14}$',
                            description: 'Phone number in E.164 format (+1234567890)',
                            example: '+254785406848'
                        },
                    },
                },
                OTPVerifyRequest: {
                    type: 'object',
                    required: ['otpId', 'otpCode', 'phoneNumber'],
                    properties: {
                        otpId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'OTP ID from generation response'
                        },
                        otpCode: {
                            type: 'string',
                            pattern: '^[0-9]{6}$',
                            description: '6-digit OTP code',
                            example: '123456'
                        },
                        phoneNumber: {
                            type: 'string',
                            pattern: '^\\+[1-9]\\d{1,14}$',
                            description: 'Phone number in E.164 format',
                            example: '+254785406848'
                        },
                    },
                },
                OTPResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                otpId: { type: 'string', format: 'uuid' },
                                expiresAt: { type: 'string', format: 'date-time' },
                                phoneNumber: { type: 'string', description: 'Masked phone number for security' },
                                message: { type: 'string' },
                            },
                        },
                    },
                },
                OTPVerifyResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                verified: { type: 'boolean' },
                                type: { type: 'string' },
                                userId: { type: 'string', format: 'uuid', nullable: true },
                                companyId: { type: 'string', format: 'uuid', nullable: true },
                            },
                        },
                    },
                },
                // Company Registration schemas
                CompanyRegistrationRequest: {
                    type: 'object',
                    required: ['phoneNumber', 'companyName', 'ownerName', 'ownerEmail'],
                    properties: {
                        phoneNumber: {
                            type: 'string',
                            pattern: '^\\+[1-9]\\d{1,14}$',
                            description: 'Company phone number in E.164 format',
                            example: '+254785406848'
                        },
                        companyName: {
                            type: 'string',
                            minLength: 2,
                            maxLength: 100,
                            description: 'Company name',
                            example: 'Acme Corporation'
                        },
                        ownerName: {
                            type: 'string',
                            minLength: 2,
                            maxLength: 50,
                            description: 'Company owner full name',
                            example: 'John Doe'
                        },
                        ownerEmail: {
                            type: 'string',
                            format: 'email',
                            description: 'Company owner email address',
                            example: 'john.doe@acme.com'
                        },
                        industry: {
                            type: 'string',
                            description: 'Company industry',
                            example: 'Technology'
                        },
                        countryCode: {
                            type: 'string',
                            pattern: '^[A-Z]{2}$',
                            description: 'ISO 3166-1 alpha-2 country code',
                            example: 'KE'
                        },
                    },
                },
                CompanyRegistrationCompleteRequest: {
                    type: 'object',
                    required: ['otpId', 'otpCode', 'phoneNumber'],
                    properties: {
                        otpId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'OTP ID from initiation response'
                        },
                        otpCode: {
                            type: 'string',
                            pattern: '^[0-9]{6}$',
                            description: '6-digit OTP code received via SMS',
                            example: '123456'
                        },
                        phoneNumber: {
                            type: 'string',
                            pattern: '^\\+[1-9]\\d{1,14}$',
                            description: 'Phone number in E.164 format',
                            example: '+254785406848'
                        },
                        password: {
                            type: 'string',
                            minLength: 8,
                            description: 'Owner account password (min 8 characters)',
                            example: 'SecurePass123!'
                        },
                    },
                },
                CompanyRegistrationResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                company: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string', format: 'uuid' },
                                        companyId: { type: 'string', description: 'ISO format company ID (e.g., KE-ACME-A1B2C3)' },
                                        name: { type: 'string' },
                                        phoneNumber: { type: 'string' },
                                        status: { type: 'string', enum: ['active', 'pending', 'suspended'] },
                                        createdAt: { type: 'string', format: 'date-time' },
                                    },
                                },
                                owner: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string', format: 'uuid' },
                                        email: { type: 'string', format: 'email' },
                                        firstName: { type: 'string' },
                                        lastName: { type: 'string' },
                                        role: { type: 'string' },
                                        phoneVerified: { type: 'boolean' },
                                    },
                                },
                                tokens: {
                                    type: 'object',
                                    properties: {
                                        accessToken: { type: 'string' },
                                        refreshToken: { type: 'string' },
                                        expiresIn: { type: 'integer' },
                                    },
                                },
                            },
                        },
                    },
                },
                // Authentication schemas
                AuthResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'success' },
                        message: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                accessToken: { type: 'string', description: 'JWT access token' },
                                refreshToken: { type: 'string', description: 'JWT refresh token' },
                                user: { $ref: '#/components/schemas/UserProfile' },
                            },
                        },
                    },
                },
                UserProfile: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        username: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string' },
                        companyId: { type: 'string', format: 'uuid' },
                        company: { $ref: '#/components/schemas/CompanyInfo' },
                        twoFactorEnabled: { type: 'boolean' },
                        twoFactorSetupRequired: { type: 'boolean' },
                    },
                },
                CompanyInfo: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        identifier: { type: 'string', pattern: '^[A-Z]{2}-[A-Z0-9]{7}$' },
                    },
                },
                RegistrationStep1Request: {
                    type: 'object',
                    required: [
                        'companyName',
                        'countryCode',
                        'phoneNumber',
                        'ownerEmail',
                        'ownerFirstName',
                        'ownerLastName'
                    ],
                    properties: {
                        companyName: { type: 'string', minLength: 1, example: 'Acme Corporation Ltd' },
                        fullName: { type: 'string', example: 'Acme Corporation Limited' },
                        shortName: { type: 'string', example: 'ACME' },
                        countryCode: { type: 'string', pattern: '^[A-Z]{2}$', example: 'US' },
                        phoneNumber: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$', example: '+1234567890' },
                        workPhone: { type: 'string', example: '+1234567891' },
                        city: { type: 'string', example: 'New York' },
                        address: { type: 'object' },
                        ownerEmail: { type: 'string', format: 'email', example: 'john.doe@acme.com' },
                        ownerFirstName: { type: 'string', minLength: 1, example: 'John' },
                        ownerLastName: { type: 'string', minLength: 1, example: 'Doe' },
                    },
                },
                RegistrationStep1Response: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'success' },
                        message: { type: 'string', example: 'Company details registered successfully' },
                        data: {
                            type: 'object',
                            properties: {
                                sessionToken: { type: 'string' },
                                companyIdentifier: { type: 'string', pattern: '^[A-Z]{2}-[A-Z0-9]{7}$', example: 'US-A1B2C34' },
                                step: { type: 'integer', example: 1 },
                                nextStep: { type: 'string', example: 'Set username and password' },
                                expiresAt: { type: 'string', format: 'date-time' },
                            },
                        },
                    },
                },
                RegistrationStep2Request: {
                    type: 'object',
                    required: ['sessionToken', 'username', 'password', 'confirmPassword'],
                    properties: {
                        sessionToken: { type: 'string' },
                        username: { type: 'string', minLength: 3, pattern: '^[a-zA-Z0-9_-]+$', example: 'johndoe' },
                        password: { type: 'string', minLength: 8, example: 'SecurePass123!' },
                        confirmPassword: { type: 'string', example: 'SecurePass123!' },
                    },
                },
                RegistrationStep3Request: {
                    type: 'object',
                    required: ['sessionToken', 'twoFactorToken'],
                    properties: {
                        sessionToken: { type: 'string' },
                        twoFactorToken: { type: 'string', pattern: '^[0-9]{6}$', example: '123456' },
                        backupCodes: { type: 'array', items: { type: 'string' } },
                    },
                },
                SinglePageRegistrationRequest: {
                    type: 'object',
                    required: [
                        'companyFullName',
                        'companyShortName',
                        'companyWorkPhone',
                        'companyCity',
                        'companyCountry',
                        'fullName',
                        'jobTitle',
                        'phoneNumber',
                        'email',
                        'username',
                        'password'
                    ],
                    properties: {
                        companyFullName: { type: 'string', example: 'Acme Corporation Limited' },
                        companyShortName: { type: 'string', example: 'ACME' },
                        companyWorkPhone: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$', example: '+1234567890' },
                        companyCity: { type: 'string', example: 'New York' },
                        companyCountry: { type: 'string', pattern: '^[A-Z]{2}$', example: 'US' },
                        fullName: { type: 'string', example: 'John Doe' },
                        jobTitle: { type: 'string', example: 'CEO' },
                        phoneNumber: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$', example: '+1234567891' },
                        email: { type: 'string', format: 'email', example: 'john.doe@acme.com' },
                        username: { type: 'string', minLength: 3, pattern: '^[a-zA-Z0-9_-]+$', example: 'johndoe' },
                        password: { type: 'string', minLength: 6, example: 'SecurePass123!' },
                    },
                },
                LoginInitiateRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'john.doe@acme.com' },
                        password: { type: 'string', example: 'SecurePass123!' },
                    },
                },
                LoginVerifyRequest: {
                    type: 'object',
                    required: ['loginToken', 'otpCode'],
                    properties: {
                        loginToken: { type: 'string', example: 'temp_login_token_abc123' },
                        otpCode: { type: 'string', pattern: '^[0-9]{6}$', example: '123456' },
                    },
                },
                CompanyValidationRequest: {
                    type: 'object',
                    required: ['companyIdentifier'],
                    properties: {
                        companyIdentifier: { type: 'string', pattern: '^[A-Z]{2}-[A-Z0-9]{7}$', example: 'US-A1B2C34' },
                    },
                },
                UsernameValidationRequest: {
                    type: 'object',
                    required: ['companyIdentifier', 'username'],
                    properties: {
                        companyIdentifier: { type: 'string', pattern: '^[A-Z]{2}-[A-Z0-9]{7}$', example: 'US-A1B2C34' },
                        username: { type: 'string', example: 'johndoe' },
                    },
                },
                PasswordValidationRequest: {
                    type: 'object',
                    required: ['companyIdentifier', 'username', 'password'],
                    properties: {
                        companyIdentifier: { type: 'string', pattern: '^[A-Z]{2}-[A-Z0-9]{7}$', example: 'US-A1B2C34' },
                        username: { type: 'string', example: 'johndoe' },
                        password: { type: 'string', example: 'SecurePass123!' },
                    },
                },
                TOTPRequest: {
                    type: 'object',
                    required: ['companyIdentifier', 'username', 'totpToken'],
                    properties: {
                        companyIdentifier: { type: 'string', pattern: '^[A-Z]{2}-[A-Z0-9]{7}$', example: 'US-A1B2C34' },
                        username: { type: 'string', example: 'johndoe' },
                        totpToken: { type: 'string', pattern: '^[0-9]{6}$', example: '123456' },
                    },
                },
                TwoFactorSetupResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'success' },
                        data: {
                            type: 'object',
                            properties: {
                                secret: { type: 'string', description: 'Base32 encoded secret' },
                                qrCode: { type: 'string', description: 'Base64 encoded QR code image' },
                                backupCodes: { type: 'array', items: { type: 'string' } },
                                setupUrl: { type: 'string', description: 'otpauth:// URL for manual entry' },
                            },
                        },
                    },
                },
                // System schemas
                SystemConfig: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        key: { type: 'string' },
                        value: { type: 'string' },
                        description: { type: 'string' },
                        active: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                SystemLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        level: { type: 'string', enum: ['info', 'warning', 'error'] },
                        message: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                // Common schemas
                Pagination: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        pages: { type: 'integer' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        errors: { type: 'array', items: { type: 'string' } },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [
        // Core modules
        './src/modules/auth/routes/*.ts',
        './src/modules/users/routes/*.ts',
        './src/modules/roles/routes/*.ts',
        './src/modules/companies/routes/*.ts',
        './src/modules/employees/routes/*.ts',
        // Business modules
        './src/modules/payroll/routes/*.ts',
        './src/modules/leave/routes/*.ts',
        './src/modules/forms/routes/*.ts',
        // File and communication modules
        './src/modules/files/routes/*.ts',
        './src/modules/notifications/routes/*.ts',
        // OTP and registration modules
        './src/modules/otp/routes/*.ts',
        // System and audit modules
        './src/modules/audit/routes/*.ts',
        './src/modules/integrations/routes/*.ts',
        './src/modules/system/routes/*.ts',
    ],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
exports.default = swaggerSpec;
