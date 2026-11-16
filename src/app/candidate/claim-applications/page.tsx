import type { Metadata } from 'next';
import { CandidateAuthForm } from '@/components/candidate-auth-form';

export const metadata: Metadata = { title: 'Connect application history | OpenATS', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function CandidateClaimApplicationsPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return <CandidateAuthForm mode="claim" token={token} />;
}
