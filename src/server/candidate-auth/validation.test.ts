import { describe, expect, it } from 'vitest';
import { normalizeCandidateEmail, sameOriginRequest, validCandidateEmail, validCandidatePassword } from './validation';

describe('candidate authentication validation', () => {
  it('normalizes candidate email addresses', () => {
    expect(normalizeCandidateEmail('  Candidate@Example.com ')).toBe('candidate@example.com');
  });

  it('validates bounded email addresses', () => {
    expect(validCandidateEmail('candidate@example.com')).toBe(true);
    expect(validCandidateEmail('not-an-email')).toBe(false);
    expect(validCandidateEmail(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });

  it('requires a 12 to 128 character password', () => {
    expect(validCandidatePassword('correct horse battery')).toBe(true);
    expect(validCandidatePassword('short')).toBe(false);
    expect(validCandidatePassword('a'.repeat(129))).toBe(false);
  });

  it('rejects missing and cross-origin mutation requests', async () => {
    expect(await sameOriginRequest(new Request('http://localhost:3000/api/candidate-auth/login', { method: 'POST' }))).toBe(false);
    expect(await sameOriginRequest(new Request('http://localhost:3000/api/candidate-auth/login', {
      method: 'POST',
      headers: { origin: 'https://attacker.example', host: 'localhost:3000' },
    }))).toBe(false);
  });

  it('accepts a same-origin mutation request', async () => {
    expect(await sameOriginRequest(new Request('http://localhost:3000/api/candidate-auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
    }))).toBe(true);
  });
});
