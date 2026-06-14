import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { User } from '../models/User';
import { sendCredentialResetEmail, sendLoginCodeEmail } from '../services/email';

const router = Router();

const GENERIC_RESET_MESSAGE =
  'If an account exists for that email, we sent a link to confirm it and set new credentials.';
const GENERIC_CODE_MESSAGE =
  'If an account exists for that email, a sign-in code has been sent.';

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const emailSchema = z.object({
  email: z.string().email(),
});

const setCredentialsSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

const verifyLoginCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

function hashToken(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

function signToken(userId: string) {
  const secret = process.env.JWT_SECRET || 'change-me-in-prod';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ sub: userId }, secret, { expiresIn } as jwt.SignOptions);
}

function generateLoginCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

router.post('/signup', async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash,
      emailVerified: false,
    });
    const token = signToken(user.id);
    res.status(201).json({ token, user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user.id);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

router.post('/request-login-code', async (req, res, next) => {
  try {
    const data = emailSchema.parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });

    if (user) {
      const code = generateLoginCode();
      user.loginOtpHash = hashToken(code);
      user.loginOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      const { devLoginCode } = await sendLoginCodeEmail(user.email, code);
      if (devLoginCode) {
        return res.json({ message: GENERIC_CODE_MESSAGE, devLoginCode });
      }
    }

    res.json({ message: GENERIC_CODE_MESSAGE });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-login-code', async (req, res, next) => {
  try {
    const data = verifyLoginCodeSchema.parse(req.body);
    const user = await User.findOne({
      email: data.email.toLowerCase(),
      loginOtpHash: hashToken(data.code),
      loginOtpExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired sign-in code' });
    }

    user.loginOtpHash = null;
    user.loginOtpExpires = null;
    user.emailVerified = true;
    await user.save();

    const token = signToken(user.id);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const data = emailSchema.parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = hashToken(resetToken);
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const { devResetUrl } = await sendCredentialResetEmail(user.email, resetToken);
      if (devResetUrl) {
        return res.json({ message: GENERIC_RESET_MESSAGE, devResetUrl });
      }
    }

    res.json({ message: GENERIC_RESET_MESSAGE });
  } catch (err) {
    next(err);
  }
});

router.get('/verify-reset-token', async (req, res, next) => {
  try {
    const token = String(req.query.token || '');
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired link' });
    }

    res.json({ valid: true, email: maskEmail(user.email) });
  } catch (err) {
    next(err);
  }
});

router.post('/set-credentials', async (req, res, next) => {
  try {
    const data = setCredentialsSchema.parse(req.body);
    const user = await User.findOne({
      passwordResetTokenHash: hashToken(data.token),
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired link' });
    }

    user.passwordHash = await bcrypt.hash(data.password, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    user.emailVerified = true;
    await user.save();

    res.json({ message: 'Credentials updated. You can sign in with your new password.' });
  } catch (err) {
    next(err);
  }
});

export default router;
