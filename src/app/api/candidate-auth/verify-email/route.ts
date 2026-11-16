import { NextResponse } from 'next/server';
import { allowCandidateAuthAttempt } from '@/server/candidate-auth/rate-limit';
import { verifyCandidateEmail } from '@/server/candidate-auth/service';
import { sameOriginRequest } from '@/server/candidate-auth/validation';

export async function POST(request: Request) {
  if (!(await sameOriginRequest(request))) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const { token } = await request.json();
    if (!(await allowCandidateAuthAttempt(request, 'verify-email', String(token ?? ''), 8))) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    const ok = await verifyCandidateEmail(typeof token === 'string' ? token : '');
    return NextResponse.json(ok ? { ok: true } : { error: 'This verification link is invalid or expired.' }, { status: ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ error: 'Unable to verify this address.' }, { status: 500 });
  }
}
