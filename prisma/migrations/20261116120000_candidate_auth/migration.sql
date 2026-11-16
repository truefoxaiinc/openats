-- Phase 1A: isolated candidate identities, sessions and explicit application claims.
-- This file is intentionally not executed as part of this change.

CREATE TABLE "CandidateAccount" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT,
  "emailVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidateAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateOAuthIdentity" (
  "id" TEXT NOT NULL,
  "candidateAccountId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "emailAtProvider" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateOAuthIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateSession" (
  "id" TEXT NOT NULL,
  "candidateAccountId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateEmailVerificationToken" (
  "id" TEXT NOT NULL,
  "candidateAccountId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateEmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidatePasswordResetToken" (
  "id" TEXT NOT NULL,
  "candidateAccountId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidatePasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateApplicationClaimToken" (
  "id" TEXT NOT NULL,
  "candidateAccountId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateApplicationClaimToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateContactLink" (
  "id" TEXT NOT NULL,
  "candidateAccountId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateContactLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CandidateAccount_email_key" ON "CandidateAccount"("email");
CREATE INDEX "CandidateAccount_emailVerifiedAt_idx" ON "CandidateAccount"("emailVerifiedAt");
CREATE UNIQUE INDEX "CandidateOAuthIdentity_provider_providerAccountId_key" ON "CandidateOAuthIdentity"("provider", "providerAccountId");
CREATE INDEX "CandidateOAuthIdentity_candidateAccountId_idx" ON "CandidateOAuthIdentity"("candidateAccountId");
CREATE UNIQUE INDEX "CandidateSession_tokenHash_key" ON "CandidateSession"("tokenHash");
CREATE INDEX "CandidateSession_candidateAccountId_expiresAt_idx" ON "CandidateSession"("candidateAccountId", "expiresAt");
CREATE INDEX "CandidateSession_expiresAt_idx" ON "CandidateSession"("expiresAt");
CREATE UNIQUE INDEX "CandidateEmailVerificationToken_tokenHash_key" ON "CandidateEmailVerificationToken"("tokenHash");
CREATE INDEX "CandidateEmailVerificationToken_candidateAccountId_expiresAt_idx" ON "CandidateEmailVerificationToken"("candidateAccountId", "expiresAt");
CREATE UNIQUE INDEX "CandidatePasswordResetToken_tokenHash_key" ON "CandidatePasswordResetToken"("tokenHash");
CREATE INDEX "CandidatePasswordResetToken_candidateAccountId_expiresAt_idx" ON "CandidatePasswordResetToken"("candidateAccountId", "expiresAt");
CREATE UNIQUE INDEX "CandidateApplicationClaimToken_tokenHash_key" ON "CandidateApplicationClaimToken"("tokenHash");
CREATE INDEX "CandidateApplicationClaimToken_candidateAccountId_expiresAt_idx" ON "CandidateApplicationClaimToken"("candidateAccountId", "expiresAt");
CREATE UNIQUE INDEX "CandidateContactLink_contactId_key" ON "CandidateContactLink"("contactId");
CREATE UNIQUE INDEX "CandidateContactLink_candidateAccountId_contactId_key" ON "CandidateContactLink"("candidateAccountId", "contactId");
CREATE INDEX "CandidateContactLink_candidateAccountId_createdAt_idx" ON "CandidateContactLink"("candidateAccountId", "createdAt");

ALTER TABLE "CandidateOAuthIdentity" ADD CONSTRAINT "CandidateOAuthIdentity_candidateAccountId_fkey" FOREIGN KEY ("candidateAccountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateSession" ADD CONSTRAINT "CandidateSession_candidateAccountId_fkey" FOREIGN KEY ("candidateAccountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateEmailVerificationToken" ADD CONSTRAINT "CandidateEmailVerificationToken_candidateAccountId_fkey" FOREIGN KEY ("candidateAccountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidatePasswordResetToken" ADD CONSTRAINT "CandidatePasswordResetToken_candidateAccountId_fkey" FOREIGN KEY ("candidateAccountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateApplicationClaimToken" ADD CONSTRAINT "CandidateApplicationClaimToken_candidateAccountId_fkey" FOREIGN KEY ("candidateAccountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateContactLink" ADD CONSTRAINT "CandidateContactLink_candidateAccountId_fkey" FOREIGN KEY ("candidateAccountId") REFERENCES "CandidateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateContactLink" ADD CONSTRAINT "CandidateContactLink_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CandidateAuthRateLimit" (
  "id" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "blockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidateAuthRateLimit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CandidateAuthRateLimit_keyHash_action_key" ON "CandidateAuthRateLimit"("keyHash", "action");
CREATE INDEX "CandidateAuthRateLimit_blockedUntil_idx" ON "CandidateAuthRateLimit"("blockedUntil");
