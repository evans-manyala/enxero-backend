/*
  Warnings:

  - You are about to drop the column `entityId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to alter the column `action` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `userId` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the column `companyId` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `failed_login_attempts` table. All the data in the column will be lost.
  - You are about to alter the column `filename` on the `files` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `storageName` on the `files` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `mimetype` on the `files` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `description` on the `files` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `entityType` on the `files` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `entityId` on the `files` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the column `approvalNotes` on the `leave_requests` table. All the data in the column will be lost.
  - You are about to drop the column `approverId` on the `leave_requests` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `leave_requests` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionNotes` on the `leave_requests` table. All the data in the column will be lost.
  - You are about to drop the column `otpHash` on the `otps` table. All the data in the column will be lost.
  - You are about to drop the column `salt` on the `otps` table. All the data in the column will be lost.
  - You are about to drop the column `allowances` on the `payroll_configs` table. All the data in the column will be lost.
  - You are about to drop the column `deductions` on the `payroll_configs` table. All the data in the column will be lost.
  - You are about to drop the column `payDay` on the `payroll_configs` table. All the data in the column will be lost.
  - You are about to drop the column `deviceId` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `revoked` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `revokedAt` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `user_activities` table. All the data in the column will be lost.
  - You are about to alter the column `token` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the column `accountStatus` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `deactivatedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `deactivationReason` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastPasswordChange` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHistory` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phoneVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `preferences` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `Integration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IntegrationLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SystemConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SystemLog` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email,companyId]` on the table `employees` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employeeId,typeId,year]` on the table `leave_balances` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,companyId]` on the table `leave_types` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,companyId]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,companyId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username,companyId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `recordId` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tableName` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Made the column `companyId` on table `email_logs` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `companyId` to the `files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadedBy` to the `files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `form_fields` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `form_responses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `form_submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `leave_balances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `days` to the `leave_requests` table without a default value. This is not possible if the table is not empty.
  - Made the column `companyId` on table `otps` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `totalAmount` to the `payroll_periods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `user_activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `user_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."OtpType" ADD VALUE 'EMAIL_VERIFICATION';

-- DropForeignKey
ALTER TABLE "public"."Integration" DROP CONSTRAINT "Integration_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."IntegrationLog" DROP CONSTRAINT "IntegrationLog_integrationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."email_logs" DROP CONSTRAINT "email_logs_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."failed_login_attempts" DROP CONSTRAINT "failed_login_attempts_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."leave_requests" DROP CONSTRAINT "leave_requests_approverId_fkey";

-- DropForeignKey
ALTER TABLE "public"."otps" DROP CONSTRAINT "otps_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."payroll_records" DROP CONSTRAINT "payroll_records_periodId_fkey";

-- DropIndex
DROP INDEX "public"."audit_logs_entityId_idx";

-- DropIndex
DROP INDEX "public"."audit_logs_entityType_idx";

-- DropIndex
DROP INDEX "public"."audit_logs_userId_idx";

-- DropIndex
DROP INDEX "public"."companies_companyId_idx";

-- DropIndex
DROP INDEX "public"."companies_companyId_key";

-- DropIndex
DROP INDEX "public"."companies_countryCode_idx";

-- DropIndex
DROP INDEX "public"."companies_identifier_idx";

-- DropIndex
DROP INDEX "public"."companies_isActive_idx";

-- DropIndex
DROP INDEX "public"."companies_name_idx";

-- DropIndex
DROP INDEX "public"."companies_phoneNumber_idx";

-- DropIndex
DROP INDEX "public"."companies_status_idx";

-- DropIndex
DROP INDEX "public"."email_logs_recipient_idx";

-- DropIndex
DROP INDEX "public"."email_logs_sentAt_idx";

-- DropIndex
DROP INDEX "public"."email_logs_status_idx";

-- DropIndex
DROP INDEX "public"."employees_department_idx";

-- DropIndex
DROP INDEX "public"."employees_email_idx";

-- DropIndex
DROP INDEX "public"."employees_email_key";

-- DropIndex
DROP INDEX "public"."employees_employeeId_idx";

-- DropIndex
DROP INDEX "public"."employees_hireDate_idx";

-- DropIndex
DROP INDEX "public"."employees_managerId_idx";

-- DropIndex
DROP INDEX "public"."employees_position_idx";

-- DropIndex
DROP INDEX "public"."employees_status_idx";

-- DropIndex
DROP INDEX "public"."employees_userId_idx";

-- DropIndex
DROP INDEX "public"."failed_login_attempts_userId_idx";

-- DropIndex
DROP INDEX "public"."form_fields_formId_idx";

-- DropIndex
DROP INDEX "public"."form_fields_name_idx";

-- DropIndex
DROP INDEX "public"."form_fields_order_idx";

-- DropIndex
DROP INDEX "public"."form_fields_type_idx";

-- DropIndex
DROP INDEX "public"."form_responses_fieldName_idx";

-- DropIndex
DROP INDEX "public"."form_responses_submissionId_idx";

-- DropIndex
DROP INDEX "public"."form_submissions_formId_idx";

-- DropIndex
DROP INDEX "public"."form_submissions_submittedAt_idx";

-- DropIndex
DROP INDEX "public"."form_submissions_submittedBy_idx";

-- DropIndex
DROP INDEX "public"."forms_category_idx";

-- DropIndex
DROP INDEX "public"."forms_companyId_idx";

-- DropIndex
DROP INDEX "public"."forms_createdAt_idx";

-- DropIndex
DROP INDEX "public"."forms_createdBy_idx";

-- DropIndex
DROP INDEX "public"."forms_isTemplate_idx";

-- DropIndex
DROP INDEX "public"."forms_status_idx";

-- DropIndex
DROP INDEX "public"."forms_title_idx";

-- DropIndex
DROP INDEX "public"."leave_balances_employeeId_idx";

-- DropIndex
DROP INDEX "public"."leave_balances_typeId_idx";

-- DropIndex
DROP INDEX "public"."leave_balances_year_idx";

-- DropIndex
DROP INDEX "public"."leave_requests_approverId_idx";

-- DropIndex
DROP INDEX "public"."leave_requests_typeId_idx";

-- DropIndex
DROP INDEX "public"."leave_types_isActive_idx";

-- DropIndex
DROP INDEX "public"."notifications_category_idx";

-- DropIndex
DROP INDEX "public"."notifications_companyId_idx";

-- DropIndex
DROP INDEX "public"."notifications_createdAt_idx";

-- DropIndex
DROP INDEX "public"."notifications_isRead_idx";

-- DropIndex
DROP INDEX "public"."notifications_type_idx";

-- DropIndex
DROP INDEX "public"."notifications_userId_idx";

-- DropIndex
DROP INDEX "public"."otps_createdAt_idx";

-- DropIndex
DROP INDEX "public"."otps_type_idx";

-- DropIndex
DROP INDEX "public"."otps_userId_idx";

-- DropIndex
DROP INDEX "public"."payroll_configs_companyId_idx";

-- DropIndex
DROP INDEX "public"."payroll_periods_endDate_idx";

-- DropIndex
DROP INDEX "public"."payroll_periods_startDate_idx";

-- DropIndex
DROP INDEX "public"."payroll_records_companyId_idx";

-- DropIndex
DROP INDEX "public"."payroll_records_employeeId_idx";

-- DropIndex
DROP INDEX "public"."payroll_records_payPeriodEnd_idx";

-- DropIndex
DROP INDEX "public"."payroll_records_payPeriodStart_idx";

-- DropIndex
DROP INDEX "public"."payroll_records_processedAt_idx";

-- DropIndex
DROP INDEX "public"."payroll_records_status_idx";

-- DropIndex
DROP INDEX "public"."refresh_tokens_deviceId_idx";

-- DropIndex
DROP INDEX "public"."refresh_tokens_expiresAt_idx";

-- DropIndex
DROP INDEX "public"."refresh_tokens_revoked_idx";

-- DropIndex
DROP INDEX "public"."refresh_tokens_token_idx";

-- DropIndex
DROP INDEX "public"."refresh_tokens_userId_idx";

-- DropIndex
DROP INDEX "public"."roles_isActive_idx";

-- DropIndex
DROP INDEX "public"."roles_name_idx";

-- DropIndex
DROP INDEX "public"."roles_name_key";

-- DropIndex
DROP INDEX "public"."users_accountStatus_idx";

-- DropIndex
DROP INDEX "public"."users_emailVerified_idx";

-- DropIndex
DROP INDEX "public"."users_email_idx";

-- DropIndex
DROP INDEX "public"."users_email_key";

-- DropIndex
DROP INDEX "public"."users_isActive_idx";

-- DropIndex
DROP INDEX "public"."users_lastLogin_idx";

-- DropIndex
DROP INDEX "public"."users_lastPasswordChange_idx";

-- DropIndex
DROP INDEX "public"."users_phoneNumber_idx";

-- DropIndex
DROP INDEX "public"."users_phoneNumber_key";

-- DropIndex
DROP INDEX "public"."users_phoneVerified_idx";

-- DropIndex
DROP INDEX "public"."users_roleId_idx";

-- DropIndex
DROP INDEX "public"."users_username_idx";

-- DropIndex
DROP INDEX "public"."users_username_key";

-- AlterTable
ALTER TABLE "public"."audit_logs" DROP COLUMN "entityId",
DROP COLUMN "entityType",
DROP COLUMN "metadata",
DROP COLUMN "updatedAt",
ADD COLUMN     "ipAddress" VARCHAR(45),
ADD COLUMN     "newValues" JSONB,
ADD COLUMN     "oldValues" JSONB,
ADD COLUMN     "recordId" VARCHAR(255) NOT NULL,
ADD COLUMN     "tableName" VARCHAR(100) NOT NULL,
ADD COLUMN     "userAgent" VARCHAR(500),
ALTER COLUMN "action" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "public"."companies" DROP COLUMN "companyId",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "public"."email_logs" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."failed_login_attempts" DROP COLUMN "userId",
ADD COLUMN     "companyId" TEXT,
ALTER COLUMN "userAgent" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "public"."files" ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "uploadedBy" TEXT NOT NULL,
ALTER COLUMN "filename" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "storageName" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "mimetype" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "entityType" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "entityId" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "public"."form_fields" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."form_responses" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."form_submissions" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."leave_balances" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."leave_requests" DROP COLUMN "approvalNotes",
DROP COLUMN "approverId",
DROP COLUMN "notes",
DROP COLUMN "rejectionNotes",
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "comments" TEXT,
ADD COLUMN     "days" INTEGER NOT NULL,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "rejectedBy" TEXT;

-- AlterTable
ALTER TABLE "public"."leave_types" ADD COLUMN     "carryOver" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."otps" DROP COLUMN "otpHash",
DROP COLUMN "salt",
ALTER COLUMN "purpose" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."payroll_configs" DROP COLUMN "allowances",
DROP COLUMN "deductions",
DROP COLUMN "payDay",
ALTER COLUMN "payFrequency" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "public"."payroll_periods" ADD COLUMN     "totalAmount" DECIMAL(12,2) NOT NULL,
ALTER COLUMN "status" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "public"."payroll_records" ALTER COLUMN "periodId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."refresh_tokens" DROP COLUMN "deviceId",
DROP COLUMN "ipAddress",
DROP COLUMN "revoked",
DROP COLUMN "revokedAt",
DROP COLUMN "userAgent",
ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."roles" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."user_activities" DROP COLUMN "metadata",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "details" JSONB,
ALTER COLUMN "userAgent" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "public"."user_sessions" ADD COLUMN     "companyId" TEXT NOT NULL,
ALTER COLUMN "token" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "userAgent" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "accountStatus",
DROP COLUMN "bio",
DROP COLUMN "deactivatedAt",
DROP COLUMN "deactivationReason",
DROP COLUMN "language",
DROP COLUMN "lastPasswordChange",
DROP COLUMN "passwordHistory",
DROP COLUMN "phoneVerified",
DROP COLUMN "preferences",
DROP COLUMN "timezone",
ALTER COLUMN "twoFactorSetupRequired" SET DEFAULT false;

-- DropTable
DROP TABLE "public"."Integration";

-- DropTable
DROP TABLE "public"."IntegrationLog";

-- DropTable
DROP TABLE "public"."SystemConfig";

-- DropTable
DROP TABLE "public"."SystemLog";

-- DropEnum
DROP TYPE "public"."CompanyStatus";

-- CreateTable
CREATE TABLE "public"."system_configs" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_logs" (
    "id" TEXT NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."integrations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "config" JSONB,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."integration_logs" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "public"."system_configs"("key");

-- CreateIndex
CREATE INDEX "system_logs_level_idx" ON "public"."system_logs"("level");

-- CreateIndex
CREATE INDEX "system_logs_createdAt_idx" ON "public"."system_logs"("createdAt");

-- CreateIndex
CREATE INDEX "integrations_companyId_idx" ON "public"."integrations"("companyId");

-- CreateIndex
CREATE INDEX "integration_logs_integrationId_idx" ON "public"."integration_logs"("integrationId");

-- CreateIndex
CREATE INDEX "integration_logs_status_idx" ON "public"."integration_logs"("status");

-- CreateIndex
CREATE INDEX "integration_logs_createdAt_idx" ON "public"."integration_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_tableName_idx" ON "public"."audit_logs"("tableName");

-- CreateIndex
CREATE INDEX "audit_logs_recordId_idx" ON "public"."audit_logs"("recordId");

-- CreateIndex
CREATE INDEX "email_logs_companyId_status_idx" ON "public"."email_logs"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_companyId_key" ON "public"."employees"("email", "companyId");

-- CreateIndex
CREATE INDEX "failed_login_attempts_companyId_idx" ON "public"."failed_login_attempts"("companyId");

-- CreateIndex
CREATE INDEX "files_companyId_idx" ON "public"."files"("companyId");

-- CreateIndex
CREATE INDEX "files_entityType_entityId_idx" ON "public"."files"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "form_fields_companyId_idx" ON "public"."form_fields"("companyId");

-- CreateIndex
CREATE INDEX "form_fields_formId_companyId_idx" ON "public"."form_fields"("formId", "companyId");

-- CreateIndex
CREATE INDEX "form_responses_companyId_idx" ON "public"."form_responses"("companyId");

-- CreateIndex
CREATE INDEX "form_responses_submissionId_companyId_idx" ON "public"."form_responses"("submissionId", "companyId");

-- CreateIndex
CREATE INDEX "form_submissions_companyId_idx" ON "public"."form_submissions"("companyId");

-- CreateIndex
CREATE INDEX "form_submissions_formId_companyId_idx" ON "public"."form_submissions"("formId", "companyId");

-- CreateIndex
CREATE INDEX "form_submissions_submittedBy_companyId_idx" ON "public"."form_submissions"("submittedBy", "companyId");

-- CreateIndex
CREATE INDEX "leave_balances_companyId_idx" ON "public"."leave_balances"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employeeId_typeId_year_key" ON "public"."leave_balances"("employeeId", "typeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_name_companyId_key" ON "public"."leave_types"("name", "companyId");

-- CreateIndex
CREATE INDEX "otps_companyId_phoneNumber_idx" ON "public"."otps"("companyId", "phoneNumber");

-- CreateIndex
CREATE INDEX "otps_companyId_status_idx" ON "public"."otps"("companyId", "status");

-- CreateIndex
CREATE INDEX "refresh_tokens_companyId_idx" ON "public"."refresh_tokens"("companyId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_companyId_idx" ON "public"."refresh_tokens"("userId", "companyId");

-- CreateIndex
CREATE INDEX "roles_companyId_idx" ON "public"."roles"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_companyId_key" ON "public"."roles"("name", "companyId");

-- CreateIndex
CREATE INDEX "user_activities_companyId_idx" ON "public"."user_activities"("companyId");

-- CreateIndex
CREATE INDEX "user_activities_userId_companyId_idx" ON "public"."user_activities"("userId", "companyId");

-- CreateIndex
CREATE INDEX "user_activities_companyId_action_idx" ON "public"."user_activities"("companyId", "action");

-- CreateIndex
CREATE INDEX "user_sessions_companyId_idx" ON "public"."user_sessions"("companyId");

-- CreateIndex
CREATE INDEX "user_sessions_userId_companyId_idx" ON "public"."user_sessions"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_companyId_key" ON "public"."users"("email", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_companyId_key" ON "public"."users"("username", "companyId");

-- AddForeignKey
ALTER TABLE "public"."roles" ADD CONSTRAINT "roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."form_fields" ADD CONSTRAINT "form_fields_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."form_submissions" ADD CONSTRAINT "form_submissions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."form_responses" ADD CONSTRAINT "form_responses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payroll_records" ADD CONSTRAINT "payroll_records_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "public"."payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_logs" ADD CONSTRAINT "email_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."failed_login_attempts" ADD CONSTRAINT "failed_login_attempts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_activities" ADD CONSTRAINT "user_activities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."otps" ADD CONSTRAINT "otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integrations" ADD CONSTRAINT "integrations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integration_logs" ADD CONSTRAINT "integration_logs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "public"."integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_requests" ADD CONSTRAINT "leave_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_requests" ADD CONSTRAINT "leave_requests_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_balances" ADD CONSTRAINT "leave_balances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
