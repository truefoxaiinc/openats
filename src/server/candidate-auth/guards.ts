import { redirect } from 'next/navigation';
import { getCandidateSession } from './session';

export async function requireCandidateAccount() {
  const session = await getCandidateSession();
  if (!session) redirect('/candidate/login');
  return session.candidateAccount;
}
