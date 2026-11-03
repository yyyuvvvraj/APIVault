CREATE TABLE "ApiKey" (
  "id" UUID NOT NULL,
  "userId" TEXT NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "keyPrefix" VARCHAR(24) NOT NULL,
  "keyHash" VARCHAR(64) NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY['catalogue:read']::TEXT[],
  "expiresAt" TIMESTAMPTZ(6),
  "lastUsedAt" TIMESTAMPTZ(6),
  "revokedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ApiKey_keyPrefix_key" ON "ApiKey"("keyPrefix");
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_userId_revokedAt_idx" ON "ApiKey"("userId", "revokedAt");
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");

CREATE TABLE "ContributorProfile" (
  "id" UUID NOT NULL,
  "userId" TEXT NOT NULL,
  "handle" VARCHAR(39) NOT NULL,
  "displayName" VARCHAR(80) NOT NULL,
  "bio" VARCHAR(280),
  "websiteUrl" TEXT,
  "githubUrl" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ContributorProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContributorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ContributorProfile_userId_key" ON "ContributorProfile"("userId");
CREATE UNIQUE INDEX "ContributorProfile_handle_key" ON "ContributorProfile"("handle");
CREATE INDEX "ContributorProfile_isPublic_handle_idx" ON "ContributorProfile"("isPublic", "handle");
