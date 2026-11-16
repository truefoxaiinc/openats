import { NextResponse } from 'next/server';
import { verifyCandidateEmail } from '@/server/candidate-auth/service';
import { sameOriginRequest } from '@/server/candidate-auth/validation';

export async function POST(request: Request) {
  if (!(await sameOriginRequest(request))) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const { token } = await request.json();
    const ok = await verifyCandidateEmail(typeof token === 'string' ? token : '');
    return NextResponse.json(ok ? { ok: true } : { error: 'This verification link is invalid or expired.' }, { status: ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ error: 'Unable to verify this address.' }, { status: 500 });
  }
}
