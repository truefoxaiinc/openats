import type { Metadata } from 'next';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { db } from '@/lib/db';
import { CandidateProfileForm } from '@/components/candidate-profile-form';
import { CandidateWorkspaceShell } from '@/components/candidate-workspace-shell';

export const metadata: Metadata = { title: 'My profile | OpenATS', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function CandidateProfilePage() {
  const account = await requireCandidateAccount();
  const profile = await db.candidateProfile.findUnique({
    where: { candidateAccountId: account.id },
    include: { skills: true, experience: { orderBy: { startDate: 'desc' } }, education: { orderBy: { startDate: 'desc' } }, certifications: true, projects: true, languages: true },
  });

  return (
    <CandidateWorkspaceShell>
      <div className="w-full">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">My profile</h1>
          <p className="mt-2 text-sm text-ink-2">Review and update information extracted from your resume.</p>
        </header>
        <CandidateProfileForm initialProfile={profile ? {
          headline: profile.headline ?? '', summary: profile.summary ?? '', location: profile.location ?? '',
          city: profile.city ?? '', country: profile.country ?? '', address: profile.address ?? '',
          linkedinUrl: profile.linkedinUrl ?? '', githubUrl: profile.githubUrl ?? '',
          websiteUrl: profile.websiteUrl ?? '', portfolioUrl: profile.portfolioUrl ?? '',
        } : null} />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Skills <span className="text-sm font-normal text-ink-3">{profile?.skills.length ?? 0}</span></h2>
            {profile?.skills.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <li key={skill.id} className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-ink-2">{skill.name}</li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-ink-3">No skills added yet.</p>}
          </section>

          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Experience <span className="text-sm font-normal text-ink-3">{profile?.experience.length ?? 0}</span></h2>
            {profile?.experience.length ? (
              <div className="mt-3 divide-y divide-line">
                {profile.experience.map((item) => (
                  <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <h3 className="text-sm font-medium text-ink">{item.title} · {item.company}</h3>
                    <p className="mt-1 text-xs text-ink-3">
                      {[item.location, item.startDate?.getFullYear(), item.isCurrent ? 'Present' : item.endDate?.getFullYear()].filter(Boolean).join(' · ')}
                    </p>
                    {item.description ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-2">{item.description}</p> : null}
                    {item.responsibilities ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-2">{item.responsibilities}</p> : null}
                    {item.achievements ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-2">{item.achievements}</p> : null}
                  </article>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-ink-3">No experience added yet.</p>}
          </section>

          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Education <span className="text-sm font-normal text-ink-3">{profile?.education.length ?? 0}</span></h2>
            {profile?.education.length ? (
              <div className="mt-3 divide-y divide-line">
                {profile.education.map((item) => (
                  <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <h3 className="text-sm font-medium text-ink">{item.degree ? `${item.degree} · ` : ''}{item.institution}</h3>
                    <p className="mt-1 text-xs text-ink-3">
                      {[item.fieldOfStudy, item.location, item.startDate?.getFullYear(), item.endDate?.getFullYear(), item.gradeGpa].filter(Boolean).join(' · ')}
                    </p>
                    {item.description ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-2">{item.description}</p> : null}
                  </article>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-ink-3">No education added yet.</p>}
          </section>

          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Projects <span className="text-sm font-normal text-ink-3">{profile?.projects.length ?? 0}</span></h2>
            {profile?.projects.length ? (
              <div className="mt-3 divide-y divide-line">
                {profile.projects.map((item) => (
                  <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <h3 className="text-sm font-medium text-ink">{item.name}{item.role ? ` · ${item.role}` : ''}</h3>
                    {item.description ? <p className="mt-1 text-sm leading-6 text-ink-2">{item.description}</p> : null}
                    {item.technologies.length ? <p className="mt-2 text-xs text-ink-3">{item.technologies.join(' · ')}</p> : null}
                    {item.url ? <a href={item.url} className="mt-2 inline-flex text-xs font-medium text-ink underline underline-offset-4">View project</a> : null}
                  </article>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-ink-3">No projects added yet.</p>}
          </section>

          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Certifications <span className="text-sm font-normal text-ink-3">{profile?.certifications.length ?? 0}</span></h2>
            {profile?.certifications.length ? (
              <div className="mt-3 divide-y divide-line">
                {profile.certifications.map((item) => (
                  <article key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <h3 className="text-sm font-medium text-ink">{item.name}</h3>
                    {item.issuer ? <p className="mt-1 text-xs text-ink-2">{item.issuer}</p> : null}
                    {item.credentialId ? <p className="mt-1 text-xs text-ink-3">Credential {item.credentialId}</p> : null}
                    {item.credentialUrl ? <a href={item.credentialUrl} className="mt-2 inline-flex text-xs font-medium text-ink underline underline-offset-4">View credential</a> : null}
                  </article>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-ink-3">No certifications added yet.</p>}
          </section>

          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Languages <span className="text-sm font-normal text-ink-3">{profile?.languages.length ?? 0}</span></h2>
            {profile?.languages.length ? (
              <ul className="mt-3 divide-y divide-line">
                {profile.languages.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="text-sm font-medium text-ink">{item.name}</span>
                    {item.proficiency ? <span className="text-xs text-ink-3">{item.proficiency}</span> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-ink-3">No languages added yet.</p>}
          </section>
        </div>
      </div>
    </CandidateWorkspaceShell>
  );
}
