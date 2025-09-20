# Prisma Schema Extension Implementation Guide

## Step-by-Step Implementation

### 1. Update Your Prisma Schema

Replace your existing `schema.prisma` with the extended version. Key changes:

```prisma
// Add to Company model
companyId      String?         @unique @db.VarChar(30)
countryCode    String?         @db.VarChar(2)
phoneNumber    String?         @db.VarChar(20)
status         CompanyStatus   @default(PENDING_VERIFICATION)

// Add to User model  
phoneNumber    String?         @unique @db.VarChar(20)
phoneVerified  Boolean         @default(false)

// Add new OTP model
model Otp {
  id          String    @id @default(uuid())
  phoneNumber String    @db.VarChar(20)
  otpHash     String    @db.VarChar(255)
  // ... rest of fields
}
```

### 2. Generate and Run Migration

```bash
# Generate migration
npx prisma migrate dev --name add_company_registration_otp

# Generate Prisma client
npx prisma generate

# Apply to production (when ready)
npx prisma migrate deploy
```

### 3. Create OTP Service

```typescript
// src/services/otp.service.ts
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

export class OtpService {
  private prisma = new PrismaClient();

  async generateOtp(phoneNumber: string, type: 'COMPANY_REGISTRATION' | 'USER_LOGIN') {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = crypto.randomBytes(32).toString('hex');
    const otpHash = crypto.createHash('sha256').update(otp + salt).digest('hex');
    
    // Invalidate existing pending OTPs
    await this.prisma.otp.updateMany({
      where: { phoneNumber, type, status: 'PENDING' },
      data: { status: 'CANCELLED' }
    });

    // Create new OTP
    const otpRecord = await this.prisma.otp.create({
      data: {
        phoneNumber,
        otpHash,
        salt,
        type,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      }
    });

    return { otp, otpId: otpRecord.id };
  }

  async verifyOtp(phoneNumber: string, otp: string, type: string): Promise<boolean> {
    const otpRecord = await this.prisma.otp.findFirst({
      where: {
        phoneNumber,
        type,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        attempts: { lt: 3 }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) return false;

    // Increment attempts
    await this.prisma.otp.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } }
    });

    // Verify OTP
    const computedHash = crypto.createHash('sha256')
      .update(otp + otpRecord.salt)
      .digest('hex');

    if (computedHash === otpRecord.otpHash) {
      await this.prisma.otp.update({
        where: { id: otpRecord.id },
        data: { status: 'VERIFIED', verifiedAt: new Date() }
      });
      return true;
    }

    // Mark as failed if max attempts reached
    if (otpRecord.attempts + 1 >= 3) {
      await this.prisma.otp.update({
        where: { id: otpRecord.id },
        data: { status: 'FAILED' }
      });
    }

    return false;
  }
}
```

### 4. Create Company ID Generator

```typescript
// src/services/company-id.service.ts
export class CompanyIdService {
  private prisma = new PrismaClient();

  async generateCompanyId(countryCode: string, companyName: string): Promise<string> {
    const companyShort = companyName
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
      .substring(0, 5)
      .padEnd(2, 'X');

    let attempts = 0;
    while (attempts < 100) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const companyId = `${countryCode}-${companyShort}-${randomSuffix}`;

      const exists = await this.prisma.company.findUnique({
        where: { companyId }
      });

      if (!exists) return companyId;
      attempts++;
    }

    throw new Error('Unable to generate unique company ID');
  }
}
```

### 5. Update Company Registration Endpoint

```typescript
// src/controllers/company-registration.controller.ts
export class CompanyRegistrationController {
  private otpService = new OtpService();
  private companyIdService = new CompanyIdService();
  private smsService = new SmsService(); // Your SMS provider

  async registerCompany(req: Request, res: Response) {
    const { country, companyName, phoneNumber } = req.body;

    // Validate country code
    if (!this.isValidCountryCode(country)) {
      return res.status(400).json({ error: 'Invalid country code' });
    }

    // Generate company ID
    const companyId = await this.companyIdService.generateCompanyId(country, companyName);

    // Create company record
    const company = await this.prisma.company.create({
      data: {
        name: companyName,
        companyId,
        countryCode: country,
        phoneNumber,
        status: 'PENDING_VERIFICATION'
      }
    });

    // Generate and send OTP
    const { otp } = await this.otpService.generateOtp(phoneNumber, 'COMPANY_REGISTRATION');
    await this.smsService.sendOtp(phoneNumber, otp);

    res.status(201).json({
      companyId,
      status: 'PENDING_VERIFICATION',
      message: `Company registered. OTP sent to ${phoneNumber}`
    });
  }

  async verifyCompanyOtp(req: Request, res: Response) {
    const { companyId, otp } = req.body;

    const company = await this.prisma.company.findUnique({
      where: { companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const isValid = await this.otpService.verifyOtp(
      company.phoneNumber!, 
      otp, 
      'COMPANY_REGISTRATION'
    );

    if (isValid) {
      await this.prisma.company.update({
        where: { companyId },
        data: { status: 'ACTIVE' }
      });

      res.json({
        companyId,
        status: 'ACTIVE',
        message: 'Company successfully verified'
      });
    } else {
      res.status(400).json({
        error: 'Invalid or expired OTP',
        attemptsRemaining: await this.getRemainingAttempts(company.phoneNumber!, 'COMPANY_REGISTRATION')
      });
    }
  }
}
```

## Best Practices Implementation

### 1. Security Measures
- **Never store plain OTPs** - Always hash with salt
- **Rate limiting** - Implement endpoint-specific limits
- **Phone validation** - Use E.164 format validation
- **Audit logging** - Track all OTP operations

### 2. Performance Optimizations
- **Database indexes** - All search fields are indexed
- **OTP cleanup** - Automated cleanup of expired OTPs
- **Connection pooling** - Configure Prisma connection limits

### 3. Error Handling
```typescript
// Custom error classes
export class OtpError extends Error {
  constructor(message: string, public code: 'EXPIRED' | 'INVALID' | 'MAX_ATTEMPTS') {
    super(message);
  }
}

export class CompanyRegistrationError extends Error {
  constructor(message: string, public code: 'DUPLICATE_PHONE' | 'INVALID_COUNTRY') {
    super(message);
  }
}
```

### 4. Environment Configuration
```env
# Add to .env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number

# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_PER_HOUR=3
```

### 5. Testing Strategy
```typescript
// Example test
describe('OTP Service', () => {
  it('should generate and verify OTP correctly', async () => {
    const { otp } = await otpService.generateOtp('+254712345678', 'COMPANY_REGISTRATION');
    const isValid = await otpService.verifyOtp('+254712345678', otp, 'COMPANY_REGISTRATION');
    expect(isValid).toBe(true);
  });

  it('should fail after max attempts', async () => {
    const { otp } = await otpService.generateOtp('+254712345678', 'COMPANY_REGISTRATION');
    
    // 3 failed attempts
    for (let i = 0; i < 3; i++) {
      await otpService.verifyOtp('+254712345678', '000000', 'COMPANY_REGISTRATION');
    }
    
    // Should fail even with correct OTP
    const isValid = await otpService.verifyOtp('+254712345678', otp, 'COMPANY_REGISTRATION');
    expect(isValid).toBe(false);
  });
});
```

## Migration Checklist

- [ ] Backup existing database
- [ ] Update Prisma schema
- [ ] Generate migration files
- [ ] Test migration on staging
- [ ] Implement OTP service
- [ ] Implement company ID generator
- [ ] Update API endpoints
- [ ] Add SMS provider integration
- [ ] Implement rate limiting
- [ ] Add comprehensive tests
- [ ] Deploy to production
- [ ] Monitor for issues

## Monitoring & Maintenance

### Key Metrics to Track
- OTP success/failure rates
- Company registration completion rates
- SMS delivery rates
- API response times
- Failed authentication attempts

### Scheduled Maintenance
- Daily: Clean up expired OTPs
- Weekly: Review failed registration attempts
- Monthly: Analyze SMS costs and optimize
