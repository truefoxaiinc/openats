import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';
import { db } from '@/lib/db';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { CandidateWorkspaceShell } from '@/components/candidate-workspace-shell';
import { CandidateJobApplyForm } from '@/components/candidate-job-apply-form';
import { Badge } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'Job details | OpenATS',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type Context = { params: Promise<{ org: string; posting: string }> };

function salary(min: number | null, max: number | null, currency: string | null) {
  if (min == null && max == null) return null;
  const unit = currency ?? '';
  const format = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  if (min != null && max != null) return `${unit} ${format(min)} – ${format(max)}`.trim();
  return min != null ? `From ${unit} ${format(min)}`.trim() : `Up to ${unit} ${format(max!)}`.trim();
}

export default async function CandidateJobDetailPage({ params }: Context) {
  const account = await requireCandidateAccount();
  const { org: orgSlug, posting: postingSlug } = await params;
  const posting = await db.posting.findFirst({
    where: { slug: postingSlug, state: 'PUBLISHED', org: { slug: orgSlug } },
    select: {
      id: true, title: true, location: true, workplaceType: true, commitment: true,
      salaryMin: true, salaryMax: true, salaryCurrency: true, content: true, createdAt: true,
      org: { select: { name: true, slug: true } },
      department: { select: { name: true } },
      clientCompany: { select: { name: true } },
    },
  });
  if (!posting) notFound();

  const [resumes, application] = await Promise.all([
    db.candidateResume.findMany({
      where: { candidateAccountId: account.id, status: 'STORED' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, originalFilename: true, isPrimary: true },
    }),
    db.candidateApplication.findUnique({
      where: { candidateAccountId_postingId: { candidateAccountId: account.id, postingId: posting.id } },
      select: { id: true, withdrawnAt: true },
    }),
  ]);

  const description = posting.content && typeof posting.content === 'object' && 'description' in posting.content
    ? String((posting.content as { description?: unknown }).description ?? '')
    : '';
  const company = posting.clientCompany?.name ?? posting.org.name;
  const pay = salary(posting.salaryMin, posting.salaryMax, posting.salaryCurrency);
  const workplace = { ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote' }[posting.workplaceType];
  const commitment = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship' }[posting.commitment];

  return (
    <CandidateWorkspaceShell>
      <div className="w-full max-w-4xl">
        <Link href="/candidate/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
          <ArrowLeft size={14} /> Back to jobs
        </Link>
        <header className="mt-6 rounded-card border border-line bg-surface p-6 sm:p-8">
          <p className="text-sm text-ink-3">{company}{posting.department?.name ? ` · ${posting.department.name}` : ''}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{posting.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {posting.location ? <Badge><span className="inline-flex items-center gap-1"><MapPin size={12}/>{posting.location}</span></Badge> : null}
            <Badge>{workplace}</Badge>
            <Badge>{commitment}</Badge>
            {pay ? <Badge>{pay}</Badge> : null}
          </div>
          <p className="mt-4 text-xs text-ink-3">Published {posting.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </header>
        {description ? (
          <section className="mt-6 rounded-card border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-ink">Job description</h2>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink-2">{description}</div>
          </section>
        ) : null}
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-ink">Apply for this role</h2>
          <CandidateJobApplyForm
            orgSlug={orgSlug}
            postingSlug={postingSlug}
            resumes={resumes}
            alreadyApplied={Boolean(application)}
          />
        </section>
      </div>
    </CandidateWorkspaceShell>
  );
}
