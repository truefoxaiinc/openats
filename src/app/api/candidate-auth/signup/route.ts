import { NextResponse } from 'next/server';
import { registerCandidate } from '@/server/candidate-auth/service';
import { sameOriginRequest } from '@/server/candidate-auth/validation';

export async function POST(request: Request) {
  if (!(await sameOriginRequest(request))) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const body = await request.json();
    const result = await registerCandidate(body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ message: 'If this address can be registered, a verification email will be sent.' });
  } catch {
    return NextResponse.json({ error: 'Unable to create your account right now.' }, { status: 500 });
  }
}
