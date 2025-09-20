# Step-by-Step Migration Guide

## 🚀 Migration Process

### Step 1: Backup Your Database
```bash
# Create a backup before migration
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Replace Schema File
```bash
# Navigate to your backend directory
cd /Users/evansmanyala/enxero-project/enxero-platform-backend

# Backup current schema
cp prisma/schema.prisma prisma/schema-backup.prisma

# Replace with updated schema
cp prisma/schema-updated.prisma prisma/schema.prisma
```

### Step 3: Generate Migration
```bash
# Generate Prisma migration
npx prisma migrate dev --name "add-otp-and-company-extensions"
```

### Step 4: Apply Migration
```bash
# The migration will be applied automatically with the above command
# If you need to apply manually:
npx prisma migrate deploy
```

### Step 5: Generate Prisma Client
```bash
# Regenerate Prisma client with new schema
npx prisma generate
```

### Step 6: Verify Migration
```bash
# Check database status
npx prisma migrate status

# View the database in Prisma Studio
npx prisma studio
```

## 🔍 What the Migration Will Do

### Database Changes:
1. **Companies Table**:
   - Add `companyId` VARCHAR(30) UNIQUE
   - Add `countryCode` VARCHAR(2)
   - Add `phoneNumber` VARCHAR(20)
   - Add `status` VARCHAR(30) DEFAULT 'PENDING_VERIFICATION'
   - Add indexes for new fields

2. **Users Table**:
   - Add UNIQUE constraint to `phoneNumber`
   - Add `phoneVerified` BOOLEAN DEFAULT false
   - Add index for `phoneVerified`

3. **RefreshTokens Table**:
   - Add `deviceId` VARCHAR(255)
   - Add `ipAddress` VARCHAR(45)
   - Add `userAgent` VARCHAR(500)
   - Add `revoked` BOOLEAN DEFAULT false
   - Add `revokedAt` TIMESTAMP

4. **New OTPs Table**:
   - Complete OTP management system
   - Secure hashed storage
   - Attempt tracking
   - Status management

5. **New Enums**:
   - `CompanyStatus` enum
   - `OtpType` enum
   - `OtpStatus` enum

## ⚠️ Important Notes

- **No data loss**: All existing data will be preserved
- **Backward compatibility**: Existing code will continue to work
- **New fields are optional**: No immediate code changes required
- **Unique constraint**: phoneNumber uniqueness will be enforced

## 🧪 Testing After Migration

```bash
# Test database connection
npx prisma db pull

# Verify schema matches
npx prisma validate

# Check if you can create records
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('✅ Prisma client works!');
prisma.\$disconnect();
"
```

## 🔄 Rollback Plan (if needed)

```bash
# Restore original schema
cp prisma/schema-backup.prisma prisma/schema.prisma

# Reset database to previous state
npx prisma migrate reset --force

# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

## 📝 Next Steps After Migration

1. **Update TypeScript types** (Prisma will auto-generate)
2. **Implement OTP service** (see implementation-guide.md)
3. **Add company ID generation logic**
4. **Create new API endpoints for OTP flows**
5. **Update existing validation schemas**
6. **Add SMS provider integration**

Run the migration when you're ready!
