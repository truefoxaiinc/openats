import type { Metadata } from 'next';
import { CandidateAuthForm } from '@/components/candidate-auth-form';

export const metadata: Metadata = { title: 'Create candidate account | OpenATS', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function CandidateSignupPage() {
  return <CandidateAuthForm mode="signup" />;
}
