# OpenATS Phase 1B.3 — Candidate resume workflow

## Scope

This implementation reuses the Phase 1B.1 private candidate storage adapter and Phase 1B.2A relational profile, parse-job and field-review models. It adds no duplicate schema models or migration.

## Upload and access

- Candidate routes require the candidate session and scope resume lookups by candidateAccountId.
- Upload accepts PDF and DOCX only, validates file signatures and declared MIME through the existing storage adapter, and enforces its existing 10 MiB limit.
- Files remain in the existing private local/S3 adapter. Download streams through an authenticated route with no-store, nosniff and sandbox headers.
- Upload creates a candidate-owned parse job. Replacement makes the new resume primary while retaining previous versions.
- Deletion uses the existing DELETE_PENDING storage workflow.

## Extraction

The existing worker-thread text extraction handles PDF and DOCX. The candidate parser uses the existing optional OpenAI-compatible provider, strict output validator and prompt-injection protections. Candidate jobs run from the existing protected resume-parse cron; no new queue service or Docker volume is introduced.

Profile persistence uses a serializable transaction. Candidate account name, email and phone are never populated from resume content. Non-empty scalar profile fields are preserved, and AI-sourced values are recorded as pending field-review entries. Candidate profile edits mark fields confirmed so future parsing skips them.

## Known limitations

The shared parser schema currently returns headline, location, summary, skills, work history and education. It does not yet extract certifications, projects, languages, achievements, responsibilities or every professional-link subtype into relational records. The profile page exposes scalar personal/professional fields and shows counts for the other existing relational sections; full CRUD for those child sections remains follow-up work.

The browser upload reports completion/failure but does not yet show byte-level progress. Profile completion is not yet calculated. Retry is available while the existing job's attempt budget remains; after the limit, upload a new version to create a fresh job.

## Operations

No migration is added and no database, Docker service or volume is changed by this code. Existing candidate storage settings remain required. AI extraction remains off until the existing RESUME_PARSER_* or GROQ_API_KEY provider configuration is enabled. The existing cron must be running to process queued candidate jobs.
