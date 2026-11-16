import { NextResponse } from 'next/server';
import { loginCandidate } from '@/server/candidate-auth/service';
import { sameOriginRequest } from '@/server/candidate-auth/validation';

export async function POST(request: Request) {
  if (!(await sameOriginRequest(request))) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const result = await loginCandidate(await request.json());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 });
  }
}
