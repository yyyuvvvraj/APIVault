ALTER TABLE "ApiSubmission" ADD COLUMN "submitterUserId" TEXT;
ALTER TABLE "ApiSubmission"
  ADD CONSTRAINT "ApiSubmission_submitterUserId_fkey"
  FOREIGN KEY ("submitterUserId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ApiSubmission_submitterUserId_createdAt_idx"
  ON "ApiSubmission"("submitterUserId", "createdAt");
