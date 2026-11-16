import type { Metadata } from 'next';
import { CandidateAuthForm } from '@/components/candidate-auth-form';

export const metadata: Metadata = { title: 'Resend email verification | OpenATS', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function CandidateResendVerificationPage() {
  return <CandidateAuthForm mode="resend" />;
}
