import { NextResponse } from 'next/server';
import { allowCandidateAuthAttempt } from '@/server/candidate-auth/rate-limit';
import { requestCandidatePasswordReset } from '@/server/candidate-auth/service';
import { sameOriginRequest } from '@/server/candidate-auth/validation';

export async function POST(request: Request) {
  if (!(await sameOriginRequest(request))) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const { email } = await request.json();
    if (!(await allowCandidateAuthAttempt(request, 'forgot-password', String(email ?? ''), 4))) return NextResponse.json({ message: 'If a verified account exists for that address, a reset link will be sent.' });
    await requestCandidatePasswordReset(email);
  } catch {
    // Keep the response identical to avoid account enumeration.
  }
  return NextResponse.json({ message: 'If a verified account exists for that address, a reset link will be sent.' });
}
