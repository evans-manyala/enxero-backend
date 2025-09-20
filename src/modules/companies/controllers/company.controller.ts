import { Request, Response } from 'express';
import { CompanyService } from '../services/company.service';
import { AppError } from '../../../shared/utils/AppError';
import { HttpStatus } from '../../../shared/utils/http-status';

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();
  }

  public getCompanies = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, search } = req.query;
      const result = await this.companyService.getCompanies({
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search: search as string,
      });

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      throw new AppError(
        'Failed to fetch companies',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  public getCompanyById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const company = await this.companyService.getCompanyById(id);

      if (!company) {
        throw new AppError('Company not found', HttpStatus.NOT_FOUND);
      }

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: company,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to fetch company',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  public createCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyData = req.body;
      const company = await this.companyService.createCompany(companyData);

      res.status(HttpStatus.CREATED).json({
        status: 'success',
        data: company,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to create company',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  public updateCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const company = await this.companyService.updateCompany(id, updateData);

      if (!company) {
        throw new AppError('Company not found', HttpStatus.NOT_FOUND);
      }

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: company,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to update company',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  public deleteCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.companyService.deleteCompany(id);

      res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to delete company',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  public inviteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const inviteData = req.body;
      const invite = await this.companyService.inviteUser(id, inviteData);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: invite,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to invite user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  public getCompanyMembers = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const members = await this.companyService.getCompanyMembers(id);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: members,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to fetch company members',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  public getCompanySettings = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const settings = await this.companyService.getCompanySettings(id);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: settings,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to fetch company settings',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  public updateCompanySettings = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const settings = req.body.settings;
      const updatedSettings = await this.companyService.updateCompanySettings(
        id,
        settings
      );

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: updatedSettings,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to update company settings',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  /**
   * Initiate company registration with OTP
   * POST /api/v1/companies/register/initiate
   */
  public initiateRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        throw new AppError('Phone number is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.companyService.initiateCompanyRegistration(phoneNumber);

      res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'OTP sent successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to initiate company registration',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  /**
   * Complete company registration with OTP verification
   * POST /api/v1/companies/register/complete
   */
  public completeRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
      const registrationData = req.body;
      const result = await this.companyService.registerCompanyWithOtp(registrationData);

      res.status(HttpStatus.CREATED).json({
        status: 'success',
        message: 'Company registered successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to complete company registration',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  /**
   * Get company registration status
   * GET /api/v1/companies/:id/registration-status
   */
  public getRegistrationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const status = await this.companyService.getRegistrationStatus(id);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: status,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to get registration status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };

  /**
   * Generate company ID
   * POST /api/v1/companies/generate-id
   */
  public generateCompanyId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { countryCode, shortName } = req.body;
      const companyId = this.companyService.generateCompanyId(countryCode, shortName);

      res.status(HttpStatus.OK).json({
        status: 'success',
        data: { companyId },
      });
    } catch (error) {
      throw new AppError(
        'Failed to generate company ID',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };
} 