CREATE TABLE "ApiRateLimitBucket" (
    "key" VARCHAR(64) NOT NULL,
    "windowStart" TIMESTAMPTZ(6) NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ApiRateLimitBucket_pkey" PRIMARY KEY ("key", "windowStart"),
    CONSTRAINT "ApiRateLimitBucket_count_check" CHECK ("count" > 0)
);

CREATE INDEX "ApiRateLimitBucket_expiresAt_idx"
ON "ApiRateLimitBucket"("expiresAt");
