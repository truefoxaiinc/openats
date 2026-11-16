import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { sendCandidateEmail } from './email';
import { createCandidateSession } from './session';
import { createOpaqueToken, hashOpaqueToken, tokenExpiry } from './tokens';
import { normalizeCandidateEmail, validCandidateEmail, validCandidatePassword } from './validation';
import { requestOrigin } from '@/server/request-origin';

async function actionUrl(path: string, token: string): Promise<string> {
  const { origin } = await requestOrigin();
  if (!origin) throw new Error('Unable to determine the public OpenATS origin');
  return `${origin}${path}?token=${encodeURIComponent(token)}`;
}

export async function registerCandidate(input: { name: unknown; email: unknown; password: unknown }) {
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
  const email = normalizeCandidateEmail(input.email);
  if (name.length < 2 || !validCandidateEmail(email) || !validCandidatePassword(input.password)) {
    return { ok: false as const, error: 'Enter a name, valid email and password (at least 12 characters).' };
  }
  const existing = await db.candidateAccount.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: true as const };
  const passwordHash = await bcrypt.hash(input.password, 12);
  let account;
  try {
    account = await db.candidateAccount.create({ data: { name, email, passwordHash } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { ok: true as const };
    throw error;
  }
  const rawToken = createOpaqueToken();
  await db.candidateEmailVerificationToken.create({
    data: {
      candidateAccountId: account.id,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: tokenExpiry('CANDIDATE_EMAIL_VERIFICATION_TTL_MINUTES', 30),
    },
  });
  await sendCandidateEmail(
    email,
    'Verify your OpenATS candidate account',
    `Hi ${name},\n\nVerify your email address to activate your OpenATS candidate account:\n\n${await actionUrl('/candidate/verify-email', rawToken)}\n\nThis link expires in 30 minutes. If you did not create this account, you can ignore this email.`,
  );
  return { ok: true as const };
}

export async function loginCandidate(input: { email: unknown; password: unknown }) {
  const email = normalizeCandidateEmail(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  if (!validCandidateEmail(email) || !password) return { ok: false as const, error: 'Invalid email or password.' };
  const account = await db.candidateAccount.findUnique({ where: { email } });
  if (!account?.passwordHash || !(await bcrypt.compare(password, account.passwordHash))) {
    return { ok: false as const, error: 'Invalid email or password.' };
  }
  if (!account.emailVerifiedAt) return { ok: false as const, error: 'Verify your email address before signing in.' };
  await createCandidateSession(account.id);
  return { ok: true as const };
}

export async function verifyCandidateEmail(rawToken: string) {
  if (!rawToken || rawToken.length > 256) return false;
  const tokenHash = hashOpaqueToken(rawToken);
  return db.$transaction(async (tx) => {
    const record = await tx.candidateEmailVerificationToken.findFirst({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) return false;
    await tx.candidateEmailVerificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    await tx.candidateAccount.update({
      where: { id: record.candidateAccountId },
      data: { emailVerifiedAt: new Date() },
    });
    return true;
  });
}

export async function requestCandidatePasswordReset(rawEmail: unknown) {
  const email = normalizeCandidateEmail(rawEmail);
  if (!validCandidateEmail(email)) return;
  const account = await db.candidateAccount.findUnique({ where: { email } });
  if (!account?.emailVerifiedAt) return;
  const rawToken = createOpaqueToken();
  await db.candidatePasswordResetToken.create({
    data: {
      candidateAccountId: account.id,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: tokenExpiry('CANDIDATE_PASSWORD_RESET_TTL_MINUTES', 30),
    },
  });
  await sendCandidateEmail(
    email,
    'Reset your OpenATS password',
    `Hi ${account.name},\n\nUse this one-time link to reset your OpenATS candidate password:\n\n${await actionUrl('/candidate/reset-password', rawToken)}\n\nThis link expires in 30 minutes. If you did not request a reset, you can ignore this email.`,
  );
}

export async function resetCandidatePassword(rawToken: string, rawPassword: unknown) {
  if (!rawToken || rawToken.length > 256 || !validCandidatePassword(rawPassword)) return false;
  const tokenHash = hashOpaqueToken(rawToken);
  const passwordHash = await bcrypt.hash(rawPassword, 12);
  return db.$transaction(async (tx) => {
    const record = await tx.candidatePasswordResetToken.findFirst({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) return false;
    await tx.candidateAccount.update({
      where: { id: record.candidateAccountId },
      data: { passwordHash },
    });
    await tx.candidatePasswordResetToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    await tx.candidateSession.updateMany({
      where: { candidateAccountId: record.candidateAccountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return true;
  });
}

/** Candidate-initiated claim challenge; no Contact is linked until the emailed token is consumed. */
export async function requestApplicationClaim(candidateAccountId: string) {
  const account = await db.candidateAccount.findUnique({ where: { id: candidateAccountId } });
  if (!account?.emailVerifiedAt) throw new Error('A verified candidate account is required');
  const rawToken = createOpaqueToken();
  await db.candidateApplicationClaimToken.create({
    data: {
      candidateAccountId: account.id,
      email: account.email,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: tokenExpiry('CANDIDATE_APPLICATION_CLAIM_TTL_MINUTES', 30),
    },
  });
  await sendCandidateEmail(
    account.email,
    'Confirm your OpenATS application history',
    `Hi ${account.name},\n\nYou asked to connect applications associated with this verified email address to your OpenATS candidate account. Confirm that request here:\n\n${await actionUrl('/candidate/claim-applications', rawToken)}\n\nThis one-time link expires in 30 minutes. No applications are connected unless you open this link.`,
  );
}

export async function confirmApplicationClaim(rawToken: string, candidateAccountId: string) {
  if (!rawToken || rawToken.length > 256) return 0;
  const tokenHash = hashOpaqueToken(rawToken);
  return db.$transaction(async (tx) => {
    const record = await tx.candidateApplicationClaimToken.findFirst({
      where: { candidateAccountId, tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) return 0;
    const account = await tx.candidateAccount.findFirst({
      where: { id: candidateAccountId, email: record.email, emailVerifiedAt: { not: null } },
      select: { id: true },
    });
    if (!account) return 0;
    const contacts = await tx.contact.findMany({
      where: { emails: { has: record.email }, isAnonymized: false },
      select: { id: true },
    });
    if (contacts.length) {
      await tx.candidateContactLink.createMany({
        data: contacts.map((contact) => ({ candidateAccountId, contactId: contact.id })),
        skipDuplicates: true,
      });
    }
    await tx.candidateApplicationClaimToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    return contacts.length;
  });
}

export async function signInCandidateWithGoogle(input: {
  sub: string; email: string; name: string;
}) {
  const identity = await db.candidateOAuthIdentity.findUnique({
    where: { provider_providerAccountId: { provider: 'google', providerAccountId: input.sub } },
    include: { candidateAccount: true },
  });
  if (identity) {
    if (!identity.candidateAccount.emailVerifiedAt) {
      await db.candidateAccount.update({
        where: { id: identity.candidateAccountId },
        data: { emailVerifiedAt: new Date() },
      });
    }
    await createCandidateSession(identity.candidateAccountId);
    return 'signed-in' as const;
  }

  // Never attach a Google identity to an existing password account by email alone.
  const existing = await db.candidateAccount.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) return 'email-in-use' as const;

  try {
    const account = await db.candidateAccount.create({
      data: {
        email: input.email,
        name: input.name || input.email.split('@')[0],
        emailVerifiedAt: new Date(),
        oauthIdentities: {
          create: { provider: 'google', providerAccountId: input.sub, emailAtProvider: input.email },
        },
      },
    });
    await createCandidateSession(account.id);
    return 'signed-in' as const;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await db.candidateOAuthIdentity.findUnique({
        where: { provider_providerAccountId: { provider: 'google', providerAccountId: input.sub } },
      });
      if (raced) {
        await createCandidateSession(raced.candidateAccountId);
        return 'signed-in' as const;
      }
      return 'email-in-use' as const;
    }
    throw error;
  }
}


/** Verify the bearer claim link from email; the token itself identifies the account. */
export async function confirmApplicationClaimByToken(rawToken: string) {
  if (!rawToken || rawToken.length > 256) return 0;
  const record = await db.candidateApplicationClaimToken.findFirst({
    where: {
      tokenHash: hashOpaqueToken(rawToken),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { candidateAccountId: true },
  });
  if (!record) return 0;
  return confirmApplicationClaim(rawToken, record.candidateAccountId);
}
