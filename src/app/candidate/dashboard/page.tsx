import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/primitives';
import { CandidateClaimButton } from '@/components/candidate-claim-button';
import { CandidateLogoutButton } from '@/components/candidate-logout-button';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';

export const metadata: Metadata = { title: 'Candidate dashboard | OpenATS' };

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
  const links = await db.candidateContactLink.findMany({
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
  });
  const applications = links.flatMap((link) => link.contact.opportunities.map((opp) => ({
    id: opp.id,
    title: opp.posting?.title ?? 'General application',
    company: opp.posting?.clientCompany?.name ?? opp.org.name,
    appliedAt: opp.createdAt,
    status: candidateStatus(opp.status, opp.stage.type, opp.archiveReason?.countsAsRejection ?? null),
  }))).sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());

  return (
    <div className="w-full max-w-4xl">
      <header className="mb-10 flex items-center justify-between gap-4">
        <div>
          <a href="/" className="text-sm font-semibold tracking-tight text-ink">OpenATS</a>
          <p className="mt-1 text-xs text-ink-3">Candidate workspace</p>
        </div>
        <CandidateLogoutButton />
      </header>
      <section className="rounded-card border border-line bg-surface p-6 sm:p-8">
        <p className="text-xs font-medium text-ink-3">Your account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Hello, {account.name}</h1>
        <p className="mt-2 text-sm text-ink-2">{account.email}</p>
        <Badge tone="positive" className="mt-4">Email verified</Badge>
      </section>
      <section className="mt-8">
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
            <h3 className="text-sm font-medium text-ink">No connected applications yet</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">Your public job applications remain separate from your candidate account. You can explicitly connect application records associated with this verified email address.</p>
          </div>
        )}
        <CandidateClaimButton />
      </section>
      <p className="mt-8 text-xs leading-5 text-ink-3">Application details are shown only after you explicitly verify and connect the matching email address. Internal recruiter notes and confidential applications are not displayed.</p>
    </div>
  );
}
