import { NextResponse } from 'next/server';
import { getCandidateSession } from '@/server/candidate-auth/session';
import { requestApplicationClaim } from '@/server/candidate-auth/service';
import { sameOriginRequest } from '@/server/candidate-auth/validation';

export async function POST(request: Request) {
  if (!(await sameOriginRequest(request))) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const session = await getCandidateSession();
  if (!session) return NextResponse.json({ error: 'Sign in with a verified candidate account first.' }, { status: 401 });
  try {
    await requestApplicationClaim(session.candidateAccount.id);
    return NextResponse.json({ message: 'A confirmation link has been sent to your verified email address.' });
  } catch {
    return NextResponse.json({ error: 'Unable to send the confirmation email right now.' }, { status: 500 });
  }
}
