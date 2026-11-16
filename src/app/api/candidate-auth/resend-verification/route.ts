import { NextResponse } from 'next/server';
import { allowCandidateAuthAttempt } from '@/server/candidate-auth/rate-limit';
import { resendCandidateVerification } from '@/server/candidate-auth/service';
import { sameOriginRequest } from '@/server/candidate-auth/validation';

export async function POST(request: Request) {
  if (!(await sameOriginRequest(request))) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const { email } = await request.json();
    if (!(await allowCandidateAuthAttempt(request, 'resend-verification', String(email ?? ''), 3, 60 * 60_000))) {
      return NextResponse.json({ message: 'If an unverified account exists for that address, a new verification link will be sent.' });
    }
    await resendCandidateVerification(email);
  } catch {
    // Keep the response identical to avoid account enumeration.
  }
  return NextResponse.json({ message: 'If an unverified account exists for that address, a new verification link will be sent.' });
}
