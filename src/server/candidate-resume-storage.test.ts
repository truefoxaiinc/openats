import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

vi.mock('@/lib/db', () => ({
  db: { candidateResume: { findFirst: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() }, $transaction: vi.fn() },
}));

describe('candidate resume private storage foundation', () => {
  let root = '';
  let storage: typeof import('./candidate-resume-storage');
  let db: typeof import('@/lib/db').db;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'openats-candidate-resume-'));
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('CANDIDATE_STORAGE_DRIVER', 'local');
    vi.stubEnv('CANDIDATE_STORAGE_LOCAL_ROOT', root);
    vi.resetModules();
    storage = await import('./candidate-resume-storage');
    ({ db } = await import('@/lib/db'));
    vi.clearAllMocks();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  it('creates unique opaque keys scoped to a candidate', () => {
    const first = storage.createCandidateResumeStorageKey('candidate_123');
    const second = storage.createCandidateResumeStorageKey('candidate_123');
    expect(first).not.toBe(second);
    expect(first).toMatch(/^candidate-resumes\/candidate_123\/[0-9a-f-]{36}$/);
    expect(storage.createCandidateResumeStorageKey('candidate_456')).not.toContain('candidate_123');
  });

  it('sanitizes filenames and validates signature, MIME, size and checksum', () => {
    expect(storage.sanitizeCandidateFilename('../../private\\resume?.pdf')).toBe('resume_.pdf');
    const pdf = new TextEncoder().encode('%PDF-1.7\nresume');
    const result = storage.validateCandidateResume(pdf, 'application/pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(() => storage.validateCandidateResume(new TextEncoder().encode('not a PDF'), 'application/pdf')).toThrow();
    expect(() => storage.validateCandidateResume(pdf, 'text/plain')).toThrow();
    expect(() => storage.validateCandidateResume(new Uint8Array(storage.MAX_CANDIDATE_RESUME_BYTES + 1), 'application/pdf')).toThrow(/10 MB/);
  });

  it('does not reveal a resume to another candidate account', async () => {
    vi.mocked(db.candidateResume.findFirst).mockResolvedValue(null as never);
    await expect(storage.openCandidateResume('candidate_b', 'resume_a')).rejects.toBeInstanceOf(storage.CandidateResumeMissingError);
    expect(db.candidateResume.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'resume_a', candidateAccountId: 'candidate_b', status: 'STORED' },
    }));
  });

  it('streams local private bytes only after candidate-scoped lookup', async () => {
    const key = 'candidate-resumes/candidate_a/123e4567-e89b-12d3-a456-426614174000';
    const target = path.join(root, key);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, 'private resume', { mode: 0o600 });
    vi.mocked(db.candidateResume.findFirst).mockResolvedValue({
      id: 'resume_a', candidateAccountId: 'candidate_a', storageKey: key,
      originalFilename: 'resume.pdf', mimeType: 'application/pdf', sizeBytes: 14,
    } as never);
    const opened = await storage.openCandidateResume('candidate_a', 'resume_a');
    expect(await new Response(opened.body).text()).toBe('private resume');
    expect((await stat(target)).mode & 0o777).toBe(0o600);
    expect(db.candidateResume.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'resume_a', candidateAccountId: 'candidate_a', status: 'STORED' },
    }));
  });
});
