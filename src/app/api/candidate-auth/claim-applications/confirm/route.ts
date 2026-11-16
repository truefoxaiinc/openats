import { NextResponse } from 'next/server';
import { allowCandidateAuthAttempt } from '@/server/candidate-auth/rate-limit';
import { confirmApplicationClaimByToken } from '@/server/candidate-auth/service';
import { sameOriginRequest } from '@/server/candidate-auth/validation';

export async function POST(request: Request) {
  if (!(await sameOriginRequest(request))) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const { token } = await request.json();
    if (!(await allowCandidateAuthAttempt(request, 'claim-confirm', String(token ?? ''), 5))) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    const linked = await confirmApplicationClaimByToken(typeof token === 'string' ? token : '');
    if (!linked) return NextResponse.json({ error: 'This claim link is invalid, expired or has no unclaimed applications.' }, { status: 400 });
    return NextResponse.json({ ok: true, linked });
  } catch {
    return NextResponse.json({ error: 'Unable to connect application history.' }, { status: 500 });
  }
}
