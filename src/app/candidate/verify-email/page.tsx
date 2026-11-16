import type { Metadata } from 'next';
import { CandidateAuthForm } from '@/components/candidate-auth-form';

export const metadata: Metadata = { title: 'Verify candidate email | OpenATS' };

export default async function CandidateVerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return <CandidateAuthForm mode="verify" token={token} />;
}
