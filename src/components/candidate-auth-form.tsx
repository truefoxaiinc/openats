'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Mode = 'login' | 'signup' | 'forgot' | 'reset' | 'verify' | 'claim' | 'resend';

const config: Record<Mode, { title: string; description: string; endpoint: string; submit: string }> = {
  login: { title: 'Welcome back', description: 'Sign in to your candidate account.', endpoint: '/api/candidate-auth/login', submit: 'Sign in' },
  signup: { title: 'Create your candidate account', description: 'Use one account to access your candidate workspace.', endpoint: '/api/candidate-auth/signup', submit: 'Create account' },
  forgot: { title: 'Reset your password', description: 'Enter your account email and we will send a reset link if an account exists.', endpoint: '/api/candidate-auth/forgot-password', submit: 'Send reset link' },
  reset: { title: 'Choose a new password', description: 'Use at least 12 characters for your new password.', endpoint: '/api/candidate-auth/reset-password', submit: 'Update password' },
  verify: { title: 'Verify your email', description: 'Confirm the email address used to create your candidate account.', endpoint: '/api/candidate-auth/verify-email', submit: 'Verify email' },
  claim: { title: 'Connect your application history', description: 'Confirm the request sent to your verified email address.', endpoint: '/api/candidate-auth/claim-applications/confirm', submit: 'Confirm and connect' },
  resend: { title: 'Resend verification email', description: 'Enter the email address used to register. If it is still unverified, we will send a fresh link.', endpoint: '/api/candidate-auth/resend-verification', submit: 'Resend verification' },
};

export function CandidateAuthForm({ mode, token = '', errorMessage = '' }: { mode: Mode; token?: string; errorMessage?: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(errorMessage);
  const [busy, setBusy] = useState(false);
  const item = config[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const payload: Record<string, unknown> = {};
    if (mode === 'signup') Object.assign(payload, { name, email, password, phoneE164, phoneCountryCode, termsAccepted, privacyPolicyAccepted });
    if (mode === 'login') Object.assign(payload, { email, password });
    if (mode === 'forgot' || mode === 'resend') Object.assign(payload, { email });
    if (mode === 'reset') Object.assign(payload, { token, password });
    if (mode === 'verify' || mode === 'claim') Object.assign(payload, { token });
    try {
      const response = await fetch(item.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Something went wrong. Please try again.');
      if (mode === 'login') {
        router.replace('/candidate/dashboard');
        router.refresh();
      } else if (mode === 'reset' || mode === 'verify') {
        setMessage(mode === 'reset' ? 'Your password has been updated. You can now sign in.' : 'Your email is verified. You can now sign in.');
      } else if (mode === 'claim') {
        setMessage(`Connected ${result.linked} application record(s). Sign in to view your application history.`);
      } else {
        setMessage(result.message ?? 'Check your email for the next step.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-lift sm:p-8">
        <Link href="/" className="text-sm font-semibold tracking-tight text-ink">OpenATS</Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">{item.title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-2">{item.description}</p>
        {error ? <p role="alert" className="mt-5 rounded-xl bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p> : null}
        {message ? <p role="status" className="mt-5 rounded-xl bg-muted px-3 py-3 text-sm text-ink">{message}</p> : null}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === 'signup' ? (
            <label className="block text-sm text-ink-2">Full name
              <input autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-ink-3" />
            </label>
          ) : null}
          {mode === 'login' || mode === 'signup' || mode === 'forgot' || mode === 'resend' ? (
            <label className="block text-sm text-ink-2">Email address
              <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-ink-3" />
            </label>
          ) : null}
          {mode === 'signup' ? (
            <>
              <label className="block text-sm text-ink-2">Country calling code (optional)
                <input type="tel" inputMode="tel" placeholder="+91" value={phoneCountryCode} onChange={(e) => setPhoneCountryCode(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-ink-3" />
              </label>
              <label className="block text-sm text-ink-2">Phone number in international format (optional)
                <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+919876543210" value={phoneE164} onChange={(e) => setPhoneE164(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-ink-3" />
              </label>
              <p className="-mt-2 text-xs text-ink-3">If you add a phone number, enter both fields and make sure the country code matches. Otherwise, leave both blank.</p>
              <label className="flex items-start gap-2 text-sm text-ink-2">
                <input type="checkbox" required checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1" />
                <span>I accept the Terms of Use.</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-ink-2">
                <input type="checkbox" required checked={privacyPolicyAccepted} onChange={(e) => setPrivacyPolicyAccepted(e.target.checked)} className="mt-1" />
                <span>I acknowledge the Privacy Policy.</span>
              </label>
            </>
          ) : null}
          {mode === 'login' || mode === 'signup' || mode === 'reset' ? (
            <label className="block text-sm text-ink-2">{mode === 'reset' ? 'New password' : 'Password'}
              <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-ink-3" />
            </label>
          ) : null}
          <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">{busy ? 'Please wait…' : item.submit}</Button>
        </form>
        {mode === 'login' ? (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
            <a href="/api/candidate-auth/google/start" className="flex h-11 w-full items-center justify-center rounded-full border border-line text-sm font-medium text-ink hover:bg-muted">Continue with Google</a>
            <div className="mt-5 flex justify-between text-sm"><span className="flex gap-3"><Link className="text-ink-2 underline underline-offset-4" href="/candidate/forgot-password">Forgot password?</Link><Link className="text-ink-2 underline underline-offset-4" href="/candidate/resend-verification">Resend verification</Link></span><Link className="font-medium text-ink underline underline-offset-4" href="/candidate/signup">Create account</Link></div>
          </>
        ) : null}
        {mode === 'signup' ? <p className="mt-5 text-center text-sm text-ink-2">Already registered? <Link className="font-medium text-ink underline underline-offset-4" href="/candidate/login">Sign in</Link></p> : null}
        {mode === 'forgot' ? <p className="mt-5 text-sm text-ink-2"><Link className="underline underline-offset-4" href="/candidate/login">Back to sign in</Link></p> : null}
        {(mode === 'reset' || mode === 'verify' || mode === 'claim') && message ? <Link className="mt-5 inline-block text-sm font-medium text-ink underline underline-offset-4" href="/candidate/login">Continue to sign in</Link> : null}
      </div>
    </main>
  );
}
