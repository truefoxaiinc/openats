import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { sameOriginRequest } from '@/server/candidate-auth/validation';
import { openCandidateResume, CandidateResumeMissingError } from '@/server/candidate-resume-storage';
import { submitApplication } from '@/server/applications';
import { EncryptedDocumentError } from '@/server/text/types';

export const runtime = 'nodejs';
type Context = { params: Promise<{ org: string; posting: string }> };

function message(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export async function POST(request: Request, context: Context) {
  if (!(await sameOriginRequest(request))) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const account = await requireCandidateAccount();
  const { org: orgSlug, posting: postingSlug } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid application request.' }, { status: 400 });
  }

  const resumeId = typeof body.resumeId === 'string' ? body.resumeId.trim() : '';
  const coverNote = typeof body.coverNote === 'string'
    ? body.coverNote.normalize('NFKC').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 5000)
    : '';

  if (!resumeId || resumeId.length > 100) {
    return NextResponse.json({ error: 'Choose one of your uploaded resumes before applying.' }, { status: 400 });
  }

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org) return NextResponse.json({ error: 'This job is no longer available.' }, { status: 404 });

  const posting = await db.posting.findFirst({
    where: { orgId: org.id, slug: postingSlug, state: 'PUBLISHED' },
    select: { id: true },
  });
  if (!posting) return NextResponse.json({ error: 'This job is no longer accepting applications.' }, { status: 404 });

  const existing = await db.candidateApplication.findUnique({
    where: { candidateAccountId_postingId: { candidateAccountId: account.id, postingId: posting.id } },
    select: { id: true, withdrawnAt: true },
  });
  if (existing) {
    return NextResponse.json({
      error: existing.withdrawnAt
        ? 'You have already submitted an application for this job.'
        : 'You have already applied to this job.',
      applicationId: existing.id,
    }, { status: 409 });
  }

  const profile = await db.candidateProfile.findUnique({
    where: { candidateAccountId: account.id },
    select: { location: true, city: true, country: true, linkedinUrl: true },
  });
  const selectedResume = await db.candidateResume.findFirst({
    where: { id: resumeId, candidateAccountId: account.id, status: 'STORED' },
    select: { id: true },
  });
  if (!selectedResume) {
    return NextResponse.json({ error: 'The selected resume is not available in your account.' }, { status: 404 });
  }

  try {
    const opened = await openCandidateResume(account.id, selectedResume.id);
    const bytes = Buffer.from(await new Response(opened.body).arrayBuffer());
    const result = await submitApplication({
      orgSlug,
      postingSlug,
      name: account.name,
      email: account.email,
      location: profile?.location || [profile?.city, profile?.country].filter(Boolean).join(', ') || undefined,
      linkedin: profile?.linkedinUrl || undefined,
      coverNote: coverNote || undefined,
      storeProfile: true,
      candidateAccountId: account.id,
      candidateResumeId: selectedResume.id,
      resume: { data: bytes, filename: opened.resume.originalFilename },
    });

    const application = await db.candidateApplication.findUnique({
      where: { opportunityId: result.id },
      select: { id: true, createdAt: true },
    });
    if (!application) {
      return NextResponse.json({ error: 'Your application could not be confirmed. Please check your applications.' }, { status: 500 });
    }
    return NextResponse.json({
      application: {
        id: application.id,
        appliedAt: application.createdAt,
        status: 'Application received',
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof CandidateResumeMissingError) {
      return NextResponse.json({ error: 'The selected resume could not be opened. Upload it again and retry.' }, { status: 404 });
    }
    if (error instanceof EncryptedDocumentError) {
      return NextResponse.json({ error: 'This resume is password-protected. Upload an unlocked PDF or DOCX.' }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'You have already applied to this job.' }, { status: 409 });
    }
    if (/already applied/i.test(message(error))) {
      return NextResponse.json({ error: 'You have already applied to this job.' }, { status: 409 });
    }
    console.error('[candidate-apply] submission failed', {
      candidateAccountId: account.id,
      errorName: error instanceof Error ? error.name : 'Error',
    });
    return NextResponse.json({ error: 'Unable to submit your application right now. Please try again.' }, { status: 500 });
  }
}
