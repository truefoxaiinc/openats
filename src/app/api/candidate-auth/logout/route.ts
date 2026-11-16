import { NextResponse } from 'next/server';
import { revokeCandidateSession } from '@/server/candidate-auth/session';
import { sameOriginRequest } from '@/server/candidate-auth/validation';

export async function POST(request: Request) {
  if (!(await sameOriginRequest(request))) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  await revokeCandidateSession();
  return NextResponse.json({ ok: true });
}
