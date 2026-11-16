'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CandidateClaimButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function requestClaim() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/candidate-auth/claim-applications', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to send confirmation.');
      setMessage(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send confirmation.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-5">
      <Button variant="secondary" onClick={requestClaim} disabled={busy}>{busy ? 'Sending…' : 'Connect application history'}</Button>
      {message ? <p role="status" className="mt-3 text-sm text-ink-2">{message}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-critical">{error}</p> : null}
    </div>
  );
}
