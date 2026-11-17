import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/candidate-auth/rate-limit', () => ({ allowCandidateAuthAttempt: vi.fn() }));
vi.mock('@/server/candidate-auth/service', () => ({ registerCandidate: vi.fn() }));
vi.mock('@/server/candidate-auth/validation', () => ({ sameOriginRequest: vi.fn() }));

import { allowCandidateAuthAttempt } from '@/server/candidate-auth/rate-limit';
import { registerCandidate } from '@/server/candidate-auth/service';
import { sameOriginRequest } from '@/server/candidate-auth/validation';
import { POST } from './route';

function signupRequest() {
  return new Request('http://localhost:3000/api/candidate-auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'candidate@example.test' }),
  });
}

beforeEach(() => {
  vi.mocked(sameOriginRequest).mockResolvedValue(true);
  vi.mocked(registerCandidate).mockResolvedValue({ ok: true, autoVerified: true });
  vi.mocked(allowCandidateAuthAttempt).mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('candidate signup rate limiting', () => {
  it('does not rate-limit signup outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const response = await POST(signupRequest());

    expect(response.status).toBe(200);
    expect(allowCandidateAuthAttempt).not.toHaveBeenCalled();
    expect(registerCandidate).toHaveBeenCalledOnce();
  });

  it('keeps rate limiting enabled in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(allowCandidateAuthAttempt).mockResolvedValue(false);

    const response = await POST(signupRequest());

    expect(response.status).toBe(429);
    expect(registerCandidate).not.toHaveBeenCalled();
  });
});
