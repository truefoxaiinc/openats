import nodemailer from 'nodemailer';

/** Candidate authentication mail is intentionally outside the org-scoped ATS EmailMessage system. */
export async function sendCandidateEmail(to: string, subject: string, text: string): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    // Never print authentication links or tokens to logs.
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[candidate-auth email] SMTP_URL is not configured; skipped delivery to ${to} (${subject}).`);
      return;
    }
    throw new Error('Candidate email delivery is not configured');
  }
  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? 'OpenATS <no-reply@openats.local>',
    to,
    subject,
    text,
  });
}
