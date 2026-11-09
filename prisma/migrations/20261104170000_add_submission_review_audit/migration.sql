CREATE TABLE "SubmissionReviewEvent" (
  "id" UUID NOT NULL,
  "submissionId" UUID NOT NULL,
  "previousStatus" "SubmissionStatus" NOT NULL,
  "nextStatus" "SubmissionStatus" NOT NULL,
  "note" TEXT,
  "reviewerUserId" VARCHAR(128) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionReviewEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubmissionReviewEvent_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "ApiSubmission"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SubmissionReviewEvent_submissionId_createdAt_idx"
  ON "SubmissionReviewEvent"("submissionId", "createdAt");
CREATE INDEX "SubmissionReviewEvent_reviewerUserId_createdAt_idx"
  ON "SubmissionReviewEvent"("reviewerUserId", "createdAt");
