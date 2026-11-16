import type { Metadata } from 'next';
import { CandidateAuthForm } from '@/components/candidate-auth-form';

export const metadata: Metadata = { title: 'Forgot password | OpenATS' };

export default function CandidateForgotPasswordPage() {
  return <CandidateAuthForm mode="forgot" />;
}
