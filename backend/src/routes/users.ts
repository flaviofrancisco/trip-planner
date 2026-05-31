import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';

const router = Router();

router.get('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.toJSON());
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  preferences: z
    .object({ theme: z.enum(['light', 'dark', 'system']).optional() })
    .optional(),
  apiKeys: z
    .object({
      openai: z.string().optional(),
      gemini: z.string().optional(),
    })
    .optional(),
});

router.patch('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (data.name) user.name = data.name;
    if (data.preferences?.theme) {
      user.preferences = user.preferences || ({} as any);
      (user.preferences as any).theme = data.preferences.theme;
    }
    if (data.apiKeys) {
      user.apiKeys = user.apiKeys || ({} as any);
      if (typeof data.apiKeys.openai === 'string')
        (user.apiKeys as any).openai = data.apiKeys.openai;
      if (typeof data.apiKeys.gemini === 'string')
        (user.apiKeys as any).gemini = data.apiKeys.gemini;
    }
    await user.save();
    res.json(user.toJSON());
  } catch (err) {
    next(err);
  }
});

router.get('/lookup', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const q = String(req.query.email || '').toLowerCase().trim();
    if (!q) return res.json(null);
    const user = await User.findOne({ email: q });
    if (!user) return res.json(null);
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    next(err);
  }
});

export default router;
