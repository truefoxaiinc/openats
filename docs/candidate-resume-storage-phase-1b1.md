# Phase 1B.1 — Candidate resume database and private storage

Candidate resumes are stored in candidate-owned tables and a dedicated private storage adapter. Recruiter-owned `StoredFile`, `Contact`, existing resume processing, and the public Vercel Blob adapter are not used.

## Database

The additive migration creates `CandidateResume`, `CandidateProfile`, profile child records (education, experience, skills, projects, certifications, languages), and `CandidateResumeParseJob`. Every row is UUID-keyed and timestamped. Candidate ownership cascades from `CandidateAccount`; profile children cascade from `CandidateProfile`. Parse jobs use a composite foreign key to ensure their resume belongs to the same candidate account. A PostgreSQL partial unique index permits at most one primary resume per candidate.

## Storage

- Local development: `.data/candidate-resumes/<candidateAccountId>/<uuid>`, outside the public web directory. Directories are created with mode 0700 and files with mode 0600; files are opened exclusively.
- Production: `CANDIDATE_STORAGE_DRIVER=s3` and a private S3-compatible bucket are required. HTTPS is required in production. The adapter does not send ACL headers, create public URLs, or use Vercel Blob.
- Keys are server-generated UUIDs scoped to the authenticated candidate. Read/delete operations require both candidate account ID and resume ID. No path or storage key is returned as an API response contract.
- Accepted formats are PDF, DOC, DOCX, ODT, RTF and TXT; the existing byte sniffer determines the actual format. Declared MIME must match (or be octet-stream). Maximum size is 10 MiB. SHA-256 is stored with metadata.
- Deletion marks the row DELETE_PENDING, removes the object, then deletes the scoped row. A storage failure leaves a retryable pending row.

## Environment

Local:
```dotenv
CANDIDATE_STORAGE_DRIVER=local
CANDIDATE_STORAGE_LOCAL_ROOT=.data
```

Production:
```dotenv
CANDIDATE_STORAGE_DRIVER=s3
CANDIDATE_S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
CANDIDATE_S3_BUCKET=openats-candidate-private
CANDIDATE_S3_ACCESS_KEY_ID=...
CANDIDATE_S3_SECRET_ACCESS_KEY=...
CANDIDATE_S3_REGION=auto
```

Keep the bucket private at the provider level and scope credentials to this bucket. This application intentionally does not attempt to set or override bucket policy.

## Docker and migration caution

The existing `uploads:/app/.data` volume already persists the whole `.data` tree; candidate files occupy a separate `.data/candidate-resumes` subdirectory. No new volume is introduced and no existing volume is renamed or removed.

The Dockerfile CMD executes `node scripts/migrate.mjs` before `npm run start`. Starting or recreating the app container after this migration is added can apply migrations automatically. Do not start/recreate containers until the migration has been reviewed and a deployment window is approved.
