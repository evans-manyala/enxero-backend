import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RegistrationService } from '../services/registration.service';
import { EnhancedAuthService } from '../services/enhanced-auth.service';
import { 
  IRegisterDto, 
  ILoginDto, 
  IRefreshTokenDto
} from '../interfaces/auth.interface';
import { AppError } from '../../../shared/utils/AppError';
import { HttpStatus } from '../../../shared/utils/http-status';
import logger from '../../../shared/utils/logger';

export class AuthController {
  private authService: AuthService;
  private registrationService: RegistrationService;
  private enhancedAuthService: EnhancedAuthService;

  constructor() {
    this.authService = new AuthService();
    this.registrationService = new RegistrationService();
    this.enhancedAuthService = new EnhancedAuthService();
  }

  // ===================================================================
  // LEGACY AUTHENTICATION (Backward Compatibility)
  // ===================================================================

  /**
   * Legacy single-step registration (maintains backward compatibility)
   */
  async register(req: Request, res: Response) {
    try {
      const data: IRegisterDto = req.body;
      const result = await this.authService.register(data);
      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      console.error('Register error:', error);
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
        details: error,
      });
    }
  }

  /**
   * TOTP-based login (replaces SMS OTP)
   */
  async loginWithTOTP(req: Request, res: Response) {
    try {
      const data: ILoginDto = req.body;
      const result = await this.authService.initiateTOTPLogin({
        email: data.email,
        password: data.password,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        status: 'success',
        message: 'requiresTOTP' in result 
          ? 'Enter the 6-digit code from your authenticator app'
          : 'Login successful',
        data: result,
      });
    } catch (error: any) {
      console.error('TOTP Login error:', error);
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
        details: error,
      });
    }
  }

  /**
   * Legacy direct login (maintains backward compatibility)
   */
  async login(req: Request, res: Response) {
    try {
      const data: ILoginDto = req.body;
      const result = await this.authService.login(data);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
        details: error,
      });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const data: IRefreshTokenDto = req.body;
      const result = await this.authService.refreshToken(data);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  // ===================================================================
  // ENHANCED MULTI-STEP REGISTRATION (Flowchart Compliant)
  // ===================================================================

  /**
   * Step 1: Company Details Registration
   * - Validates company information
   * - Generates AA-NANAANN company identifier
   * - Creates pending company record
   * - Sends email with company identifier
   */
  async registerStep1(req: Request, res: Response) {
    try {
      const {
        companyName,
        fullName,
        shortName,
        countryCode,
        phoneNumber,
        workPhone,
        city,
        address,
        ownerEmail,
        ownerFirstName,
        ownerLastName
      } = req.body;

      const result = await this.registrationService.registerStep1({
        companyName,
        fullName,
        shortName,
        countryCode,
        phoneNumber,
        workPhone,
        city,
        address,
        ownerEmail,
        ownerFirstName,
        ownerLastName,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(HttpStatus.CREATED).json({
        status: 'success',
        message: 'Company details registered successfully. Check your email for the company identifier.',
        data: result
      });
    } catch (error) {
      logger.error('Error in registration step 1:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Step 2: Username and Password Setup
   * - Validates session and company existence
   * - Creates user with credentials
   * - Sends confirmation email
   */
  async registerStep2(req: Request, res: Response) {
    try {
      const {
        sessionToken,
        username,
        password,
        confirmPassword
      } = req.body;

      const result = await this.registrationService.registerStep2({
        sessionToken,
        username,
        password,
        confirmPassword,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Credentials set successfully. Check your email for confirmation.',
        data: result
      });
    } catch (error) {
      logger.error('Error in registration step 2:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Step 3: 2FA Setup and Completion
   * - Validates session and user existence
   * - Sets up mandatory 2FA (TOTP)
   * - Links to company domain/database
   * - Completes registration process
   */
  async registerStep3(req: Request, res: Response) {
    try {
      const {
        sessionToken,
        twoFactorToken,
        backupCodes
      } = req.body;

      const result = await this.registrationService.registerStep3({
        sessionToken,
        twoFactorToken,
        backupCodes,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Registration completed successfully. You can now login.',
        data: result
      });
    } catch (error) {
      logger.error('Error in registration step 3:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get Registration Status
   * - Returns current registration progress
   * - Shows completed steps and next actions
   */
  async getRegistrationStatus(req: Request, res: Response) {
    try {
      const { sessionToken } = req.query;

      if (!sessionToken) {
        throw new AppError('Session token is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.registrationService.getRegistrationStatus(sessionToken as string);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Error getting registration status:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Generate Company Identifier Preview
   * - Shows what the company identifier would look like
   * - Useful for frontend preview
   */
  async previewCompanyIdentifier(req: Request, res: Response) {
    try {
      const { countryCode, shortName } = req.body;

      const identifier = await this.registrationService.generateCompanyIdentifier(countryCode, shortName);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: {
          identifier,
          format: 'AA-NANAANN',
          example: 'US-1A2B3C45'
        }
      });
    } catch (error) {
      logger.error('Error previewing identifier:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Resend Registration Email
   * - Resends email for current step
   * - Handles rate limiting
   */
  async resendRegistrationEmail(req: Request, res: Response) {
    try {
      const { sessionToken, step } = req.body;

      const result = await this.registrationService.resendEmail(sessionToken, step);

      res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Email sent successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error resending email:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // ===================================================================
  // ENHANCED LOGIN FLOW (OTP-Based Authentication)
  // ===================================================================

  /**
   * Initiate login with username/password and send OTP
   */
  async loginInitiate(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const result = await this.enhancedAuthService.initiateLogin({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Login initiated. Please check your email for verification code.',
        data: result
      });
    } catch (error) {
      logger.error('Error in login initiate:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verify OTP and complete login
   */
  async loginVerify(req: Request, res: Response) {
    try {
      const { loginToken, otpCode } = req.body;

      const result = await this.enhancedAuthService.verifyLoginOtp({
        loginToken,
        otpCode,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      logger.error('Error in login verify:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Check workspace access after login (Flowchart Logic)
   */
  async checkWorkspaceAccess(req: Request, res: Response) {
    try {
      const { userId } = req.body;

      const result = await this.enhancedAuthService.checkWorkspaceAccess(userId);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Error checking workspace access:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Resend login OTP
   */
  async resendLoginOtp(req: Request, res: Response) {
    try {
      const { loginToken } = req.body;

      const result = await this.enhancedAuthService.resendLoginOtp(loginToken);

      res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'OTP sent successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error resending login OTP:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get workspaces for a user
   */
  async getWorkspaces(req: Request, res: Response) {
    try {
      const { email } = req.params;
      
      // Mock implementation - in real app, fetch from database
      res.status(HttpStatus.OK).json({
        status: 'success',
        data: {
          workspaces: [
            {
              id: '1',
              name: 'Main Workspace',
              companyId: 'KE-N1A2A3N4',
              role: 'admin'
            }
          ],
          totalCount: 1
        }
      });
    } catch (error) {
      logger.error('Error getting workspaces:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // ===================================================================
  // TOTP AUTHENTICATION METHODS (2FA Enhancement)
  // ===================================================================

  /**
   * Initiate TOTP-based login
   */
  async totpLoginInitiate(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await this.authService.initiateTOTPLogin({
        email,
        password,
        ipAddress,
        userAgent,
      });

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('TOTP login initiate error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Verify TOTP code and complete login
   */
  async totpLoginVerify(req: Request, res: Response) {
    try {
      const { loginToken, totpCode } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await this.authService.verifyTOTPLogin({
        loginToken,
        totpCode,
        ipAddress,
        userAgent,
      });

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('TOTP login verify error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Setup 2FA for user account
   */
  async setup2FA(req: Request, res: Response) {
    try {
      const userId = req.user?.id; // Assuming user is authenticated

      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          status: 'error',
          message: 'Authentication required',
        });
      }

      const result = await this.authService.setup2FA(userId);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('2FA setup error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Enable 2FA after setup and verification
   */
  async enable2FA(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { totpCode } = req.body;

      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          status: 'error',
          message: 'Authentication required',
        });
      }

      const result = await this.authService.enable2FA(userId, totpCode);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('2FA enable error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Disable 2FA for user account
   */
  async disable2FA(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { totpCode } = req.body;

      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          status: 'error',
          message: 'Authentication required',
        });
      }

      const result = await this.authService.disable2FA(userId, totpCode);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('2FA disable error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Get 2FA status for user
   */
  async get2FAStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          status: 'error',
          message: 'Authentication required',
        });
      }

      const result = await this.authService.get2FAStatus(userId);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('2FA status error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }
  
  // ===================================================================
  // UI-MATCHING FLOW CONTROLLERS (New Endpoints - No Breaking Changes)
  // ===================================================================

  /**
   * Step 1: Validate Company Identifier
   */
  async validateCompanyIdentifier(req: Request, res: Response) {
    try {
      const { companyIdentifier } = req.body;
      const result = await this.authService.validateCompanyIdentifier({ companyIdentifier });

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('Company validation error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Step 2: Validate Username
   */
  async validateUsername(req: Request, res: Response) {
    try {
      const { companyIdentifier, username } = req.body;
      const result = await this.authService.validateUsername({ companyIdentifier, username });

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('Username validation error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Step 3: Validate Password
   */
  async validatePassword(req: Request, res: Response) {
    try {
      const { companyIdentifier, username, password } = req.body;
      const result = await this.authService.validatePassword({ 
        companyIdentifier, 
        username, 
        password 
      });

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('Password validation error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Step 4: Complete TOTP Login (reuses existing verifyTOTPLogin)
   */
  async completeTOTPLogin(req: Request, res: Response) {
    try {
      const { loginToken, totpCode } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await this.authService.completeTOTPLogin({
        loginToken,
        totpCode,
        ipAddress,
        userAgent,
      });

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('Complete TOTP login error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Single-Page Registration
   */
  async registerSinglePage(req: Request, res: Response) {
    try {
      const registrationData = req.body;
      const result = await this.authService.registerSinglePage(registrationData);

      if (result.success) {
        res.status(HttpStatus.CREATED).json({
          status: 'success',
          data: result,
        });
      } else {
        res.status(HttpStatus.BAD_REQUEST).json({
          status: 'error',
          message: result.message,
        });
      }
    } catch (error: any) {
      logger.error('Single page registration error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Force 2FA Setup (Strict 2FA Enforcement)
   */
  async force2FASetup(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          status: 'error',
          message: 'Authentication required',
        });
      }

      const result = await this.authService.force2FASetup(userId);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('Force 2FA setup error:', error);
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: error.message,
      });
    }
  }
}
