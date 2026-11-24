'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';

type Resume = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  createdAt: string;
  parseJobs: {
    id: string;
    status: string;
    attempts: number;
    maxAttempts: number;
    errorCode: string | null;
    safeErrorMessage: string | null;
  }[];
};

async function responseData(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (response.status === 401 || response.redirected) throw new Error('Your candidate session has expired. Sign in again.');
    throw new Error(`The server returned an unexpected response (${response.status}). Please refresh and try again.`);
  }
  return response.json();
}

function statusDetails(
  status: string | undefined,
  extractionReady: boolean,
  errorCode: string | null | undefined,
  providerLabel: string | null,
) {
  if (status === 'COMPLETED') return { title: 'Profile extraction complete', detail: 'Your resume details are ready to review.', progress: 100, kind: 'success' };
  if (status === 'REVIEW_REQUIRED') return { title: 'AI scan complete', detail: 'Review the extracted details and fill in anything missing.', progress: 100, kind: 'success' };
  if (errorCode === 'provider_bad_request') {
    const provider = providerLabel ?? 'AI provider';
    const detail = providerLabel === 'OpenRouter'
      ? 'OpenRouter rejected the model request. Use a full model ID such as x-ai/grok-4.7, then retry the scan.'
      : `${provider} rejected the model request. Check the exact model ID and JSON output support, then retry the scan.`;
    return { title: 'AI provider rejected this scan', detail, progress: 0, kind: 'error' };
  }
  if (status === 'QUEUED' && errorCode) {
    return { title: 'Scan retry scheduled', detail: 'The previous attempt failed. Check the parser settings while the server retries.', progress: 0, kind: 'error' };
  }
  if (status === 'FAILED') return { title: 'Extraction needs another try', detail: 'Your resume is safe. Retry the AI scan when ready.', progress: 100, kind: 'error' };
  if (!extractionReady) return { title: 'AI extraction is not configured', detail: 'The resume can be stored, but automatic profile extraction is unavailable on this server.', progress: 0, kind: 'error' };
  if (status === 'PARSING') return { title: 'AI is extracting your profile', detail: 'Finding your experience, education, skills, projects and more.', progress: 75, kind: 'active' };
  if (status === 'EXTRACTING') return { title: 'Reading your resume', detail: 'Preparing the text for the AI scan.', progress: 45, kind: 'active' };
  if (status === 'UPLOADED' || status === 'QUEUED') return { title: 'Preparing the AI scan', detail: 'Your resume is queued and the model is starting.', progress: 20, kind: 'active' };
  return { title: 'Ready for AI extraction', detail: 'Your uploaded resume will be scanned automatically.', progress: 0, kind: 'neutral' };
}

export function CandidateResumeManager({
  initialResumes,
  initialExtractionReady,
  initialParserProvider,
}: {
  initialResumes: Resume[];
  initialExtractionReady: boolean;
  initialParserProvider: string | null;
}) {
  const [resumes, setResumes] = useState(initialResumes);
  const [extractionReady, setExtractionReady] = useState(initialExtractionReady);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/candidate/resumes', { cache: 'no-store' });
    const data = await responseData(response);
    if (!response.ok) throw new Error(data.error ?? 'Unable to refresh your resumes.');
    setResumes(data.resumes);
  }, []);

  useEffect(() => {
    const pending = resumes.some((resume) =>
      ['UPLOADED', 'EXTRACTING', 'PARSING'].includes(resume.parseJobs[0]?.status ?? '') ||
      (resume.parseJobs[0]?.status === 'QUEUED' && !resume.parseJobs[0]?.errorCode),
    );
    if (!pending) return;
    const timer = window.setInterval(() => {
      void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to refresh resume status.'));
    }, 2500);
    return () => window.clearInterval(timer);
  }, [resumes, refresh]);

  async function upload(file?: File) {
    if (!file) return;
    setError('');
    setMessage('');
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setError('Only PDF and DOCX files are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Maximum file size is 10 MB.');
      return;
    }

    setBusy(true);
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/candidate/resumes', {
        method: 'POST',
        body,
        credentials: 'same-origin',
      });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error ?? 'Upload failed.');
      const configured = data.extractionConfigured === true;
      setExtractionReady(configured);
      setMessage(configured
        ? 'Upload complete. Your AI scan is starting.'
        : 'Resume uploaded. Automatic AI extraction is not configured on this server.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed.');
    } finally {
      setBusy(false);
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this resume? This cannot be undone.')) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/candidate/resumes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error ?? 'Delete failed.');
      setResumes((rows) => rows.filter((resume) => resume.id !== id));
      setMessage('Resume deleted.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Delete failed.');
    } finally {
      setBusy(false);
    }
  }

  async function retry(id: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/candidate/resumes/${encodeURIComponent(id)}/retry`, { method: 'POST' });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error ?? 'Retry failed.');
      setMessage('AI scan queued. We will update the status automatically.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Retry failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className={`rounded-card border p-5 sm:p-6 ${extractionReady ? 'border-line bg-surface' : 'border-caution/30 bg-caution/5'}`}>
        <div className="flex items-start gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${extractionReady ? 'bg-muted text-ink' : 'bg-caution/10 text-caution'}`}>
            {extractionReady ? <Sparkles size={18} strokeWidth={1.75} /> : <AlertCircle size={18} strokeWidth={1.75} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">AI-powered profile extraction</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${extractionReady ? 'bg-positive/10 text-positive' : 'bg-caution/10 text-caution'}`}>
                {extractionReady ? 'Ready' : 'Setup needed'}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-2">
              {extractionReady
                ? 'Upload a resume to extract your experience, education, skills, projects, certifications and languages. Review the extracted information before relying on it.'
                : 'Resume uploads are available, but automatic extraction needs a model configured on this server.'}
            </p>
          </div>
        </div>
      </div>

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files[0]);
        }}
        className={`rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-12 ${
          dragging ? 'border-ink-3 bg-muted' : 'border-line bg-surface hover:border-line-strong'
        }`}
      >
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-ink">
          {uploading ? <LoaderCircle size={21} className="animate-spin" /> : <Upload size={21} strokeWidth={1.75} />}
        </span>
        <h2 className="mt-4 text-base font-semibold text-ink">
          {uploading ? 'Uploading your resume…' : dragging ? 'Drop your resume to upload' : 'Upload your resume'}
        </h2>
        <p className="mt-2 text-sm text-ink-2">PDF or DOCX · Maximum 10 MB</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText size={16} />
          {uploading ? 'Uploading…' : 'Choose a file'}
        </button>
        <input
          ref={input}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => void upload(event.target.files?.[0])}
        />
        <p className="mt-3 text-xs text-ink-3">Your resume is private to your candidate account.</p>
      </div>

      {message ? <p role="status" className="rounded-xl bg-muted px-4 py-3 text-sm text-ink">{message}</p> : null}
      {error ? <p role="alert" className="rounded-xl bg-critical/10 px-4 py-3 text-sm text-critical">{error}</p> : null}

      <div className="space-y-3">
        {resumes.length ? resumes.map((resume) => {
          const job = resume.parseJobs[0];
          const status = statusDetails(job?.status, extractionReady, job?.errorCode, initialParserProvider);
          const StatusIcon = status.kind === 'success'
            ? CheckCircle2
            : status.kind === 'error'
              ? AlertCircle
              : status.kind === 'active'
                ? LoaderCircle
                : Sparkles;
          const statusColor = status.kind === 'success'
            ? 'text-positive'
            : status.kind === 'error'
              ? 'text-critical'
              : status.kind === 'active'
                ? 'text-ink'
                : 'text-ink-2';

          return (
            <article key={resume.id} className="rounded-card border border-line bg-surface p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-ink">
                    <FileText size={18} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-all text-sm font-semibold text-ink">{resume.originalFilename}</h3>
                    <p className="mt-1 text-xs text-ink-3">
                      {(resume.sizeBytes / 1048576).toFixed(2)} MB · {new Date(resume.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {resume.isPrimary ? (
                  <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-ink-2">Current resume</span>
                ) : null}
              </div>

              <div className="mt-5 rounded-xl bg-canvas p-4">
                <div className="flex items-start gap-2.5">
                  <StatusIcon
                    size={17}
                    className={`mt-0.5 shrink-0 ${statusColor} ${status.kind === 'active' ? 'animate-spin' : ''}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${statusColor}`}>{status.title}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-2">{status.detail}</p>
                    {job?.safeErrorMessage && !job.errorCode ? <p className="mt-2 text-xs text-critical">{job.safeErrorMessage}</p> : null}
                    {job?.errorCode ? <p className="mt-2 text-xs text-ink-3">Error code: {job.errorCode}</p> : null}
                    {status.kind === 'active' ? (
                      <div
                        role="progressbar"
                        aria-label="AI resume extraction progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={status.progress}
                        className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"
                      >
                        <div
                          className="h-full rounded-full bg-ink transition-[width] duration-500"
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                    ) : null}
                    {job && ['COMPLETED', 'REVIEW_REQUIRED'].includes(job.status) ? (
                      <Link
                        href="/candidate/profile"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink underline underline-offset-4"
                      >
                        Review extracted profile <ArrowUpRight size={13} />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <a
                  className="inline-flex items-center gap-1.5 text-ink-2 underline underline-offset-4 hover:text-ink"
                  href={`/api/candidate/resumes/${encodeURIComponent(resume.id)}`}
                >
                  Download
                </a>
                {job && ['FAILED', 'QUEUED'].includes(job.status) && job.errorCode && job.attempts < job.maxAttempts ? (
                  <button
                    disabled={busy}
                    onClick={() => void retry(resume.id)}
                    className="inline-flex items-center gap-1.5 text-ink-2 underline underline-offset-4 hover:text-ink disabled:opacity-50"
                  >
                    <RotateCcw size={14} /> Retry scan
                  </button>
                ) : null}
                <button
                  disabled={busy}
                  onClick={() => void remove(resume.id)}
                  className="inline-flex items-center gap-1.5 text-ink-2 underline underline-offset-4 hover:text-critical disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </article>
          );
        }) : (
          <div className="rounded-card border border-dashed border-line bg-surface px-6 py-9 text-center">
            <p className="text-sm font-medium text-ink">No resumes uploaded yet</p>
            <p className="mt-1 text-sm text-ink-3">Your uploaded resumes and AI scan progress will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
