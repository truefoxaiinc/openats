import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: vi.fn() };
});
vi.mock('@/lib/db', () => ({
  db: {
    candidateResume: { findFirst: vi.fn() },
    candidateResumeParseJob: { findFirst: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock('@/server/candidate-auth/guards', () => ({
  requireCandidateAccount: vi.fn(),
}));
vi.mock('@/server/candidate-auth/validation', () => ({
  sameOriginRequest: vi.fn(),
}));
vi.mock('@/server/resume-parse/config', () => ({
  resumeParserConfig: vi.fn(),
}));
vi.mock('@/server/candidate-resume-processing', () => ({
  processCandidateResumeJobs: vi.fn(),
}));

import { after } from 'next/server';
import { db } from '@/lib/db';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { sameOriginRequest } from '@/server/candidate-auth/validation';
import { resumeParserConfig } from '@/server/resume-parse/config';
import { processCandidateResumeJobs } from '@/server/candidate-resume-processing';
import { POST } from './route';

const request = new Request('http://localhost/api/candidate/resumes/resume-id/retry', { method: 'POST' });
const context = { params: Promise.resolve({ id: 'resume-id' }) };

describe('candidate resume retry route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sameOriginRequest).mockResolvedValue(true);
    vi.mocked(requireCandidateAccount).mockResolvedValue({ id: 'candidate-id' } as never);
    vi.mocked(resumeParserConfig).mockReturnValue({ state: 'on' } as never);
    vi.mocked(db.candidateResume.findFirst).mockResolvedValue({ id: 'resume-id' } as never);
    vi.mocked(db.candidateResumeParseJob.findFirst).mockResolvedValue({
      id: 'job-id',
      status: 'QUEUED',
      errorCode: 'provider_bad_request',
      attempts: 1,
      maxAttempts: 3,
    } as never);
    vi.mocked(db.candidateResumeParseJob.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(processCandidateResumeJobs).mockResolvedValue({ completed: 0, failed: 0, more: false } as never);
  });

  it('restarts an errored queued job immediately', async () => {
    const response = await POST(request, context);

    expect(response.status).toBe(200);
    expect(db.candidateResumeParseJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'job-id', status: 'QUEUED', errorCode: 'provider_bad_request' }),
      data: expect.objectContaining({ status: 'QUEUED', errorCode: null }),
    }));
    expect(after).toHaveBeenCalledOnce();
    const retryTask = vi.mocked(after).mock.calls[0][0];
    if (typeof retryTask !== 'function') throw new Error('Expected after() to receive a callback.');
    await retryTask();
    expect(processCandidateResumeJobs).toHaveBeenCalledWith(1);
  });

  it('rejects a job that is queued without a previous error', async () => {
    vi.mocked(db.candidateResumeParseJob.findFirst).mockResolvedValue({
      id: 'job-id',
      status: 'QUEUED',
      errorCode: null,
      attempts: 0,
      maxAttempts: 3,
    } as never);

    const response = await POST(request, context);

    expect(response.status).toBe(409);
    expect(db.candidateResumeParseJob.updateMany).not.toHaveBeenCalled();
  });
});
