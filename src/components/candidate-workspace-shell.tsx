'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BriefcaseBusiness, FileText, Home, UserRound } from 'lucide-react';
import { SourceLockup } from '@/components/powered-by';
import { CandidateLogoutButton } from '@/components/candidate-logout-button';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/candidate/dashboard', label: 'Dashboard', icon: Home },
  { href: '/candidate/jobs', label: 'Find jobs', icon: BriefcaseBusiness },
  { href: '/candidate/profile', label: 'My profile', icon: UserRound },
  { href: '/candidate/resumes', label: 'My resumes', icon: FileText },
];

export function CandidateWorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col md:flex">
        <div className="px-5 pb-4 pt-6">
          <SourceLockup href="/candidate/dashboard" />
        </div>

        <div className="mx-3 mb-5 flex items-center gap-3 rounded-card bg-surface p-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-ink">
            <UserRound size={16} strokeWidth={1.75} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-ink">Candidate workspace</span>
            <span className="text-xs text-ink-2">Your account</span>
          </span>
        </div>

        <nav aria-label="Candidate navigation" className="flex flex-1 flex-col gap-0.5 px-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-9 shrink-0 items-center gap-3 rounded-full px-3.5 text-sm transition-colors duration-[var(--duration-fast)]',
                  active ? 'bg-surface font-medium text-ink' : 'text-ink-2 hover:bg-ink/[0.04] hover:text-ink',
                )}
              >
                <Icon size={16} strokeWidth={1.75} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 flex items-center justify-between gap-3 rounded-card p-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-ink">
              <UserRound size={15} strokeWidth={1.75} />
            </span>
            <span className="truncate text-sm text-ink-2">Candidate account</span>
          </div>
          <CandidateLogoutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-0 pb-28 md:pb-0">
        <div className="w-full px-5 py-7 sm:px-7 md:py-9">
          {children}
        </div>
      </main>

      <nav aria-label="Candidate navigation" className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:hidden">
        <div className="flex items-center gap-1 rounded-full bg-surface p-1.5 shadow-float">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-12 min-w-20 flex-col items-center justify-center gap-0.5 rounded-full px-2 text-2xs transition-colors duration-[120ms]',
                  active ? 'bg-muted text-ink' : 'text-ink-2',
                )}
              >
                <Icon size={18} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
          <div className="flex h-12 items-center px-1">
            <CandidateLogoutButton />
          </div>
        </div>
      </nav>
    </div>
  );
}
