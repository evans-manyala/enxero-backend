# Breaking Changes Analysis for Schema Extensions

## ⚠️ POTENTIAL BREAKING CHANGES IDENTIFIED

### 1. **CRITICAL: User.phoneNumber Unique Constraint**
```prisma
// BEFORE (current)
phoneNumber String? @db.VarChar(20)

// AFTER (proposed)
phoneNumber String? @unique @db.VarChar(20)
```

**Impact**: 
- ❌ **BREAKING**: If you have duplicate phone numbers in existing data, migration will FAIL
- ❌ **BREAKING**: Existing code that allows duplicate phone numbers will break

**Affected Code**:
- `UserService.updateProfile()` - lines 64, 88
- `EmployeeService` - phoneNumber handling
- Any bulk user imports with duplicate phones

### 2. **MEDIUM: Company Model New Required Enums**
```prisma
// NEW ENUM
status CompanyStatus @default(PENDING_VERIFICATION)
```

**Impact**:
- ⚠️ **POTENTIAL BREAKING**: Existing queries filtering by company status
- ⚠️ **POTENTIAL BREAKING**: Company creation logic expects different status values

### 3. **LOW: New Optional Fields**
```prisma
// NEW FIELDS (all optional, so non-breaking)
companyId      String? @unique @db.VarChar(30)
countryCode    String? @db.VarChar(2)
phoneVerified  Boolean @default(false)
```

**Impact**: 
- ✅ **NON-BREAKING**: All new fields are optional with defaults

## 🛡️ SAFE MIGRATION STRATEGY

### Phase 1: Data Cleanup (REQUIRED)
```sql
-- 1. Check for duplicate phone numbers
SELECT "phoneNumber", COUNT(*) 
FROM users 
WHERE "phoneNumber" IS NOT NULL 
GROUP BY "phoneNumber" 
HAVING COUNT(*) > 1;

-- 2. Clean up duplicates (choose strategy)
-- Option A: Set duplicates to NULL
UPDATE users 
SET "phoneNumber" = NULL 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "phoneNumber" ORDER BY "createdAt") as rn
    FROM users 
    WHERE "phoneNumber" IS NOT NULL
  ) t WHERE rn > 1
);

-- Option B: Append suffix to duplicates
UPDATE users 
SET "phoneNumber" = "phoneNumber" || '_' || id::text
WHERE id IN (/* duplicate IDs */);
```

### Phase 2: Gradual Schema Migration
```sql
-- Step 1: Add new optional fields first
ALTER TABLE companies 
ADD COLUMN "companyId" VARCHAR(30),
ADD COLUMN "countryCode" VARCHAR(2),
ADD COLUMN "phoneNumber" VARCHAR(20),
ADD COLUMN "status" VARCHAR(30) DEFAULT 'ACTIVE';

-- Step 2: Add phoneVerified to users
ALTER TABLE users 
ADD COLUMN "phoneVerified" BOOLEAN DEFAULT false;

-- Step 3: Add unique constraint AFTER cleanup
ALTER TABLE users 
ADD CONSTRAINT "users_phoneNumber_unique" UNIQUE ("phoneNumber");
```

### Phase 3: Backward Compatibility Layer
```typescript
// Create wrapper service for gradual transition
export class CompanyServiceV2 extends CompanyService {
  async createCompany(data: CreateCompanyData) {
    // Handle both old and new formats
    const companyData = {
      ...data,
      status: data.status || 'ACTIVE', // Default for existing code
      companyId: data.companyId || data.identifier, // Fallback
    };
    
    return super.createCompany(companyData);
  }
}
```

## 🔧 CODE MODIFICATIONS NEEDED

### 1. Update Company Service
```typescript
// src/modules/companies/services/company.service.ts
interface CreateCompanyData {
  name: string;
  identifier?: string;
  companyId?: string;        // NEW
  countryCode?: string;      // NEW
  phoneNumber?: string;      // NEW
  status?: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'; // NEW
  // ... existing fields
}
```

### 2. Update User Service
```typescript
// src/modules/users/services/user.service.ts
async updateProfile(userId: string, data: {
  phoneNumber?: string;
  // ... other fields
}) {
  // Add phone number validation
  if (data.phoneNumber) {
    const existingUser = await this.prisma.user.findFirst({
      where: { 
        phoneNumber: data.phoneNumber,
        NOT: { id: userId }
      }
    });
    
    if (existingUser) {
      throw new AppError('Phone number already in use', 409);
    }
  }
  
  return this.prisma.user.update({
    where: { id: userId },
    data,
    // ... rest of method
  });
}
```

### 3. Update Validation Schemas
```typescript
// Add phone number uniqueness validation
const updateProfileSchema = z.object({
  body: z.object({
    phoneNumber: z.string()
      .regex(/^\+[1-9]\d{1,14}$/, 'Invalid E.164 phone format')
      .optional(),
    // ... other fields
  })
});
```

## 📋 MIGRATION CHECKLIST

- [ ] **CRITICAL**: Backup production database
- [ ] **CRITICAL**: Check for duplicate phone numbers
- [ ] **CRITICAL**: Clean up duplicate phone numbers
- [ ] Test migration on staging environment
- [ ] Update validation schemas
- [ ] Update service methods to handle new fields
- [ ] Add error handling for unique constraint violations
- [ ] Update API documentation
- [ ] Test existing endpoints still work
- [ ] Deploy with feature flags for new functionality

## 🚨 ROLLBACK PLAN

If migration fails:
```sql
-- Remove unique constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS "users_phoneNumber_unique";

-- Remove new columns
ALTER TABLE companies 
DROP COLUMN IF EXISTS "companyId",
DROP COLUMN IF EXISTS "countryCode", 
DROP COLUMN IF EXISTS "status";

ALTER TABLE users 
DROP COLUMN IF EXISTS "phoneVerified";

-- Drop new tables
DROP TABLE IF EXISTS otps;
```

## ✅ RECOMMENDED APPROACH

1. **Phase 1**: Clean up existing data
2. **Phase 2**: Add new optional fields without constraints
3. **Phase 3**: Gradually migrate existing companies to use new fields
4. **Phase 4**: Add unique constraints after data is clean
5. **Phase 5**: Implement new OTP functionality as separate endpoints
6. **Phase 6**: Gradually migrate existing authentication to use new flow

This approach minimizes breaking changes and allows for gradual adoption.
