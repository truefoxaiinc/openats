-- OpenATS Phase 1B.1: candidate-owned resume and profile foundation.
-- Additive only; recruiter tables, StoredFile and existing candidate rows are untouched.
CREATE TYPE "CandidateResumeStatus" AS ENUM ('STORED', 'DELETE_PENDING');
CREATE TYPE "CandidateResumeParseJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "CandidateResume" (
 "id" TEXT NOT NULL, "candidateAccountId" TEXT NOT NULL, "storageKey" TEXT NOT NULL,
 "originalFilename" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL,
 "sha256" TEXT NOT NULL, "isPrimary" BOOLEAN NOT NULL DEFAULT false,
 "status" "CandidateResumeStatus" NOT NULL DEFAULT 'STORED',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CandidateResume_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateProfile" (
 "id" TEXT NOT NULL, "candidateAccountId" TEXT NOT NULL, "headline" TEXT, "summary" TEXT,
 "location" TEXT, "linkedinUrl" TEXT, "websiteUrl" TEXT, "githubUrl" TEXT,
 "totalExperienceMonths" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateEducation" (
 "id" TEXT NOT NULL, "candidateProfileId" TEXT NOT NULL, "institution" TEXT NOT NULL, "degree" TEXT,
 "fieldOfStudy" TEXT, "location" TEXT, "startDate" TIMESTAMP(3), "endDate" TIMESTAMP(3),
 "description" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CandidateEducation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateExperience" (
 "id" TEXT NOT NULL, "candidateProfileId" TEXT NOT NULL, "company" TEXT NOT NULL, "title" TEXT NOT NULL,
 "employmentType" TEXT, "location" TEXT, "startDate" TIMESTAMP(3), "endDate" TIMESTAMP(3),
 "isCurrent" BOOLEAN NOT NULL DEFAULT false, "description" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CandidateExperience_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateSkill" (
 "id" TEXT NOT NULL, "candidateProfileId" TEXT NOT NULL, "name" TEXT NOT NULL, "category" TEXT,
 "proficiency" TEXT, "yearsExperience" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateProject" (
 "id" TEXT NOT NULL, "candidateProfileId" TEXT NOT NULL, "name" TEXT NOT NULL, "role" TEXT,
 "description" TEXT, "url" TEXT, "startDate" TIMESTAMP(3), "endDate" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CandidateProject_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateCertification" (
 "id" TEXT NOT NULL, "candidateProfileId" TEXT NOT NULL, "name" TEXT NOT NULL, "issuer" TEXT,
 "credentialId" TEXT, "credentialUrl" TEXT, "issuedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CandidateCertification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateLanguage" (
 "id" TEXT NOT NULL, "candidateProfileId" TEXT NOT NULL, "name" TEXT NOT NULL, "proficiency" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CandidateLanguage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CandidateResumeParseJob" (
 "id" TEXT NOT NULL, "candidateAccountId" TEXT NOT NULL, "candidateResumeId" TEXT NOT NULL,
 "status" "CandidateResumeParseJobStatus" NOT NULL DEFAULT 'QUEUED', "attempts" INTEGER NOT NULL DEFAULT 0,
 "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "startedAt" TIMESTAMP(3),
 "completedAt" TIMESTAMP(3), "errorCode" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CandidateResumeParseJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CandidateResume_storageKey_key" ON "CandidateResume"("storageKey");
CREATE UNIQUE INDEX "CandidateResume_id_candidateAccountId_key" ON "CandidateResume"("id", "candidateAccountId");
CREATE INDEX "CandidateResume_candidateAccountId_createdAt_idx" ON "CandidateResume"("candidateAccountId", "createdAt");
CREATE INDEX "CandidateResume_candidateAccountId_isPrimary_idx" ON "CandidateResume"("candidateAccountId", "isPrimary");
CREATE INDEX "CandidateResume_sha256_idx" ON "CandidateResume"("sha256");
CREATE UNIQUE INDEX "CandidateResume_one_primary_per_candidate_key" ON "CandidateResume"("candidateAccountId") WHERE "isPrimary" = true;
CREATE UNIQUE INDEX "CandidateProfile_candidateAccountId_key" ON "CandidateProfile"("candidateAccountId");
CREATE INDEX "CandidateEducation_candidateProfileId_startDate_idx" ON "CandidateEducation"("candidateProfileId", "startDate");
CREATE INDEX "CandidateExperience_candidateProfileId_startDate_idx" ON "CandidateExperience"("candidateProfileId", "startDate");
CREATE UNIQUE INDEX "CandidateSkill_candidateProfileId_name_key" ON "CandidateSkill"("candidateProfileId", "name");
CREATE INDEX "CandidateSkill_candidateProfileId_idx" ON "CandidateSkill"("candidateProfileId");
CREATE INDEX "CandidateProject_candidateProfileId_startDate_idx" ON "CandidateProject"("candidateProfileId", "startDate");
CREATE INDEX "CandidateCertification_candidateProfileId_issuedAt_idx" ON "CandidateCertification"("candidateProfileId", "issuedAt");
CREATE UNIQUE INDEX "CandidateLanguage_candidateProfileId_name_key" ON "CandidateLanguage"("candidateProfileId", "name");
CREATE INDEX "CandidateLanguage_candidateProfileId_idx" ON "CandidateLanguage"("candidateProfileId");
CREATE INDEX "CandidateResumeParseJob_status_availableAt_idx" ON "CandidateResumeParseJob"("status", "availableAt");
CREATE INDEX "CandidateResumeParseJob_candidateAccountId_createdAt_idx" ON "CandidateResumeParseJob"("candidateAccountId", "createdAt");
CREATE INDEX "CandidateResumeParseJob_candidateResumeId_createdAt_idx" ON "CandidateResumeParseJob"("candidateResumeId", "createdAt");

ALTER TABLE "CandidateResume" ADD CONSTRAINT "CandidateResume_candidateAccountId_fkey"
 FOREIGN KEY ("candidateAccountId") REFERENCES "CandidateAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_candidateAccountId_fkey"
 FOREIGN KEY ("candidateAccountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateEducation" ADD CONSTRAINT "CandidateEducation_candidateProfileId_fkey"
 FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateExperience" ADD CONSTRAINT "CandidateExperience_candidateProfileId_fkey"
 FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidateProfileId_fkey"
 FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateProject" ADD CONSTRAINT "CandidateProject_candidateProfileId_fkey"
 FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateCertification" ADD CONSTRAINT "CandidateCertification_candidateProfileId_fkey"
 FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateLanguage" ADD CONSTRAINT "CandidateLanguage_candidateProfileId_fkey"
 FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateResumeParseJob" ADD CONSTRAINT "CandidateResumeParseJob_candidateResumeId_candidateAccountId_fkey"
 FOREIGN KEY ("candidateResumeId", "candidateAccountId") REFERENCES "CandidateResume"("id", "candidateAccountId") ON DELETE CASCADE ON UPDATE CASCADE;
