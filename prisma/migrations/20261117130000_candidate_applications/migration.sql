-- Phase 1B.6: link verified candidate applications to the existing ATS pipeline.
-- Additive only; no historical applications are auto-linked or backfilled.
CREATE TABLE "CandidateApplication" (
  "id" TEXT NOT NULL,
  "candidateAccountId" TEXT NOT NULL,
  "postingId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "resumeId" TEXT,
  "answers" JSONB,
  "withdrawnAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidateApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CandidateApplication_opportunityId_key"
  ON "CandidateApplication"("opportunityId");
CREATE UNIQUE INDEX "CandidateApplication_candidateAccountId_postingId_key"
  ON "CandidateApplication"("candidateAccountId", "postingId");
CREATE INDEX "CandidateApplication_candidateAccountId_createdAt_idx"
  ON "CandidateApplication"("candidateAccountId", "createdAt");
CREATE INDEX "CandidateApplication_postingId_createdAt_idx"
  ON "CandidateApplication"("postingId", "createdAt");

ALTER TABLE "CandidateApplication"
  ADD CONSTRAINT "CandidateApplication_candidateAccountId_fkey"
  FOREIGN KEY ("candidateAccountId") REFERENCES "CandidateAccount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateApplication"
  ADD CONSTRAINT "CandidateApplication_postingId_fkey"
  FOREIGN KEY ("postingId") REFERENCES "Posting"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateApplication"
  ADD CONSTRAINT "CandidateApplication_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateApplication"
  ADD CONSTRAINT "CandidateApplication_resumeId_fkey"
  FOREIGN KEY ("resumeId") REFERENCES "CandidateResume"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
