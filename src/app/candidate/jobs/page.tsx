import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { CandidateWorkspaceShell } from '@/components/candidate-workspace-shell';
import { Badge } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'Find jobs | OpenATS',
  description: 'Explore published opportunities from employers hiring on OpenATS.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function CandidateJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; location?: string; workplace?: string; commitment?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? '').trim().slice(0, 100);
  const location = (params.location ?? '').trim().slice(0, 100);
  const workplace = params.workplace ?? '';
  const commitment = params.commitment ?? '';
  const validWorkplaces = ['REMOTE', 'HYBRID', 'ONSITE'];
  const validCommitments = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'];

  const postings = await db.posting.findMany({
    where: {
      state: 'PUBLISHED',
      ...(q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          { org: { name: { contains: q, mode: 'insensitive' } } },
          { department: { name: { contains: q, mode: 'insensitive' } } },
          { clientCompany: { name: { contains: q, mode: 'insensitive' } } },
        ],
      } : {}),
      ...(location ? { location: { contains: location, mode: 'insensitive' as const } } : {}),
      ...(validWorkplaces.includes(workplace) ? { workplaceType: workplace as 'REMOTE' | 'HYBRID' | 'ONSITE' } : {}),
      ...(validCommitments.includes(commitment) ? { commitment: commitment as 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, slug: true, title: true, location: true, workplaceType: true,
      commitment: true, salaryMin: true, salaryMax: true, salaryCurrency: true,
      createdAt: true,
      org: { select: { name: true, slug: true } },
      department: { select: { name: true } },
      clientCompany: { select: { name: true } },
    },
  });

  const workplaceLabel = (value: string) => ({ REMOTE: 'Remote', HYBRID: 'Hybrid', ONSITE: 'On-site' })[value] ?? value;
  const commitmentLabel = (value: string) => ({ FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship' })[value] ?? value;
  const salary = (min: number | null, max: number | null, currency: string | null) => {
    if (min == null && max == null) return null;
    const unit = currency ?? 'USD';
    const format = (amount: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(amount);
    return min != null && max != null ? `${unit} ${format(min)}–${format(max)}` : min != null ? `From ${unit} ${format(min)}` : `Up to ${unit} ${format(max!)}`;
  };

  return (
    <CandidateWorkspaceShell>
      <div className="w-full">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-ink-3">Opportunities across OpenATS</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Find jobs</h1>
            <p className="mt-2 text-sm text-ink-2">Explore roles published by recruiters and apply directly.</p>
          </div>
          <span className="text-sm text-ink-3">{postings.length} {postings.length === 1 ? 'job' : 'jobs'} shown</span>
        </div>

        <form method="get" className="mt-6 grid gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-2">
            Search jobs or companies
            <input name="q" defaultValue={q} placeholder="Job title, skill, company…" className="h-10 rounded-field border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-ink-3" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-2">
            Location
            <input name="location" defaultValue={location} placeholder="City or region" className="h-10 rounded-field border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-ink-3" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-2">
            Workplace
            <select name="workplace" defaultValue={workplace} className="h-10 rounded-field border border-line bg-canvas px-3 text-sm text-ink">
              <option value="">Any workplace</option><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">On-site</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-2">
            Employment type
            <select name="commitment" defaultValue={commitment} className="h-10 rounded-field border border-line bg-canvas px-3 text-sm text-ink">
              <option value="">Any type</option><option value="FULL_TIME">Full-time</option><option value="PART_TIME">Part-time</option><option value="CONTRACT">Contract</option><option value="INTERNSHIP">Internship</option>
            </select>
          </label>
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" className="h-9 rounded-full bg-ink px-5 text-sm font-medium text-white">Search jobs</button>
            <Link href="/candidate/jobs" className="text-sm text-ink-2 hover:text-ink">Clear filters</Link>
          </div>
        </form>

        <section aria-label="Published jobs" className="mt-6 space-y-3">
          {postings.length ? postings.map((posting) => {
            const pay = salary(posting.salaryMin, posting.salaryMax, posting.salaryCurrency);
            const company = posting.clientCompany?.name ?? posting.org.name;
            return (
              <article key={posting.id} className="rounded-card border border-line bg-surface p-5 transition-colors hover:border-ink-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-ink-3">{company}{posting.department?.name ? ` · ${posting.department.name}` : ''}</p>
                    <h2 className="mt-1 text-base font-semibold text-ink">{posting.title}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {posting.location ? <Badge>{posting.location}</Badge> : null}
                      <Badge>{workplaceLabel(posting.workplaceType)}</Badge>
                      <Badge>{commitmentLabel(posting.commitment)}</Badge>
                      {pay ? <Badge>{pay}</Badge> : null}
                    </div>
                    <p className="mt-3 text-xs text-ink-3">Published {posting.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <Link href={`/careers/${posting.org.slug}/${posting.slug}`} className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-muted">View job & apply</Link>
                </div>
              </article>
            );
          }) : (
            <div className="rounded-card border border-dashed border-line bg-surface px-6 py-10 text-center">
              <h2 className="text-sm font-medium text-ink">No matching jobs found</h2>
              <p className="mt-2 text-sm text-ink-2">Try changing your search or filters, or check back later for new opportunities.</p>
            </div>
          )}
        </section>
      </div>
    </CandidateWorkspaceShell>
  );
}
