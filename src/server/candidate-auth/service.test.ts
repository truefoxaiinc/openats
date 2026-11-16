import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./email', () => ({ sendCandidateEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/server/request-origin', () => ({
  requestOrigin: vi.fn().mockResolvedValue({ origin: 'https://openats.example' }),
}));

import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { registerCandidate } from './service';

const databaseAvailable = Boolean(process.env.TEST_DATABASE_URL);
const createdEmails: string[] = [];

afterEach(async () => {
  if (!databaseAvailable || createdEmails.length === 0) return;
  await db.candidateAccount.deleteMany({ where: { email: { in: createdEmails } } });
  createdEmails.length = 0;
});

describe.skipIf(!databaseAvailable)('candidate registration persistence', () => {
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
