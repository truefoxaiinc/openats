import { describe, expect, it } from 'vitest';
import { createOpaqueToken, hashOpaqueToken, sessionExpiry, tokenExpiry } from './tokens';

describe('candidate authentication tokens', () => {
  it('creates URL-safe opaque tokens with independent values', () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first).not.toBe(second);
  });

  it('stores a deterministic SHA-256 digest rather than the raw token', () => {
    const token = createOpaqueToken();
    const digest = hashOpaqueToken(token);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).toBe(hashOpaqueToken(token));
    expect(digest).not.toBe(token);
  });

  it('uses the configured expiry and a safe default', () => {
    const original = process.env.CANDIDATE_EMAIL_VERIFICATION_TTL_MINUTES;
    process.env.CANDIDATE_EMAIL_VERIFICATION_TTL_MINUTES = '45';
    const before = Date.now();
    const expiry = tokenExpiry('CANDIDATE_EMAIL_VERIFICATION_TTL_MINUTES', 30);
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 45 * 60_000);
    if (original === undefined) delete process.env.CANDIDATE_EMAIL_VERIFICATION_TTL_MINUTES;
    else process.env.CANDIDATE_EMAIL_VERIFICATION_TTL_MINUTES = original;
  });

  it('defaults candidate sessions to 30 days', () => {
    const original = process.env.CANDIDATE_SESSION_TTL_DAYS;
    delete process.env.CANDIDATE_SESSION_TTL_DAYS;
    const before = Date.now();
    expect(sessionExpiry().getTime()).toBeGreaterThanOrEqual(before + 30 * 86_400_000);
    if (original !== undefined) process.env.CANDIDATE_SESSION_TTL_DAYS = original;
  });
});
