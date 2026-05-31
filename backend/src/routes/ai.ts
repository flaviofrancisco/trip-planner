import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Trip } from '../models/Trip';
import { runChat, translateText, AIProvider } from '../services/ai';
import { nearestNeighborOrder } from '../services/optimizer';
import { decorateTripForUser } from '../services/tripResponse';

const router = Router();
router.use(requireAuth);

async function loadEditableTrip(tripId: string, userId: string) {
  if (!Types.ObjectId.isValid(tripId)) return null;
  const trip = await Trip.findById(tripId);
  if (!trip) return null;
  const isOwner = trip.ownerId.toString() === userId;
  const isEditor = trip.sharedWith.some(
    (s: any) => s.userId.toString() === userId && s.permission === 'editor'
  );
  if (!isOwner && !isEditor) return null;
  return trip;
}

async function getApiKey(userId: string, provider: AIProvider) {
  const user = await User.findById(userId);
  if (!user) return null;
  const key = (user.apiKeys as any)?.[provider];
  return key ? String(key) : null;
}

const chatSchema = z.object({
  tripId: z.string(),
  provider: z.enum(['openai', 'gemini']),
  model: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .min(1),
});

router.post('/chat', async (req: AuthRequest, res, next) => {
  try {
    const data = chatSchema.parse(req.body);
    const trip = await loadEditableTrip(data.tripId, req.userId!);
    if (!trip)
      return res.status(403).json({ error: 'No edit access to this trip' });
    const apiKey = await getApiKey(req.userId!, data.provider);
    if (!apiKey)
      return res
        .status(400)
        .json({ error: `No ${data.provider} API key configured. Open Settings to add one.` });
    const result = await runChat(
      data.provider,
      apiKey,
      data.tripId,
      data.messages,
      data.model
    );
    const updatedTrip = await Trip.findById(data.tripId);
    res.json({
      reply: result.reply,
      toolCalls: result.toolCalls,
      trip: updatedTrip
        ? await decorateTripForUser(updatedTrip, req.userId!)
        : null,
    });
  } catch (err) {
    next(err);
  }
});

const translateSchema = z.object({
  provider: z.enum(['openai', 'gemini']),
  model: z.string().optional(),
  text: z.string().min(1),
  sourceLang: z.string().min(2),
  targetLang: z.string().min(2),
});

router.post('/translate', async (req: AuthRequest, res, next) => {
  try {
    const data = translateSchema.parse(req.body);
    const apiKey = await getApiKey(req.userId!, data.provider);
    if (!apiKey)
      return res
        .status(400)
        .json({ error: `No ${data.provider} API key configured.` });
    const translated = await translateText(
      data.provider,
      apiKey,
      data.text,
      data.sourceLang,
      data.targetLang,
      data.model
    );
    res.json({ translated });
  } catch (err) {
    next(err);
  }
});

router.post('/optimize/:tripId', async (req: AuthRequest, res, next) => {
  try {
    const trip: any = await loadEditableTrip(req.params.tripId, req.userId!);
    if (!trip)
      return res.status(403).json({ error: 'No edit access to this trip' });
    if (trip.cities.length < 3)
      return res.json(await decorateTripForUser(trip, req.userId!));
    const order = nearestNeighborOrder(trip.cities as any);
    const byId = new Map(trip.cities.map((c: any) => [c._id.toString(), c]));
    const reordered = order.map((id, idx) => {
      const s: any = byId.get(id);
      s.cityNumber = idx + 1;
      return s;
    });
    trip.cities.splice(0, trip.cities.length, ...(reordered as any));
    await trip.save();
    res.json(await decorateTripForUser(trip, req.userId!));
  } catch (err) {
    next(err);
  }
});

export default router;
