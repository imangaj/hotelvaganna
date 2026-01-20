-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_daily_rates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "roomTypeId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "price" REAL NOT NULL,
    "availableCount" INTEGER,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "enableBreakfast" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "daily_rates_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "daily_rates_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_daily_rates" ("availableCount", "createdAt", "date", "id", "price", "propertyId", "roomTypeId", "updatedAt") SELECT "availableCount", "createdAt", "date", "id", "price", "propertyId", "roomTypeId", "updatedAt" FROM "daily_rates";
DROP TABLE "daily_rates";
ALTER TABLE "new_daily_rates" RENAME TO "daily_rates";
CREATE UNIQUE INDEX "daily_rates_propertyId_roomTypeId_date_key" ON "daily_rates"("propertyId", "roomTypeId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
