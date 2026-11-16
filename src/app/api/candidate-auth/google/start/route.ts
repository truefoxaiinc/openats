import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requestOrigin } from '@/server/request-origin';

const cookieOptions = (secure: boolean) => ({
  httpOnly: true, secure: process.env.NODE_ENV === 'production' || secure,
  sameSite: 'lax' as const, path: '/', maxAge: 600,
});

export async function GET() {
  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId || !process.env.AUTH_GOOGLE_SECRET) {
    return NextResponse.redirect(new URL('/candidate/login?error=google-unavailable', (await requestOrigin()).origin ?? 'http://localhost:3000'));
  }
  const { origin, https } = await requestOrigin();
  if (!origin) return new NextResponse('Unable to determine the public origin.', { status: 400 });
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const callback = `${origin}/api/candidate-auth/google/callback`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: clientId, redirect_uri: callback, response_type: 'code',
    scope: 'openid email profile', state, nonce, code_challenge: challenge,
    code_challenge_method: 'S256', prompt: 'select_account',
  }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set('openats.candidate-oauth-state', state, cookieOptions(https));
  response.cookies.set('openats.candidate-oauth-verifier', verifier, cookieOptions(https));
  response.cookies.set('openats.candidate-oauth-nonce', nonce, cookieOptions(https));
  return response;
}
