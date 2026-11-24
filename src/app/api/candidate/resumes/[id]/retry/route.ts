import { after, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { sameOriginRequest } from '@/server/candidate-auth/validation';
import { resumeParserConfig } from '@/server/resume-parse/config';
import { processCandidateResumeJobs } from '@/server/candidate-resume-processing';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  if (!(await sameOriginRequest(request))) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const account = await requireCandidateAccount();
  const { id } = await context.params;
  const resume = await db.candidateResume.findFirst({
    where: { id, candidateAccountId: account.id, status: 'STORED' },
    select: { id: true },
  });
  if (!resume) return NextResponse.json({ error: 'Resume not found.' }, { status: 404 });

  const job = await db.candidateResumeParseJob.findFirst({
    where: { candidateResumeId: id, candidateAccountId: account.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!job) return NextResponse.json({ error: 'No extraction job exists.' }, { status: 404 });
  if (resumeParserConfig().state !== 'on') {
    return NextResponse.json({ error: 'AI extraction is not configured on this server.' }, { status: 409 });
  }

  const retryable = job.status === 'FAILED' || (job.status === 'QUEUED' && Boolean(job.errorCode));
  if (!retryable) {
    return NextResponse.json({ error: 'Resume is already queued or processing.' }, { status: 409 });
  }
  if (job.attempts >= job.maxAttempts) {
    return NextResponse.json({ error: 'Retry limit reached. Upload a new version to start a fresh extraction.' }, { status: 409 });
  }

  const result = await db.candidateResumeParseJob.updateMany({
    where: {
      id: job.id,
      status: job.status,
      errorCode: job.errorCode,
      attempts: { lt: job.maxAttempts },
    },
    data: {
      status: 'QUEUED',
      availableAt: new Date(),
      completedAt: null,
      startedAt: null,
      errorCode: null,
      safeErrorMessage: null,
    },
  });
  if (result.count !== 1) {
    return NextResponse.json({ error: 'Resume status changed. Refresh and try again.' }, { status: 409 });
  }

  after(() => processCandidateResumeJobs(1).catch((error) => {
    console.error('[candidate-resume] retry extraction failed', {
      candidateAccountId: account.id,
      error: error instanceof Error ? error.name : 'Error',
    });
  }));
  return NextResponse.json({ job: { id: job.id, status: 'QUEUED' } });
}
