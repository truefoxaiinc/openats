import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { requestOrigin } from '@/server/request-origin';
import { createOpaqueToken, hashOpaqueToken, sessionExpiry } from './tokens';

export const CANDIDATE_SESSION_COOKIE = 'openats.candidate-session';

export async function createCandidateSession(candidateAccountId: string): Promise<void> {
  const token = createOpaqueToken();
  const expiresAt = sessionExpiry();
  await db.candidateSession.create({
    data: { candidateAccountId, tokenHash: hashOpaqueToken(token), expiresAt },
  });
  const { https } = await requestOrigin();
  (await cookies()).set(CANDIDATE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || https,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function getCandidateSession() {
  const token = (await cookies()).get(CANDIDATE_SESSION_COOKIE)?.value;
  if (!token) return null;
  return db.candidateSession.findFirst({
    where: {
      tokenHash: hashOpaqueToken(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
      candidateAccount: { emailVerifiedAt: { not: null } },
    },
    select: {
      id: true,
      candidateAccount: {
        select: { id: true, email: true, name: true, emailVerifiedAt: true, createdAt: true },
      },
    },
  });
}

export async function revokeCandidateSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(CANDIDATE_SESSION_COOKIE)?.value;
  if (token) {
    await db.candidateSession.updateMany({
      where: { tokenHash: hashOpaqueToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(CANDIDATE_SESSION_COOKIE);
}
