import type { Metadata } from 'next';
import { CandidateAuthForm } from '@/components/candidate-auth-form';

export const metadata: Metadata = { title: 'Reset candidate password | OpenATS' };

export default async function CandidateResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return <CandidateAuthForm mode="reset" token={token} />;
}
