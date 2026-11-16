# Candidate authentication — Phase 1A

## Isolation boundary

Candidate identities are stored in `CandidateAccount`, never in recruiter `User`.
Candidate authentication does not call Auth.js, read recruiter JWTs, or set recruiter
cookies. Candidate sessions are opaque random values; only SHA-256 token hashes are
stored in `CandidateSession`. The browser cookie is
`openats.candidate-session` (HTTP-only, SameSite=Lax, Secure in production).

The legacy `/portal/[token]` magic-link portal and public careers/application routes
remain separate and unchanged.

## Routes

| Route | Purpose |
| --- | --- |
| `/candidate/login` | Candidate email/password or Google sign-in |
| `/candidate/signup` | Candidate registration |
| `/candidate/verify-email` | One-time email verification |
| `/candidate/resend-verification` | Resend verification |
| `/candidate/forgot-password` | Request password reset |
| `/candidate/reset-password` | One-time password reset |
| `/candidate/dashboard` | Candidate-only dashboard and explicitly connected applications |
| `/api/candidate-auth/*` | Candidate-only authentication APIs |

The recruiter middleware matcher excludes candidate routes. Candidate server pages
validate the database-backed candidate session independently.

## Google OAuth

Candidate Google OAuth shares the configured Google web client credentials
(`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) but uses a distinct callback:

- `https://YOUR_DOMAIN/api/candidate-auth/google/callback`
- `http://localhost:3000/api/candidate-auth/google/callback`

Add both redirect URIs to the existing Google OAuth web client. Do not remove the
recruiter callback `/api/auth/callback/google`.

The candidate flow uses state, PKCE and nonce, validates the ID token with Google's
tokeninfo endpoint, checks audience, issuer, expiry and verified email, and stores
the Google `sub` only in `CandidateOAuthIdentity`. It will not attach a Google
identity to an existing password account merely because the email addresses match.
Such an account must use its existing password sign-in; explicit account linking is
not part of this phase.

## Email delivery

Candidate verification, reset and application-claim emails use the existing
`SMTP_URL` and `EMAIL_FROM` transport settings, but a dedicated service. They do
not create organization-scoped `EmailMessage` records. Configure SMTP locally and
in production before testing email flows. When SMTP is absent, candidate email
delivery is skipped in development and no token is written to application logs.

## Explicit application claiming

Candidate registration and Google signup do not search for or link ATS Contacts.
The dashboard offers an explicit **Connect application history** action. It sends a
single-use confirmation link to the already-verified candidate email. Only when the
candidate opens that link are non-anonymized Contact records with that exact email
linked through `CandidateContactLink`. Each Contact can be claimed by at most one
candidate account. The dashboard exposes non-confidential application summaries only;
it does not expose recruiter notes or internal stage names.

This is an email-possession claim flow, not automatic linking during signup. If a
shared email address belongs to more than one person, the email owner could claim
all records using that address; organizations should use unique candidate email
addresses. A later phase may introduce per-application claim codes for stronger
disambiguation.

## Token and abuse controls

- Passwords are hashed with bcrypt.
- Verification, reset, claim and session tokens are random; only token hashes are stored.
- Verification/reset/claim tokens expire and are consumed once.
- Password reset revokes all candidate sessions for that account.
- Candidate mutation APIs require a same-origin Origin header.
- Candidate authentication endpoints use a shared PostgreSQL rate-limit table.
- Password reset responses do not reveal whether an account exists.
- Candidate emails are not written to recruiter email history.

## Database rollout

The additive schema is in `prisma/schema.prisma` and the matching SQL is in
`prisma/migrations/20261116120000_candidate_auth/migration.sql`.

**The migration has not been applied.** Before deployment, review the generated
Prisma schema/client compatibility, verify the SQL against a disposable PostgreSQL
database, back up the target database, and apply the migration through the normal
release process. Do not point the test database at a production database:
`tests/global-setup.ts` drops and recreates the public schema of
`TEST_DATABASE_URL`.

## Required configuration

Existing variables reused:

- `DATABASE_URL`, `DIRECT_URL`
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `SMTP_URL`, `EMAIL_FROM`

Optional candidate lifetimes (defaults shown):

- `CANDIDATE_SESSION_TTL_DAYS=30`
- `CANDIDATE_EMAIL_VERIFICATION_TTL_MINUTES=30`
- `CANDIDATE_PASSWORD_RESET_TTL_MINUTES=30`
- `CANDIDATE_APPLICATION_CLAIM_TTL_MINUTES=30`

Set the application's trusted public origin through the existing proxy/deployment
configuration so verification links use the request's public origin.
