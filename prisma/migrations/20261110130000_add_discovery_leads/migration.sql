CREATE TABLE "DiscoveryLead" (
  "reviewId" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(240) NOT NULL,
  "originalUrl" TEXT NOT NULL,
  "canonicalUrl" TEXT NOT NULL,
  "sourceCategory" VARCHAR(120),
  "suggestedCategory" VARCHAR(120),
  "priority" VARCHAR(16) NOT NULL,
  "disposition" VARCHAR(40) NOT NULL,
  "evidenceIssues" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "automatedResearch" JSONB,
  "importEligible" BOOLEAN NOT NULL DEFAULT FALSE,
  "verificationStatus" VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  "publicationStatus" VARCHAR(24) NOT NULL DEFAULT 'NOT_PUBLISHED',
  "humanReviewRequired" BOOLEAN NOT NULL DEFAULT TRUE,
  "sourceRevision" VARCHAR(40) NOT NULL,
  "importedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscoveryLead_priority_check" CHECK ("priority" IN ('HIGH','NORMAL','LOW')),
  CONSTRAINT "DiscoveryLead_disposition_check" CHECK ("disposition" IN ('READY_FOR_MAINTAINER_REVIEW','REVIEW_REQUIRED')),
  CONSTRAINT "DiscoveryLead_import_gate_check" CHECK (
    "importEligible" = FALSE AND
    "verificationStatus" = 'UNVERIFIED' AND
    "publicationStatus" = 'NOT_PUBLISHED' AND
    "humanReviewRequired" = TRUE
  )
);
CREATE INDEX "DiscoveryLead_priority_disposition_idx" ON "DiscoveryLead"("priority","disposition");
CREATE INDEX "DiscoveryLead_category_priority_idx" ON "DiscoveryLead"("suggestedCategory","priority");
CREATE INDEX "DiscoveryLead_name_idx" ON "DiscoveryLead"("name");
