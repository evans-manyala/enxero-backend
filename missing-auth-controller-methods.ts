/**
 * Missing Auth Controller Methods
 * Add these methods to src/modules/auth/controllers/auth.controller.ts
 */

/**
 * Step 1: Validate Company Identifier (UI Flow)
 */
async validateCompanyIdentifier(req: Request, res: Response) {
  try {
    const { companyIdentifier } = req.body;
    
    const company = await this.authService.validateCompanyIdentifier({
      companyIdentifier
    });
    
    res.status(200).json({
      status: 'success',
      data: company
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
}

/**
 * Step 2: Validate Username (UI Flow)
 */
async validateUsername(req: Request, res: Response) {
  try {
    const { companyIdentifier, username } = req.body;
    
    const result = await this.authService.validateUsername({
      companyIdentifier,
      username
    });
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
}

/**
 * Step 3: Validate Password (UI Flow)
 */
async validatePassword(req: Request, res: Response) {
  try {
    const { companyIdentifier, username, password } = req.body;
    
    const result = await this.authService.validatePassword({
      companyIdentifier,
      username,
      password
    });
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
}

/**
 * Step 4: Complete TOTP Login (UI Flow)
 */
async completeTOTPLogin(req: Request, res: Response) {
  try {
    const { companyIdentifier, username, totpToken } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');
    
    const result = await this.authService.completeTOTPLogin({
      companyIdentifier,
      username,
      totpToken,
      ipAddress,
      userAgent
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
}

/**
 * Single-Page Registration (UI Optimized)
 */
async registerSinglePage(req: Request, res: Response) {
  try {
    const registrationData = req.body;
    
    const result = await this.authService.registerSinglePage(registrationData);
    
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
}

/**
 * Force 2FA Setup (Strict Enforcement)
 */
async force2FASetup(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    const result = await this.authService.force2FASetup(userId);
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message,
    });
  }
}