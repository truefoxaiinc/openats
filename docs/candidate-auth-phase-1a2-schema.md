# Phase 1A.2 — Candidate profile and email uniqueness

## Scope

This migration follows `20261116120000_candidate_auth` and is additive. It adds nullable phone and policy-acceptance metadata to `CandidateAccount`; existing accounts remain valid and are not backfilled.

## Case-insensitive email preflight

Before the expression index is created, the migration runs a PostgreSQL preflight that groups candidate addresses by `LOWER(email)`. If collisions exist, it raises an exception with each normalized address and its original values. The migration stops before applying any DDL. It does not merge, rename, update, or delete accounts.

The equivalent read-only diagnostic query is:

```sql
SELECT
  LOWER("email") AS normalized_email,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG("email" ORDER BY "email") AS stored_addresses
FROM "CandidateAccount"
GROUP BY LOWER("email")
HAVING COUNT(*) > 1
ORDER BY normalized_email;
```

Resolve any reported collision manually with the account owner and preserve the intended identity/history. Re-run the query and proceed only when it returns zero rows. Do not automate account merging.

## Index strategy

The existing `CandidateAccount_email_key` unique index remains in place. The migration additionally creates `CandidateAccount_email_lower_key` on `LOWER("email")`. Prisma schema currently models the ordinary unique constraint but not this expression index; the custom SQL migration is the source of truth for the expression index. Keep this migration in version control and verify the index exists in PostgreSQL after deployment.

Candidate registration trims and lowercases email before lookup and insert. The database expression index is the final concurrency-safe guard against differently-cased duplicates, including writes that bypass the service.

## New nullable fields

- `phoneE164`, `phoneCountryCode`
- `termsAcceptedAt`, `termsVersion`
- `privacyPolicyAcceptedAt`, `privacyPolicyVersion`

New password registrations must explicitly accept both legal acknowledgements. Acceptance timestamps are generated server-side; version identifiers are server-controlled constants (`candidate-terms-v1`, `candidate-privacy-v1`). Phone is optional; if supplied, the E.164 number and country calling code must both be valid and consistent.

## Operational restrictions

- Do not run this migration against production as part of implementation or CI.
- Before applying it, run the diagnostic query above against the target database and review conflicts.
- This change does not alter recruiter `User` records, Auth.js, Contact records, candidate sessions, or existing candidate data.
