-- OpenATS Phase 1A.2: candidate profile and legal acceptance metadata.
-- Additive only: all new columns are nullable so existing candidate accounts remain valid.
-- The preflight runs before any DDL. It reports every case-insensitive email collision
-- and aborts safely; it never merges, updates, or deletes candidate accounts.
DO $$
DECLARE
  conflicts TEXT;
BEGIN
  SELECT string_agg(
    format('%s => [%s]', normalized_email, original_emails),
    E'\n'
    ORDER BY normalized_email
  )
  INTO conflicts
  FROM (
    SELECT
      lower("email") AS normalized_email,
      string_agg("email", ', ' ORDER BY "email") AS original_emails
    FROM "CandidateAccount"
    GROUP BY lower("email")
    HAVING count(*) > 1
  ) AS duplicates;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Cannot create CandidateAccount lower(email) unique index. Resolve these case-insensitive duplicate accounts manually; no accounts were changed:',
      DETAIL = conflicts,
      HINT = 'Review the duplicate addresses, decide account ownership manually, then rerun this migration.';
  END IF;
END
$$;

ALTER TABLE "CandidateAccount"
  ADD COLUMN "phoneE164" TEXT,
  ADD COLUMN "phoneCountryCode" TEXT,
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "privacyPolicyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "privacyPolicyVersion" TEXT;

-- Keep CandidateAccount_email_key from Phase 1A as the ordinary unique constraint.
-- Prisma schema cannot model this PostgreSQL expression index; keep it in this SQL migration.
CREATE UNIQUE INDEX "CandidateAccount_email_lower_key"
  ON "CandidateAccount" (LOWER("email"));
