import { Schema, model, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    apiKeys: {
      openai: { type: String, default: '' },
      gemini: { type: String, default: '' },
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
    },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    if (ret.apiKeys) {
      ret.apiKeys = {
        openai: !!ret.apiKeys.openai,
        gemini: !!ret.apiKeys.gemini,
      };
    }
    return ret;
  },
});

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: any };
export const User = model('User', userSchema);
