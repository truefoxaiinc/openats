import { afterEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/db', () => ({
  db: {
    candidateAccount: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    candidateEmailVerificationToken: { updateMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('./email', () => ({ sendCandidateEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./session', () => ({ createCandidateSession: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/server/request-origin', () => ({
  requestOrigin: vi.fn().mockResolvedValue({ origin: 'https://openats.example' }),
}));

import { db } from '@/lib/db';
import { sendCandidateEmail } from './email';
import { createCandidateSession } from './session';
import { loginCandidate, registerCandidate } from './service';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('candidate registration without SMTP', () => {
  it('auto-verifies in development and allows password login', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SMTP_URL', '');
    const email = 'candidate@example.test';
    const password = 'correct horse battery staple';
    const passwordHash = await bcrypt.hash(password, 12);
    const verifiedAt = new Date();

    vi.mocked(db.candidateAccount.findUnique)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({
        id: 'candidate-id',
        passwordHash,
        emailVerifiedAt: verifiedAt,
      } as never);
    vi.mocked(db.candidateAccount.create).mockResolvedValue({ id: 'candidate-id' } as never);

    const result = await registerCandidate({
      name: 'Test Candidate',
      email,
      password,
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });

    expect(result).toEqual({ ok: true, autoVerified: true });
    expect(db.candidateAccount.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
    }));
    expect(db.candidateEmailVerificationToken.create).not.toHaveBeenCalled();
    expect(sendCandidateEmail).not.toHaveBeenCalled();
    expect(await loginCandidate({ email, password })).toEqual({ ok: true });
    expect(createCandidateSession).toHaveBeenCalledWith('candidate-id');
  });

  it('still requires email verification in production when SMTP is unset', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SMTP_URL', '');
    vi.mocked(db.candidateAccount.findUnique).mockResolvedValueOnce(null as never);
    vi.mocked(db.candidateAccount.create).mockResolvedValue({ id: 'candidate-id' } as never);

    const result = await registerCandidate({
      name: 'Test Candidate',
      email: 'candidate@example.test',
      password: 'correct horse battery staple',
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });

    expect(result).toEqual({ ok: true, autoVerified: false });
    expect(db.candidateEmailVerificationToken.create).toHaveBeenCalledOnce();
    expect(sendCandidateEmail).toHaveBeenCalledOnce();
  });
});
