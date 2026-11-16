import type { Metadata } from 'next';
import { CandidateAuthForm } from '@/components/candidate-auth-form';

export const metadata: Metadata = { title: 'Resend email verification | OpenATS' };

export default function CandidateResendVerificationPage() {
  return <CandidateAuthForm mode="resend" />;
}
