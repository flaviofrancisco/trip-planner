import { User } from '../models/User';

export async function decorateTripForUser(trip: any, userId: string) {
  const json = trip.toJSON() as any;
  if (trip.ownerId.toString() === userId) {
    json.permission = 'owner';
  } else {
    const share = trip.sharedWith.find(
      (s: any) => s.userId.toString() === userId
    );
    json.permission = share?.permission || 'viewer';
  }
  if (Array.isArray(json.sharedWith) && json.sharedWith.length) {
    const users = await User.find({
      _id: { $in: json.sharedWith.map((s: any) => s.userId) },
    });
    const map = new Map(users.map((u: any) => [u.id, u]));
    json.sharedWith = json.sharedWith.map((s: any) => ({
      userId: s.userId,
      permission: s.permission,
      email: map.get(s.userId)?.email,
      name: map.get(s.userId)?.name,
    }));
  }
  return json;
}
