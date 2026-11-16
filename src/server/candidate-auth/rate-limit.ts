import { createHash, randomUUID } from 'node:crypto';
import { db } from '@/lib/db';

/** Atomic PostgreSQL throttle shared across server instances. */
export async function allowCandidateAuthAttempt(
  request: Request,
  action: string,
  identifier: string,
  limit = 8,
  windowMs = 15 * 60_000,
): Promise<boolean> {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown';
  const keyHash = createHash('sha256').update(`${action}\0${identifier}\0${ip}`).digest('hex');
  const blockMs = windowMs;
  const rows = await db.$queryRaw<Array<{ allowed: boolean }>>`
    INSERT INTO "CandidateAuthRateLimit"
      ("id", "keyHash", "action", "windowStartedAt", "attempts", "updatedAt")
    VALUES
      (${randomUUID()}, ${keyHash}, ${action}, NOW(), 1, NOW())
    ON CONFLICT ("keyHash", "action") DO UPDATE SET
      "attempts" = CASE
        WHEN "CandidateAuthRateLimit"."windowStartedAt" < NOW() - (${windowMs} * INTERVAL '1 millisecond') THEN 1
        ELSE "CandidateAuthRateLimit"."attempts" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "CandidateAuthRateLimit"."windowStartedAt" < NOW() - (${windowMs} * INTERVAL '1 millisecond') THEN NOW()
        ELSE "CandidateAuthRateLimit"."windowStartedAt"
      END,
      "blockedUntil" = CASE
        WHEN (CASE
          WHEN "CandidateAuthRateLimit"."windowStartedAt" < NOW() - (${windowMs} * INTERVAL '1 millisecond') THEN 1
          ELSE "CandidateAuthRateLimit"."attempts" + 1
        END) > ${limit}
        THEN NOW() + (${blockMs} * INTERVAL '1 millisecond')
        ELSE "CandidateAuthRateLimit"."blockedUntil"
      END,
      "updatedAt" = NOW()
    RETURNING ("blockedUntil" IS NULL OR "blockedUntil" <= NOW()) AS allowed
  `;
  return rows[0]?.allowed === true;
}
