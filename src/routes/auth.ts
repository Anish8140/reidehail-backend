import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { UserModel, hashPassword, verifyPassword } from '../models/User';
import { DriverModel } from '../models/Driver';
import { createToken, authMiddleware, type AuthReq } from '../middleware/auth';
import { createOtp, verifyOtp } from '../services/otp';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many attempts. Try again later.' },
});
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP requests. Try again in a minute.' },
});

authRouter.use(authLimiter);

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

function toUserResponse(user: { _id: unknown; email?: string | null; phone?: string | null; name?: string | null; role?: string | null; createdAt?: Date }) {
  return {
    id: String(user._id),
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    name: user.name ?? undefined,
    role: user.role ?? 'passenger',
    createdAt: user.createdAt,
  };
}

authRouter.post('/send-otp', otpLimiter, async (req, res) => {
  try {
    const { phone, purpose } = req.body || {};
    const raw = String(phone || '').trim();
    if (!raw || raw.length < 10) {
      return res.status(400).json({ message: 'Valid phone number required' });
    }
    const normalized = normalizePhone(raw);
    createOtp(normalized, purpose === 'login' ? 'login' : 'signup');
    res.json({ success: true, message: 'OTP sent' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

authRouter.post('/verify-otp', otpLimiter, async (req, res) => {
  try {
    const { phone, code, name } = req.body || {};
    const raw = String(phone || '').trim();
    const codeStr = String(code || '').trim();
    if (!raw || !codeStr) {
      return res.status(400).json({ message: 'Phone and OTP code required' });
    }
    const normalized = normalizePhone(raw);
    if (!verifyOtp(normalized, codeStr)) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }
    let user = await UserModel.findOne({ phone: normalized }).lean();
    if (!user) {
      user = (await UserModel.create({
        phone: normalized,
        name: (name && String(name).trim()) || '',
        role: 'passenger',
      })).toObject();
    }
    const token = createToken(String(user._id), (user.role as string) ?? 'passenger');
    res.json({
      user: toUserResponse(user),
      token,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const user = await UserModel.findOne({ email: emailNorm }).lean();
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const valid = await verifyPassword(String(password), user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = createToken(String(user._id), (user.role as string) ?? 'passenger');
    res.json({
      user: toUserResponse(user),
      token,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

authRouter.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role= 'passenger' } = req.body || {};
    console.log('signup', email, password, name , role);
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const existing = await UserModel.findOne({ email: emailNorm });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }
    const allowedRoles = ['passenger', 'driver', 'admin'];
    const roleNorm = allowedRoles.includes(String(role)) ? role : 'passenger';
    const passwordHash = await hashPassword(String(password));
    const user = await UserModel.create({
      email: emailNorm,
      passwordHash,
      name: name ? String(name).trim() : '',
      role: roleNorm,
    });
    if (user.role === 'driver') {
      await DriverModel.findOneAndUpdate(
        { userId: user._id },
        { $setOnInsert: { userId: user._id, isOnline: false } },
        { upsert: true }
      );
    }
    const token = createToken(String(user._id), (user.role as string) ?? 'passenger');
    res.status(201).json({
      user: toUserResponse(user),
      token,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

authRouter.post('/logout', (_req, res) => {
  res.json({});
});

authRouter.get('/session', authMiddleware, async (req: AuthReq, res) => {
  try {
    const user = await UserModel.findById(req.userId).select('email phone name role createdAt').lean();
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    res.json({
      user: toUserResponse(user),
      token: req.headers.authorization?.slice(7) || '',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});
