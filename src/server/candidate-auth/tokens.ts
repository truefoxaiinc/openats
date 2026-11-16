import { createHash, randomBytes } from 'node:crypto';

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenExpiry(envName: string, fallbackMinutes: number): Date {
  const configured = Number(process.env[envName]);
  const minutes = Number.isFinite(configured) && configured > 0 ? configured : fallbackMinutes;
  return new Date(Date.now() + minutes * 60_000);
}

export function sessionExpiry(): Date {
  const configured = Number(process.env.CANDIDATE_SESSION_TTL_DAYS);
  const days = Number.isFinite(configured) && configured > 0 ? configured : 30;
  return new Date(Date.now() + days * 86_400_000);
}
