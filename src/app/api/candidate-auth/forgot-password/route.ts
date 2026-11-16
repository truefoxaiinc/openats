import { NextResponse } from 'next/server';
import { requestCandidatePasswordReset } from '@/server/candidate-auth/service';
import { sameOriginRequest } from '@/server/candidate-auth/validation';

export async function POST(request: Request) {
  if (!(await sameOriginRequest(request))) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const { email } = await request.json();
    await requestCandidatePasswordReset(email);
  } catch {
    // Keep the response identical to avoid account enumeration.
  }
  return NextResponse.json({ message: 'If a verified account exists for that address, a reset link will be sent.' });
}
