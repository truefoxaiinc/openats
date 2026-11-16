import type { Metadata } from 'next';
import { CandidateAuthForm } from '@/components/candidate-auth-form';

export const metadata: Metadata = { title: 'Candidate sign in | OpenATS' };

const errors: Record<string, string> = {
  'google-unavailable': 'Google sign-in is not configured.',
  'google-invalid-state': 'The Google sign-in session expired. Please try again.',
  'google-token-exchange': 'Google sign-in could not be completed.',
  'google-invalid-token': 'Google returned an invalid sign-in response.',
  'google-invalid-identity': 'Google could not verify this account.',
  'google-email-in-use': 'An account already uses this email. Sign in with your password instead.',
  'google-signin-failed': 'Google sign-in failed. Please try again.',
};

export default async function CandidateLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; verified?: string }> }) {
  const params = await searchParams;
  return <CandidateAuthForm mode="login" errorMessage={errors[params.error ?? ''] ?? (params.verified ? '' : '')} />;
}
