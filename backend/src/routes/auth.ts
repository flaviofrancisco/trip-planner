import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(userId: string) {
  const secret = process.env.JWT_SECRET || 'change-me-in-prod';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ sub: userId }, secret, { expiresIn } as jwt.SignOptions);
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

export default router;
