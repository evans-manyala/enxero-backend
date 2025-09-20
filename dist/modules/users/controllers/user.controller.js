"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("../services/user.service");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
class UserController {
    constructor() {
        this.userService = new user_service_1.UserService();
    }
    /**
     * Extract and validate companyId from authenticated user
     */
    getCompanyId(req, operation = 'this operation') {
        if (!req.user?.companyId) {
            throw new AppError_1.AppError(`Company ID is required for ${operation}. Please ensure you are logged in properly.`, http_status_1.HttpStatus.BAD_REQUEST);
        }
        return req.user.companyId;
    }
    async getProfile(req, res) {
        try {
            const userId = req.user?.id;
            const companyId = this.getCompanyId(req, 'getting user profile');
            if (!userId) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Unauthorized',
                });
            }
            const profile = await this.userService.getUserById(userId);
            return res.json({
                status: 'success',
                data: profile,
            });
        }
        catch (error) {
            console.error('getProfile error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async updateProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Unauthorized',
                });
            }
            const { firstName, lastName, phoneNumber, avatar, bio, preferences, language, timezone } = req.body;
            const updatedProfile = await this.userService.updateUser(userId, {
                firstName,
                lastName,
                phoneNumber,
                avatar
            });
            return res.json({
                status: 'success',
                data: updatedProfile,
            });
        }
        catch (error) {
            console.error('updateProfile error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async changePassword(req, res) {
        try {
            const companyId = this.getCompanyId(req, 'changing password');
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Unauthorized',
                });
            }
            const { currentPassword, newPassword } = req.body;
            const result = await this.userService.changePassword(userId, currentPassword, newPassword);
            return res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            console.error('changePassword error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async getUsers(req, res) {
        try {
            const companyId = this.getCompanyId(req, 'listing users');
            const { page, limit, search, role, status, sortBy, sortOrder } = req.query;
            const paginationParams = {
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 10,
                search: search,
                role: role,
                status: status,
                sortBy: sortBy,
                sortOrder: sortOrder || 'desc',
            };
            // Use company-scoped user listing
            const result = await this.userService.getUsersByCompany(companyId, paginationParams);
            return res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            console.error('getUsers error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async getUserById(req, res) {
        try {
            const companyId = this.getCompanyId(req, 'getting user details');
            const { id } = req.params;
            // Get user and validate they belong to the same company
            const user = await this.userService.getUserById(id);
            if (user.companyId !== companyId) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Access denied: User does not belong to your company',
                });
            }
            return res.json({
                status: 'success',
                data: user,
            });
        }
        catch (error) {
            console.error('getUserById error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async updateUser(req, res) {
        try {
            const companyId = this.getCompanyId(req, 'updating user');
            const { id } = req.params;
            const updateData = req.body;
            // First validate the user belongs to the same company
            const existingUser = await this.userService.getUserById(id);
            if (existingUser.companyId !== companyId) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Access denied: User does not belong to your company',
                });
            }
            const updatedUser = await this.userService.updateUser(id, updateData);
            return res.json({
                status: 'success',
                data: updatedUser,
            });
        }
        catch (error) {
            console.error('updateUser error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async updateAccountStatus(req, res) {
        try {
            const userId = req.params.id;
            if (!userId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'User ID is required',
                });
            }
            const { status, reason } = req.body;
            const updatedUser = await this.userService.updateUserStatus(userId, status, reason);
            return res.json({
                status: 'success',
                data: updatedUser,
            });
        }
        catch (error) {
            console.error('updateAccountStatus error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async getPasswordHistory(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Unauthorized',
                });
            }
            const result = await this.userService.getUserPasswordHistory(userId);
            res.json({ status: 'success', data: result });
        }
        catch (error) {
            console.error('getPasswordHistory error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async toggleUserActiveStatus(req, res) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            if (typeof isActive !== 'boolean') {
                return res.status(400).json({
                    status: 'error',
                    message: 'isActive status (boolean) is required',
                });
            }
            const result = await this.userService.updateUserStatus(id, isActive ? 'active' : 'inactive');
            return res.json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            console.error('toggleUserActiveStatus error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
}
exports.UserController = UserController;
