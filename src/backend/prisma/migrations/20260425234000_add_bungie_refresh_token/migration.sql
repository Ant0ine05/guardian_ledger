-- AlterTable
ALTER TABLE "User" ADD COLUMN "bungieRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "bungieTokenExpiresAt" DATETIME;
