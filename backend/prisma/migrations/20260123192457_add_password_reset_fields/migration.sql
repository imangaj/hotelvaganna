-- AlterTable
ALTER TABLE "guest_accounts" ADD COLUMN "passwordResetExpires" DATETIME;
ALTER TABLE "guest_accounts" ADD COLUMN "passwordResetToken" TEXT;
