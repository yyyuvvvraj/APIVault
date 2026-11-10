#!/usr/bin/env tsx
/**
 * Idempotently imports the full-catalogue disposition artifact into the
 * separate discovery queue. This never creates or publishes Api records.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type DiscoveryRecord = {
  reviewId: string;
  name: string;
  originalUrl: string;
  canonicalUrl: string;
  sourceCategory?: string;
  suggestedCategory?: string;
  priority: "HIGH" | "NORMAL" | "LOW";
  disposition: "READY_FOR_MAINTAINER_REVIEW" | "REVIEW_REQUIRED";
  evidenceIssues?: string[];
  automatedResearch?: Record<string, unknown> | null;
  importEligible: false;
  verificationStatus: "UNVERIFIED";
  publicationStatus: "NOT_PUBLISHED";
  humanReviewRequired?: true;
};
type DispositionReport = {
  sourceRevision: string;
  sourceTotal: number;
  processed: number;
  records: DiscoveryRecord[];
};

function assertRecord(record: DiscoveryRecord, index: number): void {
  if (!record.reviewId || !record.name || !record.originalUrl || !record.canonicalUrl) {
    throw new Error(`Record ${index} is missing its stable ID, name, or source URL.`);
  }
  if (!["HIGH", "NORMAL", "LOW"].includes(record.priority)) {
    throw new Error(`Record ${record.reviewId} has an unsupported priority.`);
  }
  if (!["READY_FOR_MAINTAINER_REVIEW", "REVIEW_REQUIRED"].includes(record.disposition)) {
    throw new Error(`Record ${record.reviewId} has an unsupported disposition.`);
  }
  if (record.importEligible !== false || record.verificationStatus !== "UNVERIFIED" ||
      record.publicationStatus !== "NOT_PUBLISHED") {
    throw new Error(`Record ${record.reviewId} violates the mandatory publication safety gate.`);
  }
  for (const candidate of [record.originalUrl, record.canonicalUrl]) {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(`Record ${record.reviewId} contains a non-HTTP source URL.`);
    }
  }
}

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("Usage: npx tsx scripts/import-discovery-disposition.ts <full-catalogue-disposition.json>");
  const expected = Number(process.env.EXPECTED_DISCOVERY_LEADS ?? "2284");
  const report = JSON.parse(await readFile(input, "utf8")) as DispositionReport;
  if (!report.sourceRevision || report.processed !== expected || report.sourceTotal !== expected ||
      !Array.isArray(report.records) || report.records.length !== expected) {
    throw new Error(`Expected a complete ${expected}-lead report; got processed=${report.processed}, sourceTotal=${report.sourceTotal}, records=${report.records?.length}.`);
  }
  const ids = new Set<string>();
  report.records.forEach((record, index) => {
    assertRecord(record, index);
    if (ids.has(record.reviewId)) throw new Error(`Duplicate reviewId: ${record.reviewId}`);
    ids.add(record.reviewId);
  });

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const chunkSize = 100;
    for (let offset = 0; offset < report.records.length; offset += chunkSize) {
      const chunk = report.records.slice(offset, offset + chunkSize);
      await prisma.$transaction(
        chunk.map((record) => prisma.discoveryLead.upsert({
          where: { reviewId: record.reviewId },
          create: {
            reviewId: record.reviewId,
            name: record.name.slice(0, 240),
            originalUrl: record.originalUrl,
            canonicalUrl: record.canonicalUrl,
            sourceCategory: record.sourceCategory?.slice(0, 120) ?? null,
            suggestedCategory: record.suggestedCategory?.slice(0, 120) ?? null,
            priority: record.priority,
            disposition: record.disposition,
            evidenceIssues: (record.evidenceIssues ?? []) as Prisma.InputJsonValue,
            automatedResearch: record.automatedResearch
              ? record.automatedResearch as Prisma.InputJsonValue
              : Prisma.DbNull,
            importEligible: false,
            verificationStatus: "UNVERIFIED",
            publicationStatus: "NOT_PUBLISHED",
            humanReviewRequired: true,
            sourceRevision: report.sourceRevision,
          },
          update: {
            name: record.name.slice(0, 240),
            originalUrl: record.originalUrl,
            canonicalUrl: record.canonicalUrl,
            sourceCategory: record.sourceCategory?.slice(0, 120) ?? null,
            suggestedCategory: record.suggestedCategory?.slice(0, 120) ?? null,
            priority: record.priority,
            disposition: record.disposition,
            evidenceIssues: (record.evidenceIssues ?? []) as Prisma.InputJsonValue,
            automatedResearch: record.automatedResearch
              ? record.automatedResearch as Prisma.InputJsonValue
              : Prisma.DbNull,
            importEligible: false,
            verificationStatus: "UNVERIFIED",
            publicationStatus: "NOT_PUBLISHED",
            humanReviewRequired: true,
            sourceRevision: report.sourceRevision,
            importedAt: new Date(),
          },
        })),
        { timeout: 30000 },
      );
      console.info(`Imported ${Math.min(offset + chunk.length, expected)}/${expected} discovery leads`);
    }
    const imported = await prisma.discoveryLead.count({ where: { sourceRevision: report.sourceRevision } });
    if (imported !== expected) throw new Error(`Post-import integrity check failed: expected ${expected}, found ${imported}.`);
    console.info(`Discovery catalogue import complete: ${imported}/${expected}; all remain UNVERIFIED and NOT_PUBLISHED.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Discovery catalogue import failed:", error);
  process.exitCode = 1;
});
