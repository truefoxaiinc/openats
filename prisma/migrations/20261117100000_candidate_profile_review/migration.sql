-- Phase 1B.2A: additive candidate profile fields, field-level review metadata,
-- additional-information records, and expanded resume parse lifecycle.
-- Recruiter-owned tables and public application flows are intentionally untouched.

ALTER TYPE "CandidateResumeParseJobStatus" ADD VALUE IF NOT EXISTS 'UPLOADED';
ALTER TYPE "CandidateResumeParseJobStatus" ADD VALUE IF NOT EXISTS 'EXTRACTING';
ALTER TYPE "CandidateResumeParseJobStatus" ADD VALUE IF NOT EXISTS 'PARSING';
ALTER TYPE "CandidateResumeParseJobStatus" ADD VALUE IF NOT EXISTS 'REVIEW_REQUIRED';
ALTER TYPE "CandidateResumeParseJobStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "CandidateResumeParseJobStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "CandidateAdditionalInformationType" AS ENUM (
  'AWARD', 'PUBLICATION', 'VOLUNTEER_EXPERIENCE', 'PROFESSIONAL_MEMBERSHIP'
);
CREATE TYPE "CandidateProfileDataSource" AS ENUM (
  'AI_EXTRACTED', 'CANDIDATE_ENTERED', 'CANDIDATE_EDITED'
);
CREATE TYPE "CandidateProfileReviewStatus" AS ENUM (
  'PENDING', 'CONFIRMED', 'REJECTED'
);

ALTER TABLE "CandidateProfile"
  ADD COLUMN "country" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "portfolioUrl" TEXT;

ALTER TABLE "CandidateEducation"
  ADD COLUMN "gradeGpa" TEXT;

ALTER TABLE "CandidateExperience"
  ADD COLUMN "responsibilities" TEXT,
  ADD COLUMN "achievements" TEXT;

ALTER TABLE "CandidateProject"
  ADD COLUMN "technologies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "CandidateResumeParseJob"
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
  ADD COLUMN "safeErrorMessage" TEXT,
  ADD COLUMN "extractionMetadata" JSONB;

CREATE UNIQUE INDEX "CandidateProfile_id_candidateAccountId_key"
  ON "CandidateProfile"("id", "candidateAccountId");

CREATE TABLE "CandidateAdditionalInformation" (
  "id" TEXT NOT NULL,
  "candidateProfileId" TEXT NOT NULL,
  "type" "CandidateAdditionalInformationType" NOT NULL,
  "title" TEXT NOT NULL,
  "organization" TEXT,
  "description" TEXT,
  "url" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "occurredAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidateAdditionalInformation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateProfileFieldReview" (
  "id" TEXT NOT NULL,
  "candidateAccountId" TEXT NOT NULL,
  "candidateProfileId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "dataSource" "CandidateProfileDataSource" NOT NULL,
  "reviewStatus" "CandidateProfileReviewStatus" NOT NULL DEFAULT 'PENDING',
  "sourceResumeId" TEXT,
  "confidence" DOUBLE PRECISION,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidateProfileFieldReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CandidateProfileFieldReview_profile_entity_field_key"
  ON "CandidateProfileFieldReview"("candidateProfileId", "entityType", "entityId", "fieldKey");
CREATE INDEX "CandidateProfileFieldReview_candidateAccountId_reviewStatus_updatedAt_idx"
  ON "CandidateProfileFieldReview"("candidateAccountId", "reviewStatus", "updatedAt");
CREATE INDEX "CandidateProfileFieldReview_sourceResumeId_idx"
  ON "CandidateProfileFieldReview"("sourceResumeId");
CREATE INDEX "CandidateAdditionalInformation_candidateProfileId_type_occurredAt_idx"
  ON "CandidateAdditionalInformation"("candidateProfileId", "type", "occurredAt");

ALTER TABLE "CandidateAdditionalInformation"
  ADD CONSTRAINT "CandidateAdditionalInformation_candidateProfileId_fkey"
  FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateProfileFieldReview"
  ADD CONSTRAINT "CandidateProfileFieldReview_profile_candidateAccount_fkey"
  FOREIGN KEY ("candidateProfileId", "candidateAccountId")
  REFERENCES "CandidateProfile"("id", "candidateAccountId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateProfileFieldReview"
  ADD CONSTRAINT "CandidateProfileFieldReview_sourceResumeId_fkey"
  FOREIGN KEY ("sourceResumeId") REFERENCES "CandidateResume"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
