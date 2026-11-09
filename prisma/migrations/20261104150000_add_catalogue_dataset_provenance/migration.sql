ALTER TABLE "CatalogueImportRun"
  ADD COLUMN "datasetName" VARCHAR(160),
  ADD COLUMN "datasetSourceUrl" TEXT,
  ADD COLUMN "datasetVersion" VARCHAR(80),
  ADD COLUMN "retrievedAt" TIMESTAMPTZ(6),
  ADD COLUMN "license" VARCHAR(120),
  ADD COLUMN "attribution" TEXT;
