import type { Metadata } from 'next';
import { CandidateAuthForm } from '@/components/candidate-auth-form';

export const metadata: Metadata = { title: 'Create candidate account | OpenATS' };

export default function CandidateSignupPage() {
  return <CandidateAuthForm mode="signup" />;
}
