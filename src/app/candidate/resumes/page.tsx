import type { Metadata } from 'next';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { db } from '@/lib/db';
import { CandidateResumeManager } from '@/components/candidate-resume-manager';
import { CandidateWorkspaceShell } from '@/components/candidate-workspace-shell';
import { resumeParserConfig } from '@/server/resume-parse/config';

export const metadata: Metadata = { title: 'My resumes | OpenATS', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function CandidateResumesPage() {
  const account = await requireCandidateAccount();
  const parser = resumeParserConfig();
  const resumes = await db.candidateResume.findMany({
    where: { candidateAccountId: account.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, originalFilename: true, mimeType: true, sizeBytes: true, isPrimary: true, createdAt: true,
      parseJobs: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, status: true, attempts: true, maxAttempts: true, errorCode: true, safeErrorMessage: true } },
    },
  });

  return (
    <CandidateWorkspaceShell>
      <div className="w-full">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">My resumes</h1>
          <p className="mt-2 text-sm text-ink-2">Keep your resume up to date and review the profile details extracted from it.</p>
        </header>
        <CandidateResumeManager
          initialResumes={resumes.map((resume) => ({
            ...resume,
            createdAt: resume.createdAt.toISOString(),
            parseJobs: resume.parseJobs.map((job) => ({ ...job })),
          }))}
          initialExtractionReady={parser.state === 'on'}
          initialParserProvider={parser.state === 'off' ? null : parser.providerLabel}
        />
      </div>
    </CandidateWorkspaceShell>
  );
}
