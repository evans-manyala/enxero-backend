/*
  Warnings:

  - A unique constraint covering the columns `[companyId]` on the table `companies` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('COMPANY_REGISTRATION', 'USER_LOGIN', 'PASSWORD_RESET', 'PHONE_VERIFICATION');

-- CreateEnum
CREATE TYPE "OtpStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "companyId" VARCHAR(30),
ADD COLUMN     "countryCode" VARCHAR(2),
ADD COLUMN     "phoneNumber" VARCHAR(20),
ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION';

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "deviceId" VARCHAR(255),
ADD COLUMN     "ipAddress" VARCHAR(45),
ADD COLUMN     "revoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "userAgent" VARCHAR(500);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "otpHash" VARCHAR(255) NOT NULL,
    "salt" VARCHAR(255) NOT NULL,
    "type" "OtpType" NOT NULL,
    "purpose" VARCHAR(100),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "status" "OtpStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otps_phoneNumber_idx" ON "otps"("phoneNumber");

-- CreateIndex
CREATE INDEX "otps_type_idx" ON "otps"("type");

-- CreateIndex
CREATE INDEX "otps_status_idx" ON "otps"("status");

-- CreateIndex
CREATE INDEX "otps_expiresAt_idx" ON "otps"("expiresAt");

-- CreateIndex
CREATE INDEX "otps_createdAt_idx" ON "otps"("createdAt");

-- CreateIndex
CREATE INDEX "otps_companyId_idx" ON "otps"("companyId");

-- CreateIndex
CREATE INDEX "otps_userId_idx" ON "otps"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_companyId_key" ON "companies"("companyId");

-- CreateIndex
CREATE INDEX "companies_companyId_idx" ON "companies"("companyId");

-- CreateIndex
CREATE INDEX "companies_countryCode_idx" ON "companies"("countryCode");

-- CreateIndex
CREATE INDEX "companies_phoneNumber_idx" ON "companies"("phoneNumber");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE INDEX "refresh_tokens_revoked_idx" ON "refresh_tokens"("revoked");

-- CreateIndex
CREATE INDEX "refresh_tokens_deviceId_idx" ON "refresh_tokens"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_phoneNumber_idx" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_phoneVerified_idx" ON "users"("phoneVerified");

-- AddForeignKey
ALTER TABLE "otps" ADD CONSTRAINT "otps_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otps" ADD CONSTRAINT "otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
