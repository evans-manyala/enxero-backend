import nodemailer from 'nodemailer';
import env from '../../config/environment';
import logger from '../utils/logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: env.EMAIL_USER || '',
        pass: env.EMAIL_PASS || '',
      },
    } as EmailConfig);
  }

  /**
   * Send email with company identifier (Step 1)
   */
  async sendCompanyIdentifierEmail(
    email: string,
    firstName: string,
    companyName: string,
    identifier: string
  ) {
    try {
      const mailOptions = {
        from: `"Enxero Platform" <${env.EMAIL_FROM || env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Company Identifier - Enxero Registration',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to Enxero Platform!</h2>
            <p>Hi ${firstName},</p>
            <p>Thank you for starting your registration with Enxero Platform. Your company <strong>${companyName}</strong> has been assigned the following unique identifier:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="color: #1f2937; margin: 0; font-size: 24px; letter-spacing: 2px;">${identifier}</h3>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Company Identifier</p>
            </div>
            
            <p><strong>Important:</strong> Please save this identifier as you'll need it to access your company's workspace.</p>
            
            <p>Next step: Set up your username and password to continue the registration process.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This identifier follows the format AA-NANAANN where AA is your country code.<br>
              If you didn't request this registration, please ignore this email.
            </p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Company identifier email sent to ${email}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Error sending company identifier email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send credentials confirmation email (Step 2)
   */
  async sendCredentialsConfirmationEmail(
    email: string,
    firstName: string,
    username: string
  ) {
    try {
      const mailOptions = {
        from: `"Enxero Platform" <${env.EMAIL_FROM || env.EMAIL_USER}>`,
        to: email,
        subject: 'Credentials Set Successfully - Enxero Registration',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Credentials Confirmed!</h2>
            <p>Hi ${firstName},</p>
            <p>Great progress! Your login credentials have been set successfully:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Username:</strong> ${username}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">
                🔒 Your password is securely encrypted and stored safely.
              </p>
            </div>
            
            <p>Final step: Set up Two-Factor Authentication (2FA) to complete your registration and secure your account.</p>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e;">
                <strong>Security Note:</strong> 2FA is mandatory for all Enxero accounts to ensure maximum security.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              If you didn't set these credentials, please contact our support team immediately.
            </p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Credentials confirmation email sent to ${email}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Error sending credentials confirmation email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send welcome email (Step 3 - Registration Complete)
   */
  async sendWelcomeEmail(
    email: string,
    firstName: string,
    companyName: string,
    companyIdentifier: string
  ) {
    try {
      const mailOptions = {
        from: `"Enxero Platform" <${env.EMAIL_FROM || env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to Enxero Platform - Registration Complete!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">🎉 Registration Complete!</h2>
            <p>Hi ${firstName},</p>
            <p>Congratulations! Your registration for <strong>${companyName}</strong> is now complete and your account is ready to use.</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3 style="color: #15803d; margin-top: 0;">Your Account Details:</h3>
              <p><strong>Company:</strong> ${companyName}</p>
              <p><strong>Company ID:</strong> ${companyIdentifier}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Role:</strong> Company Administrator</p>
            </div>
            
            <h3 style="color: #1f2937;">What's Next?</h3>
            <ul style="line-height: 1.6;">
              <li>Log in to your account using your credentials</li>
              <li>Complete your company profile</li>
              <li>Add your first employees</li>
              <li>Set up payroll configurations</li>
              <li>Explore our workspace management features</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${env.FRONTEND_URL || 'https://app.enxero.com'}/login" 
                 style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Login to Your Account
              </a>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #374151; font-size: 14px;">
                <strong>Need Help?</strong> Check out our <a href="${env.FRONTEND_URL || 'https://app.enxero.com'}/docs">documentation</a> 
                or contact our support team at support@enxero.com
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              Thank you for choosing Enxero Platform for your workforce management needs!
            </p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send OTP email for login
   */
  async sendLoginOtpEmail(
    email: string,
    firstName: string,
    otpCode: string
  ) {
    try {
      const mailOptions = {
        from: `"Enxero Platform" <${env.EMAIL_FROM || env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Login Verification Code - Enxero Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Login Verification Code</h2>
            <p>Hi ${firstName},</p>
            <p>You requested to log in to your Enxero Platform account. Please use the verification code below:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="color: #1f2937; margin: 0; font-size: 32px; letter-spacing: 4px; font-family: monospace;">${otpCode}</h3>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Verification Code</p>
            </div>
            
            <p><strong>Important:</strong> This code will expire in 5 minutes for security reasons.</p>
            
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0; color: #991b1b;">
                <strong>Security Alert:</strong> If you didn't request this code, please secure your account immediately.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              Never share this code with anyone. Enxero staff will never ask for your verification codes.
            </p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Login OTP email sent to ${email}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Error sending login OTP email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified successfully');
      return { success: true, message: 'Email service is configured correctly' };
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
