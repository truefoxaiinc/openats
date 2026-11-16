import type { Metadata } from 'next';
import { CandidateAuthForm } from '@/components/candidate-auth-form';

export const metadata: Metadata = { title: 'Forgot password | OpenATS', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function CandidateForgotPasswordPage() {
  return <CandidateAuthForm mode="forgot" />;
}
