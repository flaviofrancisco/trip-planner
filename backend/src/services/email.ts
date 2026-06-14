import nodemailer from 'nodemailer';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

function isDevWithoutSmtp() {
  return !process.env.SMTP_HOST && process.env.NODE_ENV === 'development';
}

export async function sendCredentialResetEmail(
  to: string,
  token: string
): Promise<{ devResetUrl?: string }> {
  const verifyUrl = `${FRONTEND_URL}/reset-credentials?token=${encodeURIComponent(token)}`;
  const from = process.env.EMAIL_FROM || 'noreply@tripplanner.local';

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[credential-reset] Confirm email & set credentials for ${to}: ${verifyUrl}`);
    if (isDevWithoutSmtp()) return { devResetUrl: verifyUrl };
    return {};
  }

  await transporter.sendMail({
    from,
    to,
    subject: 'Confirm your email to reset Trip Planner credentials',
    text: `You requested to reset your credentials.\n\nOpen this link to confirm your email and choose a new password (expires in 1 hour):\n${verifyUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>You requested to reset your credentials.</p><p><a href="${verifyUrl}">Confirm your email and set a new password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
  });

  return {};
}

export async function sendLoginCodeEmail(
  to: string,
  code: string
): Promise<{ devLoginCode?: string }> {
  const from = process.env.EMAIL_FROM || 'noreply@tripplanner.local';

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[login-code] Sign-in code for ${to}: ${code}`);
    if (isDevWithoutSmtp()) return { devLoginCode: code };
    return {};
  }

  await transporter.sendMail({
    from,
    to,
    subject: 'Your Trip Planner sign-in code',
    text: `Your sign-in code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Your sign-in code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  });

  return {};
}
