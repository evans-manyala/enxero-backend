"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('3000'),
    DATABASE_URL: zod_1.z.string(),
    JWT_SECRET: zod_1.z.string(),
    JWT_REFRESH_SECRET: zod_1.z.string(),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    // Email configuration
    EMAIL_HOST: zod_1.z.string().default('smtp.gmail.com'),
    EMAIL_PORT: zod_1.z.string().default('587'),
    EMAIL_USER: zod_1.z.string().default(''),
    EMAIL_PASS: zod_1.z.string().default(''),
    EMAIL_FROM: zod_1.z.string().default(''),
    // SMS/OTP Configuration
    SMS_PROVIDER: zod_1.z.string().default('infobip'),
    SMS_API_KEY: zod_1.z.string().optional(),
    SMS_SENDER_ID: zod_1.z.string().default('InfoSMS'),
    SMS_ENDPOINT: zod_1.z.string().default('https://jj4exk.api.infobip.com'),
    // File Upload Configuration
    MAX_FILE_SIZE: zod_1.z.string().default('10485760'), // 10MB
    UPLOAD_PATH: zod_1.z.string().default('./uploads'),
    // Frontend URL for links in emails
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000'),
});
const env = envSchema.parse(process.env);
exports.default = env;
