-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_hotel_profile" (
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
    "websiteTitle" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#2E5D4B',
    "secondaryColor" TEXT DEFAULT '#C5A059',
    "footerText" TEXT,
    "footerCopyright" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "twitterUrl" TEXT,
    "contentJson" TEXT DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_hotel_profile" ("address", "amenities", "checkInTime", "checkOutTime", "city", "contentJson", "country", "description", "email", "facebookUrl", "footerCopyright", "footerText", "heroImageUrl", "id", "instagramUrl", "logoUrl", "name", "phone", "policies", "primaryColor", "secondaryColor", "twitterUrl", "updatedAt", "websiteTitle") SELECT "address", "amenities", "checkInTime", "checkOutTime", "city", "contentJson", "country", "description", "email", "facebookUrl", "footerCopyright", "footerText", "heroImageUrl", "id", "instagramUrl", "logoUrl", "name", "phone", "policies", "primaryColor", "secondaryColor", "twitterUrl", "updatedAt", "websiteTitle" FROM "hotel_profile";
DROP TABLE "hotel_profile";
ALTER TABLE "new_hotel_profile" RENAME TO "hotel_profile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
