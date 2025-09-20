import { AppError } from '../utils/AppError';

export interface SMSProvider {
  sendSMS(phoneNumber: string, message: string): Promise<SMSResponse>;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
  provider: string;
}

export interface SMSConfig {
  provider: 'twilio' | 'aws-sns' | 'africastalking' | 'infobip' | 'custom';
  apiKey?: string;
  apiSecret?: string;
  senderId?: string;
  region?: string;
  endpoint?: string;
}

class TwilioProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  async sendSMS(phoneNumber: string, message: string): Promise<SMSResponse> {
    try {
      const twilio = require('twilio')(this.accountSid, this.authToken);
      
      const result = await twilio.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber,
      });

      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio',
        cost: parseFloat(result.price) || 0,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        provider: 'twilio',
      };
    }
  }
}

class AfricasTalkingProvider implements SMSProvider {
  private apiKey: string;
  private username: string;
  private senderId: string;

  constructor(apiKey: string, username: string, senderId: string) {
    this.apiKey = apiKey;
    this.username = username;
    this.senderId = senderId;
  }

  async sendSMS(phoneNumber: string, message: string): Promise<SMSResponse> {
    try {
      const AfricasTalking = require('africastalking')({
        apiKey: this.apiKey,
        username: this.username,
      });

      const sms = AfricasTalking.SMS;
      const result = await sms.send({
        to: phoneNumber,
        message: message,
        from: this.senderId,
      });

      const recipient = result.SMSMessageData.Recipients[0];
      
      return {
        success: recipient.status === 'Success',
        messageId: recipient.messageId,
        provider: 'africastalking',
        cost: parseFloat(recipient.cost) || 0,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        provider: 'africastalking',
      };
    }
  }
}

class AWSSNSProvider implements SMSProvider {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;

  constructor(accessKeyId: string, secretAccessKey: string, region: string = 'us-east-1') {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
  }

  async sendSMS(phoneNumber: string, message: string): Promise<SMSResponse> {
    try {
      const AWS = require('aws-sdk');
      
      AWS.config.update({
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        region: this.region,
      });

      const sns = new AWS.SNS();
      
      const params = {
        Message: message,
        PhoneNumber: phoneNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      };

      const result = await sns.publish(params).promise();

      return {
        success: true,
        messageId: result.MessageId,
        provider: 'aws-sns',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        provider: 'aws-sns',
      };
    }
  }
}

class InfobipProvider implements SMSProvider {
  private apiKey: string;
  private baseUrl: string;
  private senderId: string;

  constructor(apiKey: string, senderId: string, baseUrl: string = 'https://api.infobip.com') {
    this.apiKey = apiKey;
    this.senderId = senderId;
    this.baseUrl = baseUrl;
  }

  async sendSMS(phoneNumber: string, message: string): Promise<SMSResponse> {
    try {
      const axios = require('axios');
      
      const payload = {
        messages: [
          {
            from: this.senderId,
            destinations: [
              {
                to: phoneNumber,
              },
            ],
            text: message,
          },
        ],
      };

      const response = await axios.post(
        `${this.baseUrl}/sms/2/text/advanced`,
        payload,
        {
          headers: {
            'Authorization': `App ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      const result = response.data;
      const messageResult = result.messages[0];

      return {
        success: messageResult.status.groupId === 1, // Group 1 = PENDING/DELIVERED
        messageId: messageResult.messageId,
        provider: 'infobip',
        cost: messageResult.status.price || 0,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.requestError?.serviceException?.text || error.message,
        provider: 'infobip',
      };
    }
  }
}

class SMSService {
  private provider: SMSProvider;
  private config: SMSConfig;

  constructor(config: SMSConfig) {
    this.config = config;
    this.provider = this.initializeProvider(config);
  }

  private initializeProvider(config: SMSConfig): SMSProvider {
    switch (config.provider) {
      case 'twilio':
        if (!config.apiKey || !config.apiSecret || !config.senderId) {
          throw new AppError('Twilio configuration incomplete. Need apiKey, apiSecret, and senderId', 500);
        }
        return new TwilioProvider(config.apiKey, config.apiSecret, config.senderId);

      case 'africastalking':
        if (!config.apiKey || !config.apiSecret || !config.senderId) {
          throw new AppError('Africa\'s Talking configuration incomplete. Need apiKey, apiSecret, and senderId', 500);
        }
        return new AfricasTalkingProvider(config.apiKey, config.apiSecret, config.senderId);

      case 'aws-sns':
        if (!config.apiKey || !config.apiSecret) {
          throw new AppError('AWS SNS configuration incomplete. Need apiKey and apiSecret', 500);
        }
        return new AWSSNSProvider(config.apiKey, config.apiSecret, config.region);

      case 'infobip':
        if (!config.apiKey || !config.senderId) {
          throw new AppError('Infobip configuration incomplete. Need apiKey and senderId', 500);
        }
        return new InfobipProvider(config.apiKey, config.senderId, config.endpoint);

      default:
        throw new AppError(`Unsupported SMS provider: ${config.provider}`, 500);
    }
  }

  async sendOTP(phoneNumber: string, otpCode: string, companyName?: string): Promise<SMSResponse> {
    const message = companyName 
      ? `Your ${companyName} verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`
      : `Your Enxero verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`;

    return await this.provider.sendSMS(phoneNumber, message);
  }

  async sendCustomMessage(phoneNumber: string, message: string): Promise<SMSResponse> {
    return await this.provider.sendSMS(phoneNumber, message);
  }

  getProviderInfo(): { provider: string; configured: boolean } {
    return {
      provider: this.config.provider,
      configured: true,
    };
  }
}

// Factory function to create SMS service from environment variables
export const createSMSService = (): SMSService => {
  const provider = (process.env.SMS_PROVIDER as SMSConfig['provider']) || 'twilio';
  
  const config: SMSConfig = {
    provider,
    apiKey: process.env.SMS_API_KEY,
    apiSecret: process.env.SMS_API_SECRET,
    senderId: process.env.SMS_SENDER_ID,
    region: process.env.SMS_REGION || 'us-east-1',
  };

  return new SMSService(config);
};

export default SMSService;
