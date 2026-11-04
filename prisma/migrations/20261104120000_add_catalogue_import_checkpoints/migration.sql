CREATE TABLE "CatalogueImportRun" (
  "id" VARCHAR(80) PRIMARY KEY,
  "inputFingerprint" VARCHAR(64) NOT NULL,
  "totalRecords" INTEGER NOT NULL,
  "processedRecords" INTEGER NOT NULL DEFAULT 0,
  "batchSize" INTEGER NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'RUNNING',
  "errorSummary" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(6),
  CONSTRAINT "CatalogueImportRun_totalRecords_check" CHECK ("totalRecords" > 0),
  CONSTRAINT "CatalogueImportRun_batchSize_check" CHECK ("batchSize" BETWEEN 1 AND 250),
  CONSTRAINT "CatalogueImportRun_processedRecords_check" CHECK ("processedRecords" BETWEEN 0 AND "totalRecords"),
  CONSTRAINT "CatalogueImportRun_status_check" CHECK ("status" IN ('RUNNING','FAILED','COMPLETED'))
);
CREATE TABLE "CatalogueImportBatch" (
  "id" UUID PRIMARY KEY,
  "runId" VARCHAR(80) NOT NULL REFERENCES "CatalogueImportRun"("id") ON DELETE CASCADE,
  "batchNumber" INTEGER NOT NULL,
  "recordCount" INTEGER NOT NULL,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(16) NOT NULL DEFAULT 'RUNNING',
  "errorSummary" TEXT,
  "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(6),
  CONSTRAINT "CatalogueImportBatch_runId_batchNumber_key" UNIQUE ("runId","batchNumber"),
  CONSTRAINT "CatalogueImportBatch_batchNumber_check" CHECK ("batchNumber" >= 0),
  CONSTRAINT "CatalogueImportBatch_recordCount_check" CHECK ("recordCount" > 0),
  CONSTRAINT "CatalogueImportBatch_status_check" CHECK ("status" IN ('RUNNING','FAILED','COMPLETED'))
);
CREATE INDEX "CatalogueImportRun_status_updatedAt_idx" ON "CatalogueImportRun"("status","updatedAt");
CREATE INDEX "CatalogueImportBatch_runId_status_idx" ON "CatalogueImportBatch"("runId","status");
