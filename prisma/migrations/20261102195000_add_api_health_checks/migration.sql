CREATE TABLE "ApiHealthCheck" (
    "id" UUID NOT NULL,
    "apiId" UUID NOT NULL,
    "isReachable" BOOLEAN NOT NULL,
    "statusCode" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "errorMessage" VARCHAR(500),
    "checkedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiHealthCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiHealthCheck_apiId_checkedAt_idx"
ON "ApiHealthCheck"("apiId", "checkedAt");

ALTER TABLE "ApiHealthCheck"
ADD CONSTRAINT "ApiHealthCheck_apiId_fkey"
FOREIGN KEY ("apiId") REFERENCES "Api"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
