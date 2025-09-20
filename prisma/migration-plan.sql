-- PostgreSQL Migration Plan for Company Registration & SMS OTP
-- Execute these migrations in order

-- Migration 1: Extend Companies Table
ALTER TABLE companies 
ADD COLUMN "companyId" VARCHAR(30) UNIQUE,
ADD COLUMN "countryCode" VARCHAR(2),
ADD COLUMN "phoneNumber" VARCHAR(20),
ADD COLUMN "status" VARCHAR(30) DEFAULT 'PENDING_VERIFICATION';

-- Add indexes for new columns
CREATE INDEX "companies_companyId_idx" ON companies("companyId");
CREATE INDEX "companies_countryCode_idx" ON companies("countryCode");
CREATE INDEX "companies_phoneNumber_idx" ON companies("phoneNumber");
CREATE INDEX "companies_status_idx" ON companies("status");

-- Migration 2: Extend Users Table
ALTER TABLE users 
ADD COLUMN "phoneVerified" BOOLEAN DEFAULT false;

-- Add unique constraint to phoneNumber (if not already exists)
ALTER TABLE users 
ADD CONSTRAINT "users_phoneNumber_unique" UNIQUE ("phoneNumber");

-- Add index for phone verification
CREATE INDEX "users_phoneVerified_idx" ON users("phoneVerified");

-- Migration 3: Create OTPs Table
CREATE TABLE otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "phoneNumber" VARCHAR(20) NOT NULL,
  "otpHash" VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL,
  purpose VARCHAR(100),
  "expiresAt" TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  "maxAttempts" INTEGER DEFAULT 3,
  status VARCHAR(20) DEFAULT 'PENDING',
  "verifiedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "companyId" UUID REFERENCES companies(id) ON DELETE CASCADE,
  "userId" UUID REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for OTPs table
CREATE INDEX "otps_phoneNumber_idx" ON otps("phoneNumber");
CREATE INDEX "otps_type_idx" ON otps("type");
CREATE INDEX "otps_status_idx" ON otps("status");
CREATE INDEX "otps_expiresAt_idx" ON otps("expiresAt");
CREATE INDEX "otps_createdAt_idx" ON otps("createdAt");
CREATE INDEX "otps_companyId_idx" ON otps("companyId");
CREATE INDEX "otps_userId_idx" ON otps("userId");

-- Migration 4: Extend RefreshTokens Table (Optional)
ALTER TABLE refresh_tokens 
ADD COLUMN "deviceId" VARCHAR(255),
ADD COLUMN "ipAddress" VARCHAR(45),
ADD COLUMN "userAgent" VARCHAR(500),
ADD COLUMN revoked BOOLEAN DEFAULT false,
ADD COLUMN "revokedAt" TIMESTAMP;

-- Add indexes for new refresh token columns
CREATE INDEX "refresh_tokens_revoked_idx" ON refresh_tokens(revoked);
CREATE INDEX "refresh_tokens_deviceId_idx" ON refresh_tokens("deviceId");

-- Migration 5: Add Check Constraints
ALTER TABLE companies 
ADD CONSTRAINT "companies_countryCode_check" 
CHECK ("countryCode" IS NULL OR LENGTH("countryCode") = 2);

ALTER TABLE companies 
ADD CONSTRAINT "companies_status_check" 
CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'INACTIVE'));

ALTER TABLE otps 
ADD CONSTRAINT "otps_type_check" 
CHECK (type IN ('COMPANY_REGISTRATION', 'USER_LOGIN', 'PASSWORD_RESET', 'PHONE_VERIFICATION'));

ALTER TABLE otps 
ADD CONSTRAINT "otps_status_check" 
CHECK (status IN ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED', 'CANCELLED'));

ALTER TABLE otps 
ADD CONSTRAINT "otps_attempts_check" 
CHECK (attempts >= 0 AND attempts <= "maxAttempts");

-- Migration 6: Create Cleanup Function for Expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  UPDATE otps 
  SET status = 'EXPIRED', "updatedAt" = NOW()
  WHERE status = 'PENDING' 
    AND "expiresAt" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-otps', '*/5 * * * *', 'SELECT cleanup_expired_otps();');

-- Migration 7: Create Company ID Generation Function
CREATE OR REPLACE FUNCTION generate_company_id(
  country_code VARCHAR(2),
  company_name VARCHAR(255)
) RETURNS VARCHAR(30) AS $$
DECLARE
  company_short VARCHAR(5);
  random_suffix VARCHAR(6);
  generated_id VARCHAR(30);
  counter INTEGER := 0;
BEGIN
  -- Extract first 5 alphanumeric characters from company name
  company_short := UPPER(REGEXP_REPLACE(
    SUBSTRING(company_name FROM 1 FOR 5), 
    '[^A-Z0-9]', '', 'g'
  ));
  
  -- Ensure minimum length
  IF LENGTH(company_short) < 2 THEN
    company_short := LPAD(company_short, 2, 'X');
  END IF;
  
  LOOP
    -- Generate random 6-character suffix
    random_suffix := UPPER(SUBSTRING(
      MD5(RANDOM()::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT) 
      FROM 1 FOR 6
    ));
    
    -- Combine parts
    generated_id := country_code || '-' || company_short || '-' || random_suffix;
    
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM companies WHERE "companyId" = generated_id) THEN
      RETURN generated_id;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique company ID after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Migration 8: Create OTP Hashing Functions
CREATE OR REPLACE FUNCTION hash_otp(otp_code VARCHAR(6), salt VARCHAR(255))
RETURNS VARCHAR(255) AS $$
BEGIN
  RETURN ENCODE(SHA256((otp_code || salt)::BYTEA), 'hex');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verify_otp(
  phone VARCHAR(20),
  otp_code VARCHAR(6),
  otp_type VARCHAR(30)
) RETURNS BOOLEAN AS $$
DECLARE
  stored_record RECORD;
  computed_hash VARCHAR(255);
BEGIN
  -- Get the latest pending OTP for this phone and type
  SELECT * INTO stored_record
  FROM otps 
  WHERE "phoneNumber" = phone 
    AND type = otp_type 
    AND status = 'PENDING'
    AND "expiresAt" > NOW()
    AND attempts < "maxAttempts"
  ORDER BY "createdAt" DESC 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Compute hash with stored salt
  computed_hash := hash_otp(otp_code, stored_record.salt);
  
  -- Increment attempts
  UPDATE otps 
  SET attempts = attempts + 1, "updatedAt" = NOW()
  WHERE id = stored_record.id;
  
  -- Check if hash matches
  IF computed_hash = stored_record."otpHash" THEN
    -- Mark as verified
    UPDATE otps 
    SET status = 'VERIFIED', "verifiedAt" = NOW(), "updatedAt" = NOW()
    WHERE id = stored_record.id;
    RETURN TRUE;
  ELSE
    -- Check if max attempts reached
    IF stored_record.attempts + 1 >= stored_record."maxAttempts" THEN
      UPDATE otps 
      SET status = 'FAILED', "updatedAt" = NOW()
      WHERE id = stored_record.id;
    END IF;
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;
