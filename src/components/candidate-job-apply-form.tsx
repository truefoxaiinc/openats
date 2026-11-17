'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type ResumeOption = { id: string; originalFilename: string; isPrimary: boolean };

export function CandidateJobApplyForm({
  orgSlug,
  postingSlug,
  resumes,
  alreadyApplied,
}: {
  orgSlug: string;
  postingSlug: string;
  resumes: ResumeOption[];
  alreadyApplied: boolean;
}) {
  const router = useRouter();
  const [resumeId, setResumeId] = useState(resumes.find((resume) => resume.isPrimary)?.id ?? resumes[0]?.id ?? '');
  const [coverNote, setCoverNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadyApplied);

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resumeId || submitting || submitted) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/candidate/jobs/${encodeURIComponent(orgSlug)}/${encodeURIComponent(postingSlug)}/apply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ resumeId, coverNote }),
      });
      const result = await response.json().catch(() => null) as { error?: string; application?: { id: string } } | null;
      if (!response.ok) {
        setError(result?.error ?? 'Unable to submit your application. Please try again.');
        if (response.status === 409) setSubmitted(true);
        return;
      }
      setSubmitted(true);
      router.refresh();
    } catch {
      setError('Unable to connect. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-card border border-line bg-surface p-5">
        <p className="text-sm font-medium text-ink">Application already submitted</p>
        <p className="mt-1 text-sm text-ink-2">You can review its progress from My Applications.</p>
        <a href="/candidate/dashboard#applications" className="mt-3 inline-flex text-sm font-medium text-ink underline underline-offset-4">View application history</a>
      </div>
    );
  }

  if (!resumes.length) {
    return (
      <div className="rounded-card border border-dashed border-line bg-surface p-5">
        <p className="text-sm font-medium text-ink">Upload a resume to apply</p>
        <p className="mt-1 text-sm text-ink-2">Applications use a resume stored in your Candidate Portal account.</p>
        <a href="/candidate/resumes" className="mt-3 inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-medium text-white">Go to My resumes</a>
      </div>
    );
  }

  return (
    <form onSubmit={apply} className="space-y-4 rounded-card border border-line bg-surface p-5">
      <label className="block text-sm font-medium text-ink">
        Resume
        <select value={resumeId} onChange={(event) => setResumeId(event.target.value)} required className="mt-2 h-11 w-full rounded-field border border-line bg-canvas px-3 text-sm text-ink">
          {resumes.map((resume) => (
            <option key={resume.id} value={resume.id}>{resume.originalFilename}{resume.isPrimary ? ' · Primary' : ''}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-ink">
        Cover note <span className="font-normal text-ink-3">(optional)</span>
        <textarea value={coverNote} onChange={(event) => setCoverNote(event.target.value.slice(0, 5000))} rows={5} maxLength={5000} placeholder="Add a short note for the hiring team…" className="mt-2 w-full rounded-field border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ink-3" />
      </label>
      {error ? <p role="alert" className="text-sm text-critical">{error}</p> : null}
      <button type="submit" disabled={!resumeId || submitting} className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>
      <p className="text-xs leading-5 text-ink-3">Your selected resume and profile details will be shared with this employer for this application.</p>
    </form>
  );
}
