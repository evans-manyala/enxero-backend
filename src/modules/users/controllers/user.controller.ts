import { Request, Response } from 'express';
import { UserService, ListUsersOptions } from '../services/user.service';
import { AuthRequest } from '../../../shared/middlewares/auth.middleware';
import { AppError } from '../../../shared/utils/AppError';
import { HttpStatus } from '../../../shared/utils/http-status';

interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Extract and validate companyId from authenticated user
   */
  private getCompanyId(req: AuthRequest, operation: string = 'this operation'): string {
    if (!req.user?.companyId) {
      throw new AppError(
        `Company ID is required for ${operation}. Please ensure you are logged in properly.`,
        HttpStatus.BAD_REQUEST
      );
    }
    return req.user.companyId;
  }

  async getProfile(req: AuthRequest, res: Response) {
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
    } catch (error: any) {
      console.error('getProfile error:', error);
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
        });
      }

      const { 
        firstName, 
        lastName, 
        phoneNumber, 
        avatar,
        bio,
        preferences,
        language,
        timezone
      } = req.body;

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
    } catch (error: any) {
      console.error('updateProfile error:', error);
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async changePassword(req: AuthRequest, res: Response) {
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
    } catch (error: any) {
      console.error('changePassword error:', error);
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async getUsers(req: AuthRequest, res: Response) {
    try {
      const companyId = this.getCompanyId(req, 'listing users');
      const { page, limit, search, role, status, sortBy, sortOrder } = req.query;
      
      const paginationParams: ListUsersOptions = {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        search: search as string,
        role: role as string,
        status: status as string,
        sortBy: sortBy as string,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      };

      // Use company-scoped user listing
      const result = await this.userService.getUsersByCompany(companyId, paginationParams);
      return res.json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      console.error('getUsers error:', error);
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async getUserById(req: AuthRequest, res: Response) {
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
    } catch (error: any) {
      console.error('getUserById error:', error);
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async updateUser(req: AuthRequest, res: Response) {
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
    } catch (error: any) {
      console.error('updateUser error:', error);
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async updateAccountStatus(req: Request, res: Response) {
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
    } catch (error: any) {
      console.error('updateAccountStatus error:', error);
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async getPasswordHistory(req: Request, res: Response) {
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
    } catch (error: any) {
      console.error('getPasswordHistory error:', error);
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async toggleUserActiveStatus(req: Request, res: Response) {
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
    } catch (error: any) {
      console.error('toggleUserActiveStatus error:', error);
      return res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }
} 