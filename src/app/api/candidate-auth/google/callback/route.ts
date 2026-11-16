import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requestOrigin } from '@/server/request-origin';
import { signInCandidateWithGoogle } from '@/server/candidate-auth/service';

function equalSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function clearOAuthCookies(response: NextResponse) {
  for (const name of ['openats.candidate-oauth-state', 'openats.candidate-oauth-verifier', 'openats.candidate-oauth-nonce']) {
    response.cookies.delete(name);
  }
  return response;
}

function fail(request: NextRequest, reason: string) {
  return clearOAuthCookies(NextResponse.redirect(new URL(`/candidate/login?error=${reason}`, request.url)));
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state') ?? '';
  const code = request.nextUrl.searchParams.get('code') ?? '';
  const savedState = request.cookies.get('openats.candidate-oauth-state')?.value ?? '';
  const verifier = request.cookies.get('openats.candidate-oauth-verifier')?.value ?? '';
  const nonce = request.cookies.get('openats.candidate-oauth-nonce')?.value ?? '';
  if (!code || !state || !savedState || !equalSecret(state, savedState) || !verifier || !nonce) return fail(request, 'google-invalid-state');

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const { origin } = await requestOrigin();
  if (!clientId || !clientSecret || !origin) return fail(request, 'google-unavailable');

  try {
    const callback = `${origin}/api/candidate-auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: callback, grant_type: 'authorization_code', code_verifier: verifier,
      }),
      cache: 'no-store',
    });
    if (!tokenResponse.ok) return fail(request, 'google-token-exchange');
    const tokenSet = await tokenResponse.json() as { id_token?: string };
    if (!tokenSet.id_token) return fail(request, 'google-invalid-token');

    // Google tokeninfo verifies the signed ID token; the local nonce check binds it to this flow.
    const infoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenSet.id_token)}`, { cache: 'no-store' });
    if (!infoResponse.ok) return fail(request, 'google-invalid-token');
    const info = await infoResponse.json() as Record<string, unknown>;
    const segments = tokenSet.id_token.split('.');
    const claims = segments.length === 3
      ? JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as Record<string, unknown>
      : {};
    const expiry = Number(info.exp);
    const verified = info.email_verified === true || info.email_verified === 'true';
    if (
      info.aud !== clientId ||
      !['accounts.google.com', 'https://accounts.google.com'].includes(String(info.iss)) ||
      !Number.isFinite(expiry) || expiry <= Date.now() / 1000 ||
      !verified || typeof info.sub !== 'string' || typeof info.email !== 'string' ||
      claims.nonce !== nonce
    ) return fail(request, 'google-invalid-identity');

    const outcome = await signInCandidateWithGoogle({
      sub: info.sub,
      email: info.email.trim().toLowerCase(),
      name: typeof info.name === 'string' ? info.name.trim().slice(0, 120) : '',
    });
    if (outcome === 'email-in-use') return fail(request, 'google-email-in-use');
    return clearOAuthCookies(NextResponse.redirect(new URL('/candidate/dashboard', request.url)));
  } catch {
    return fail(request, 'google-signin-failed');
  }
}
