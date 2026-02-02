import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    name: { type: String, trim: true, default: '' },
    passwordHash: { type: String },
    role: { type: String, enum: ['passenger', 'driver', 'admin'], default: 'passenger' },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });

userSchema.pre('validate', function (next: (err?: Error) => void) {
  if (!this.email && !this.phone) {
    next(new Error('Either email or phone is required'));
  } else {
    next();
  }
});

export const UserModel = mongoose.model('User', userSchema);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}
