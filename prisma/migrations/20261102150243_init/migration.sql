-- CreateEnum
CREATE TYPE "ApiStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'UNAVAILABLE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'STALE');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FREE', 'FREEMIUM', 'PAID', 'OPEN_SOURCE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('API_KEY', 'OAUTH2', 'BEARER_TOKEN', 'BASIC_AUTH', 'NONE', 'CUSTOM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('OFFICIAL_HOMEPAGE', 'DOCUMENTATION', 'PRICING', 'AUTHENTICATION', 'RATE_LIMITS', 'TERMS', 'STATUS', 'OTHER');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('ONE_TIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'USAGE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SubmissionKind" AS ENUM ('CREATE', 'UPDATE');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RevisionAction" AS ENUM ('CREATED', 'UPDATED', 'VERIFIED', 'STATUS_CHANGED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ApiProvider" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "homepageUrl" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ApiProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Api" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "summary" VARCHAR(280) NOT NULL,
    "description" TEXT,
    "providerId" UUID NOT NULL,
    "homepageUrl" TEXT NOT NULL,
    "documentationUrl" TEXT,
    "baseUrl" TEXT,
    "pricingModel" "PricingModel" NOT NULL DEFAULT 'UNKNOWN',
    "pricingSummary" TEXT,
    "status" "ApiStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMPTZ(6),
    "lastCheckedAt" TIMESTAMPTZ(6),
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Api_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "parentId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCategory" (
    "apiId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,

    CONSTRAINT "ApiCategory_pkey" PRIMARY KEY ("apiId","categoryId")
);

-- CreateTable
CREATE TABLE "ApiTag" (
    "apiId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ApiTag_pkey" PRIMARY KEY ("apiId","tagId")
);

-- CreateTable
CREATE TABLE "ApiAuthMethod" (
    "apiId" UUID NOT NULL,
    "method" "AuthMethod" NOT NULL,
    "details" TEXT,

    CONSTRAINT "ApiAuthMethod_pkey" PRIMARY KEY ("apiId","method")
);

-- CreateTable
CREATE TABLE "ApiSource" (
    "id" UUID NOT NULL,
    "apiId" UUID NOT NULL,
    "sourceKind" "SourceKind" NOT NULL,
    "url" TEXT NOT NULL,
    "title" VARCHAR(240),
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "checkedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRateLimit" (
    "id" UUID NOT NULL,
    "apiId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "requestCount" INTEGER,
    "windowSeconds" INTEGER,
    "scope" VARCHAR(160),
    "sourceId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiPricingPlan" (
    "id" UUID NOT NULL,
    "apiId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "priceAmount" DECIMAL(14,4),
    "currency" VARCHAR(3),
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'UNKNOWN',
    "isFreeTier" BOOLEAN NOT NULL DEFAULT false,
    "sourceId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ApiPricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiSubmission" (
    "id" UUID NOT NULL,
    "kind" "SubmissionKind" NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "targetApiId" UUID,
    "payload" JSONB NOT NULL,
    "submitterName" VARCHAR(120),
    "submitterGithub" VARCHAR(80),
    "reviewerGithub" VARCHAR(80),
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ApiSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionSource" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "sourceKind" "SourceKind" NOT NULL,
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRevision" (
    "id" UUID NOT NULL,
    "apiId" UUID NOT NULL,
    "action" "RevisionAction" NOT NULL,
    "actorGithub" VARCHAR(80),
    "summary" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiProvider_slug_key" ON "ApiProvider"("slug");

-- CreateIndex
CREATE INDEX "ApiProvider_name_idx" ON "ApiProvider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Api_slug_key" ON "Api"("slug");

-- CreateIndex
CREATE INDEX "Api_status_verificationStatus_idx" ON "Api"("status", "verificationStatus");

-- CreateIndex
CREATE INDEX "Api_providerId_idx" ON "Api"("providerId");

-- CreateIndex
CREATE INDEX "Api_pricingModel_idx" ON "Api"("pricingModel");

-- CreateIndex
CREATE INDEX "Api_updatedAt_idx" ON "Api"("updatedAt");

-- CreateIndex
CREATE INDEX "Api_featured_updatedAt_idx" ON "Api"("featured", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "ApiCategory_categoryId_idx" ON "ApiCategory"("categoryId");

-- CreateIndex
CREATE INDEX "ApiTag_tagId_idx" ON "ApiTag"("tagId");

-- CreateIndex
CREATE INDEX "ApiAuthMethod_method_idx" ON "ApiAuthMethod"("method");

-- CreateIndex
CREATE INDEX "ApiSource_apiId_sourceKind_idx" ON "ApiSource"("apiId", "sourceKind");

-- CreateIndex
CREATE UNIQUE INDEX "ApiSource_apiId_url_key" ON "ApiSource"("apiId", "url");

-- CreateIndex
CREATE INDEX "ApiRateLimit_apiId_idx" ON "ApiRateLimit"("apiId");

-- CreateIndex
CREATE INDEX "ApiRateLimit_sourceId_idx" ON "ApiRateLimit"("sourceId");

-- CreateIndex
CREATE INDEX "ApiPricingPlan_apiId_idx" ON "ApiPricingPlan"("apiId");

-- CreateIndex
CREATE INDEX "ApiPricingPlan_sourceId_idx" ON "ApiPricingPlan"("sourceId");

-- CreateIndex
CREATE INDEX "ApiSubmission_status_createdAt_idx" ON "ApiSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ApiSubmission_targetApiId_idx" ON "ApiSubmission"("targetApiId");

-- CreateIndex
CREATE INDEX "SubmissionSource_submissionId_idx" ON "SubmissionSource"("submissionId");

-- CreateIndex
CREATE INDEX "ApiRevision_apiId_createdAt_idx" ON "ApiRevision"("apiId", "createdAt");

-- AddForeignKey
ALTER TABLE "Api" ADD CONSTRAINT "Api_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ApiProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCategory" ADD CONSTRAINT "ApiCategory_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "Api"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCategory" ADD CONSTRAINT "ApiCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiTag" ADD CONSTRAINT "ApiTag_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "Api"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiTag" ADD CONSTRAINT "ApiTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiAuthMethod" ADD CONSTRAINT "ApiAuthMethod_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "Api"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiSource" ADD CONSTRAINT "ApiSource_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "Api"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiRateLimit" ADD CONSTRAINT "ApiRateLimit_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "Api"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiRateLimit" ADD CONSTRAINT "ApiRateLimit_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ApiSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiPricingPlan" ADD CONSTRAINT "ApiPricingPlan_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "Api"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiPricingPlan" ADD CONSTRAINT "ApiPricingPlan_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ApiSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiSubmission" ADD CONSTRAINT "ApiSubmission_targetApiId_fkey" FOREIGN KEY ("targetApiId") REFERENCES "Api"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionSource" ADD CONSTRAINT "SubmissionSource_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ApiSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiRevision" ADD CONSTRAINT "ApiRevision_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "Api"("id") ON DELETE CASCADE ON UPDATE CASCADE;
