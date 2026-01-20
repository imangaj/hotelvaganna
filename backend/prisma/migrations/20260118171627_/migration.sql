/*
  Warnings:

  - You are about to drop the `hotel_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "hotel_profiles";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "hotel_profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "amenities" TEXT,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "policies" TEXT,
    "heroImageUrl" TEXT,
    "updatedAt" DATETIME NOT NULL
);
