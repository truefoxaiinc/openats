import { NextResponse } from 'next/server';
import { allowCandidateAuthAttempt } from '@/server/candidate-auth/rate-limit';
import { resetCandidatePassword } from '@/server/candidate-auth/service';
import { sameOriginRequest } from '@/server/candidate-auth/validation';

export async function POST(request: Request) {
  if (!(await sameOriginRequest(request))) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const { token, password } = await request.json();
    if (!(await allowCandidateAuthAttempt(request, 'reset-password', String(token ?? ''), 5))) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    const ok = await resetCandidatePassword(typeof token === 'string' ? token : '', password);
    return NextResponse.json(ok ? { ok: true } : { error: 'This reset link is invalid or expired, or the password is too short.' }, { status: ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ error: 'Unable to reset your password.' }, { status: 500 });
  }
}
