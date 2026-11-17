import type { Metadata } from 'next';
import Link from 'next/link';
import { BriefcaseBusiness, FileText, UserRound } from 'lucide-react';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/primitives';
import { CandidateClaimButton } from '@/components/candidate-claim-button';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { CandidateWorkspaceShell } from '@/components/candidate-workspace-shell';

export const metadata: Metadata = { title: 'Candidate dashboard | OpenATS', robots: { index: false, follow: false }, referrer: 'no-referrer' };

function candidateStatus(status: string, stageType: string, rejected: boolean | null): string {
  if (status === 'HIRED') return 'Hired';
  if (status === 'ARCHIVED') return rejected ? 'Not selected' : 'Closed';
  if (stageType === 'LEAD' || stageType === 'APPLICANT') return 'Application received';
  if (stageType === 'SCREEN') return 'In review';
  if (stageType === 'ONSITE') return 'Interviewing';
  if (stageType === 'OFFER') return 'Offer stage';
  return 'In progress';
}

const statusTone: Record<string, 'positive' | 'critical' | 'neutral' | 'info' | 'caution'> = {
  Hired: 'positive', 'Not selected': 'critical', Closed: 'neutral',
  Interviewing: 'info', 'Offer stage': 'caution', 'In review': 'info',
};

export default async function CandidateDashboardPage() {
  const account = await requireCandidateAccount();
  const [candidateApplications, links, profile, resumes, publishedJobsCount] = await Promise.all([
    db.candidateApplication.findMany({
      where: { candidateAccountId: account.id },
      orderBy: { createdAt: 'desc' },
      include: {
        opportunity: {
          include: {
            org: { select: { name: true } },
            posting: { select: { title: true, clientCompany: { select: { name: true } } } },
            stage: { select: { type: true } },
            archiveReason: { select: { countsAsRejection: true } },
          },
        },
      },
    }),
    db.candidateContactLink.findMany({
    where: { candidateAccountId: account.id, contact: { isAnonymized: false } },
    orderBy: { createdAt: 'desc' },
    include: {
      contact: {
        select: {
          name: true,
          opportunities: {
            where: { confidential: false },
            orderBy: { createdAt: 'desc' },
            include: {
              org: { select: { name: true } },
              posting: { select: { title: true, clientCompany: { select: { name: true } } } },
              stage: { select: { type: true } },
              archiveReason: { select: { countsAsRejection: true } },
            },
          },
        },
      },
    },
    }),
    db.candidateProfile.findUnique({
      where: { candidateAccountId: account.id },
      select: { headline: true, summary: true, location: true, city: true, skills: { select: { id: true } }, experience: { select: { id: true } }, education: { select: { id: true } }, projects: { select: { id: true } } },
    }),
    db.candidateResume.findMany({
      where: { candidateAccountId: account.id, status: 'STORED' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, originalFilename: true, isPrimary: true, parseJobs: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, safeErrorMessage: true } } },
    }),
    db.posting.count({ where: { state: 'PUBLISHED' } }),
  ]);
  const directOpportunityIds = new Set(candidateApplications.map((application) => application.opportunityId));
  const directHistory = candidateApplications.map((application) => ({
    id: application.id,
    title: application.opportunity.posting?.title ?? 'General application',
    company: application.opportunity.posting?.clientCompany?.name ?? application.opportunity.org.name,
    appliedAt: application.createdAt,
    status: application.withdrawnAt ? 'Withdrawn' : candidateStatus(application.opportunity.status, application.opportunity.stage.type, application.opportunity.archiveReason?.countsAsRejection ?? null),
  }));
  const historicalLinks = links.flatMap((link) => link.contact.opportunities
    .filter((opp) => !directOpportunityIds.has(opp.id))
    .map((opp) => ({
      id: opp.id,
      title: opp.posting?.title ?? 'General application',
      company: opp.posting?.clientCompany?.name ?? opp.org.name,
      appliedAt: opp.createdAt,
      status: candidateStatus(opp.status, opp.stage.type, opp.archiveReason?.countsAsRejection ?? null),
    })));
  const applications = [...directHistory, ...historicalLinks].sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
  const profileSections = [Boolean(profile?.headline), Boolean(profile?.summary), Boolean(profile?.location || profile?.city), Boolean(profile?.skills.length), Boolean(profile?.experience.length), Boolean(profile?.education.length), Boolean(profile?.projects.length), resumes.length > 0];
  const profileCompletion = Math.round((profileSections.filter(Boolean).length / profileSections.length) * 100);
  const primaryResume = resumes[0];
  const resumeStatus = primaryResume?.parseJobs[0]?.status ?? (primaryResume ? 'STORED' : 'MISSING');

  return (
    <CandidateWorkspaceShell>
      <div className="w-full">
        <section className="rounded-card border border-line bg-surface p-6 sm:p-8">
          <p className="text-xs font-medium text-ink-3">Your account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Hello, {account.name}</h1>
          <p className="mt-2 text-sm text-ink-2">{account.email}</p>
          <Badge tone="positive" className="mt-4">Email verified</Badge>
        </section>
        <section aria-label="Candidate overview" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-card border border-line bg-surface p-5">
            <p className="text-xs font-medium text-ink-3">Applications</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{applications.length}</p>
            <p className="mt-1 text-xs text-ink-3">Connected and submitted</p>
          </article>
          <article className="rounded-card border border-line bg-surface p-5">
            <p className="text-xs font-medium text-ink-3">Available jobs</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{publishedJobsCount}</p>
            <Link href="/candidate/jobs" className="mt-1 inline-flex text-xs font-medium text-ink underline underline-offset-4">Explore published jobs</Link>
          </article>
          <article className="rounded-card border border-line bg-surface p-5">
            <p className="text-xs font-medium text-ink-3">My resumes</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{resumes.length}</p>
            <p className="mt-1 truncate text-xs text-ink-3">{primaryResume?.originalFilename ?? 'No resume uploaded'}</p>
          </article>
          <article className="rounded-card border border-line bg-surface p-5">
            <p className="text-xs font-medium text-ink-3">Profile completion</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{profileCompletion}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-ink" style={{ width: `${profileCompletion}%` }} /></div>
            <Link href="/candidate/profile" className="mt-2 inline-flex text-xs font-medium text-ink underline underline-offset-4">Complete profile</Link>
          </article>
        </section>
        <section className="mt-6 rounded-card border border-line bg-surface p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink-3">Resume readiness</p>
              <p className="mt-1 truncate text-sm font-medium text-ink">{primaryResume?.originalFilename ?? 'Upload your resume to get started'}</p>
              <p className="mt-1 text-xs text-ink-2">{primaryResume ? (primaryResume.parseJobs[0]?.safeErrorMessage ?? `Latest processing status: ${resumeStatus.toLowerCase().replaceAll('_', ' ')}`) : 'A stored resume is required to apply through your Candidate Portal.'}</p>
            </div>
            <Link href="/candidate/resumes" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink hover:bg-muted"><FileText size={15}/> Manage resumes</Link>
          </div>
        </section>
        <section id="applications" className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-ink-3">Your recruitment activity</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Application history</h2>
            </div>
            <span className="text-sm text-ink-3">{applications.length} applications</span>
          </div>
          {applications.length ? (
            <div className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {applications.map((application) => (
                <article key={application.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-ink">{application.title}</h3>
                    <p className="mt-1 text-xs text-ink-2">{application.company} · Applied {application.appliedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <Badge tone={statusTone[application.status] ?? 'neutral'}>{application.status}</Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-card border border-dashed border-line bg-surface px-6 py-8">
              <h3 className="text-sm font-medium text-ink">No applications yet</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">Apply to a published job to start tracking your applications here. Previously connected applications remain available below.</p>
            </div>
          )}
          <CandidateClaimButton />
        </section>
        <p className="mt-8 text-xs leading-5 text-ink-3">Application details are shown only after you explicitly verify and connect the matching email address. Internal recruiter notes and confidential applications are not displayed.</p>
      </div>
    </CandidateWorkspaceShell>
  );
}
