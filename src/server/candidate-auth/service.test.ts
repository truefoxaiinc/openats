import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./email', () => ({ sendCandidateEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./session', () => ({ createCandidateSession: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/server/request-origin', () => ({
  requestOrigin: vi.fn().mockResolvedValue({ origin: 'https://openats.example' }),
}));

import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { loginCandidate, registerCandidate } from './service';

const databaseAvailable = Boolean(process.env.TEST_DATABASE_URL);
const createdEmails: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  if (!databaseAvailable || createdEmails.length === 0) return;
  await db.candidateAccount.deleteMany({ where: { email: { in: createdEmails } } });
  createdEmails.length = 0;
});

describe('candidate registration consent validation', () => {
  it('explains when optional phone details are incomplete', async () => {
    const result = await registerCandidate({
      name: 'Test Candidate',
      email: 'phone-required@example.test',
      password: 'correct horse battery staple',
      phoneE164: '+919876543210',
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });
    expect(result).toEqual({
      ok: false,
      error: 'Enter both phone fields with a matching country code and full international number, or leave both blank.',
    });
  });

  it('explains the password byte limit', async () => {
    const result = await registerCandidate({
      name: 'Test Candidate',
      email: 'password-limit@example.test',
      password: 'é'.repeat(37),
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });
    expect(result).toEqual({
      ok: false,
      error: 'Password must be 12-128 characters and no more than 72 UTF-8 bytes.',
    });
  });

  it('requires explicit Terms of Use acceptance', async () => {
    const result = await registerCandidate({
      name: 'Test Candidate', email: 'terms-required@example.test',
      password: 'correct horse battery staple',
      termsAccepted: false, privacyPolicyAccepted: true,
    });
    expect(result.ok).toBe(false);
  });

  it('requires explicit Privacy Policy acceptance', async () => {
    const result = await registerCandidate({
      name: 'Test Candidate', email: 'privacy-required@example.test',
      password: 'correct horse battery staple',
      termsAccepted: true, privacyPolicyAccepted: false,
    });
    expect(result.ok).toBe(false);
  });
});

describe.skipIf(!databaseAvailable)('candidate registration persistence', () => {
  it('auto-verifies and allows password login without SMTP outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SMTP_URL', '');
    const email = `candidate-${randomUUID()}@example.test`;
    const password = 'correct horse battery staple';
    createdEmails.push(email);

    const result = await registerCandidate({
      name: 'Test Candidate',
      email,
      password,
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });
    expect(result).toEqual({ ok: true, autoVerified: true });

    const account = await db.candidateAccount.findUniqueOrThrow({ where: { email } });
    expect(account.emailVerifiedAt).toBeInstanceOf(Date);
    expect(await loginCandidate({ email, password })).toEqual({ ok: true });
  });

  it('persists E.164 phone, country code and server-stamped policy versions', async () => {
    const email = `candidate-${randomUUID()}@example.test`;
    createdEmails.push(email);
    const result = await registerCandidate({
      name: 'Test Candidate',
      email: `  ${email.toUpperCase()}  `,
      password: 'correct horse battery staple',
      phoneE164: '+919876543210',
      phoneCountryCode: '+91',
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });
    expect(result.ok).toBe(true);

    const account = await db.candidateAccount.findUniqueOrThrow({ where: { email } });
    expect(account.phoneE164).toBe('+919876543210');
    expect(account.phoneCountryCode).toBe('+91');
    expect(account.termsAcceptedAt).toBeInstanceOf(Date);
    expect(account.privacyPolicyAcceptedAt).toBeInstanceOf(Date);
    expect(account.termsVersion).toBe('candidate-terms-v1');
    expect(account.privacyPolicyVersion).toBe('candidate-privacy-v1');
  });

  it('rejects registration unless both policy acknowledgements are accepted', async () => {
    const email = `candidate-${randomUUID()}@example.test`;
    const missingTerms = await registerCandidate({
      name: 'Test Candidate', email, password: 'correct horse battery staple',
      termsAccepted: false, privacyPolicyAccepted: true,
    });
    const missingPrivacy = await registerCandidate({
      name: 'Test Candidate', email, password: 'correct horse battery staple',
      termsAccepted: true, privacyPolicyAccepted: false,
    });
    expect(missingTerms.ok).toBe(false);
    expect(missingPrivacy.ok).toBe(false);
    expect(await db.candidateAccount.count({ where: { email } })).toBe(0);
  });

  it('normalizes case variants and relies on the database expression index for races', async () => {
    const email = `candidate-${randomUUID()}@example.test`;
    createdEmails.push(email.toUpperCase(), email.toLowerCase());
    await db.candidateAccount.create({
      data: { email: email.toUpperCase(), name: 'Existing Candidate' },
    });
    const result = await registerCandidate({
      name: 'Second Candidate', email: email.toLowerCase(),
      password: 'correct horse battery staple',
      termsAccepted: true, privacyPolicyAccepted: true,
    });
    expect(result.ok).toBe(true);
    expect(await db.candidateAccount.count({
      where: { email: { equals: email, mode: 'insensitive' } },
    })).toBe(1);
  });

  it('keeps existing candidate accounts valid with nullable profile and consent fields', async () => {
    const email = `legacy-${randomUUID()}@example.test`;
    createdEmails.push(email);
    const account = await db.candidateAccount.create({
      data: { email, name: 'Legacy Candidate' },
    });
    expect(account.phoneE164).toBeNull();
    expect(account.phoneCountryCode).toBeNull();
    expect(account.termsAcceptedAt).toBeNull();
    expect(account.termsVersion).toBeNull();
    expect(account.privacyPolicyAcceptedAt).toBeNull();
    expect(account.privacyPolicyVersion).toBeNull();
  });
});
