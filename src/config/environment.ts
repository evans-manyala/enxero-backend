import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  
  // Email configuration
  EMAIL_HOST: z.string().default('smtp.gmail.com'),
  EMAIL_PORT: z.string().default('587'),
  EMAIL_USER: z.string().default(''),
  EMAIL_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default(''),
  
  // SMS/OTP Configuration
  SMS_PROVIDER: z.string().default('infobip'),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().default('InfoSMS'),
  SMS_ENDPOINT: z.string().default('https://jj4exk.api.infobip.com'),
  
  // File Upload Configuration
  MAX_FILE_SIZE: z.string().default('10485760'), // 10MB
  UPLOAD_PATH: z.string().default('./uploads'),
  
  // Frontend URL for links in emails
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

const env = envSchema.parse(process.env);

export default env;