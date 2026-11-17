# OpenATS Phase 1B.2A — Candidate profile schema and migration

Base: `551a984d14faaf0f87bcb868a20f24cb429e98dc`
Migration: `20261117100000_candidate_profile_review`

## Existing schema reused

No existing candidate model is duplicated. The migration extends `CandidateProfile`, `CandidateEducation`, `CandidateExperience`, `CandidateProject`, and `CandidateResumeParseJob`, and adds two candidate-only tables.

Existing fields already satisfy parts of the requested shape:
- `CandidateProfile.summary` is the professional summary; `linkedinUrl`, `githubUrl`, and `websiteUrl` remain intact.
- `CandidateEducation` already stores institution, degree, field, location and dates.
- `CandidateExperience` already stores company, title, employment type, location, dates and current-employment flag.
- `CandidateProject` already stores name, description, role, URL and dates.
- `CandidateCertification` already stores name, issuer, issue/expiry dates, credential ID and URL.
- `CandidateLanguage.proficiency` already stores the proficiency level.
- Existing `CandidateSkill` and all candidate relations remain unchanged.

## Additive schema

- Profile: nullable country, city, address and portfolio URL. Existing `websiteUrl` is retained to avoid breaking existing records or consumers.
- Education: nullable `gradeGpa`.
- Experience: nullable responsibilities and achievements.
- Projects: technologies as a non-null text array with an empty-array default, so existing project rows remain valid.
- Additional information: `CandidateAdditionalInformation`, categorized as award, publication, volunteer experience or professional membership. Optional organization, description, URL and date fields support differing record types.
- Field provenance/review: `CandidateProfileFieldReview` tracks each field by candidate profile, entity type/id and field key. It records source (AI extracted, candidate entered or candidate edited), review status (pending, confirmed or rejected), optional source resume, confidence and confirmation timestamp. A composite profile/account foreign key prevents cross-candidate profile association. The source-resume FK is nullable and is cleared if that resume is deleted.
- Parse jobs: adds max attempts (default 3), last-attempt timestamp, safe error message and extraction metadata. Existing `attempts`, `availableAt`, `startedAt`, `completedAt` and `errorCode` are reused for attempt count, next eligible retry, lifecycle timestamps and last error code.

The existing `PROCESSING` and `SUCCEEDED` enum values are retained for compatibility. New lifecycle values are `UPLOADED`, `QUEUED`, `EXTRACTING`, `PARSING`, `REVIEW_REQUIRED`, `COMPLETED`, `FAILED` and `CANCELLED`. The schema keeps the existing QUEUED default; a future upload service should explicitly create the initial job in UPLOADED and enqueue it by transitioning to QUEUED.

## Review and overwrite safety contract

Field review metadata is intentionally separate from candidate values and does not store extracted resume text. AI-produced values must be inserted as `AI_EXTRACTED/PENDING`. Candidate-entered and candidate-edited values should be marked `CONFIRMED` only after an explicit candidate action (manual form submission is candidate input; edits are candidate-edited). Confirmation sets `confirmedAt`.

The future profile persistence service must perform a field-level transactional check: an AI value may fill an empty field or replace an unconfirmed AI value, but must never update a field whose review row is `CONFIRMED`. Candidate edits/confirmation must win races against an in-flight parser by using conditional updates or row locking. The schema provides the state needed for this rule; it does not itself enforce application-level merge behavior. `entityType/entityId/fieldKey` are a polymorphic locator and must be validated against the candidate profile before writes.

## Migration safety

The SQL is additive:
- Adds enum values without removing legacy values.
- Adds nullable columns, plus one array column with an empty default.
- Creates two new candidate-only tables, indexes and foreign keys.
- Does not drop/rename tables, columns, enum values or indexes.
- Does not update or delete existing candidate or recruiter rows.
- Does not alter `User`, `Contact`, `StoredFile`, or public application tables.
- Follows Phase 1B.1 migration `20261116170000_candidate_resume_storage`.

The migration has **not** been applied. No production SQL, Docker operation, database reset or test-database operation is part of this phase.

## Remaining implementation work

The upload/parse worker and profile persistence service must implement the lifecycle transitions, retry/backoff, field-level merge contract, candidate review actions, and cleanup of field-review references. The current migration is a schema foundation only; it does not yet process resumes or enforce review behavior in API code.
