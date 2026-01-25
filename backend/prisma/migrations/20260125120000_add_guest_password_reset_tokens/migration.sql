-- CreateTable
CREATE TABLE "guest_password_reset_tokens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "guestAccountId" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guest_password_reset_tokens_guestAccountId_fkey" FOREIGN KEY ("guestAccountId") REFERENCES "guest_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "guest_password_reset_tokens_token_key" ON "guest_password_reset_tokens"("token");
