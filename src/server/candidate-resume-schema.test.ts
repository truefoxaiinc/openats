import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = fileURLToPath(new URL('../../prisma/migrations/20261116170000_candidate_resume_storage/migration.sql', import.meta.url));

describe('candidate resume migration contract', () => {
  it('creates candidate-owned models without altering recruiter storage', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    for (const table of ['CandidateResume', 'CandidateProfile', 'CandidateEducation', 'CandidateExperience', 'CandidateSkill', 'CandidateProject', 'CandidateCertification', 'CandidateLanguage', 'CandidateResumeParseJob']) {
      expect(sql).toContain('CREATE TABLE "' + table + '"');
    }
    expect(sql).toContain('REFERENCES "CandidateAccount"("id") ON DELETE CASCADE');
    expect(sql).toContain('REFERENCES "CandidateProfile"("id") ON DELETE CASCADE');
    expect(sql).toContain('REFERENCES "CandidateResume"("id", "candidateAccountId") ON DELETE CASCADE');
    expect(sql).not.toMatch(/ALTER TABLE "(User|Contact|StoredFile)"/);
    expect(sql).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i);
  });

  it('enforces one primary resume per candidate with a partial unique index', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toContain('CREATE UNIQUE INDEX "CandidateResume_one_primary_per_candidate_key"');
    expect(sql).toContain('ON "CandidateResume"("candidateAccountId") WHERE "isPrimary" = true');
  });
});
