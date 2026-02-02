"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const User_1 = require("../models/User");
const Driver_1 = require("../models/Driver");
const auth_1 = require("../middleware/auth");
const otp_1 = require("../services/otp");
exports.authRouter = (0, express_1.Router)();
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { message: 'Too many attempts. Try again later.' },
});
const otpLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 5,
    message: { message: 'Too many OTP requests. Try again in a minute.' },
});
exports.authRouter.use(authLimiter);
function normalizePhone(phone) {
    return phone.replace(/\D/g, '').slice(-10);
}
function toUserResponse(user) {
    return {
        id: String(user._id),
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        name: user.name ?? undefined,
        role: user.role ?? 'passenger',
        createdAt: user.createdAt,
    };
}
exports.authRouter.post('/send-otp', otpLimiter, async (req, res) => {
    try {
        const { phone, purpose } = req.body || {};
        const raw = String(phone || '').trim();
        if (!raw || raw.length < 10) {
            return res.status(400).json({ message: 'Valid phone number required' });
        }
        const normalized = normalizePhone(raw);
        (0, otp_1.createOtp)(normalized, purpose === 'login' ? 'login' : 'signup');
        res.json({ success: true, message: 'OTP sent' });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.authRouter.post('/verify-otp', otpLimiter, async (req, res) => {
    try {
        const { phone, code, name } = req.body || {};
        const raw = String(phone || '').trim();
        const codeStr = String(code || '').trim();
        if (!raw || !codeStr) {
            return res.status(400).json({ message: 'Phone and OTP code required' });
        }
        const normalized = normalizePhone(raw);
        if (!(0, otp_1.verifyOtp)(normalized, codeStr)) {
            return res.status(401).json({ message: 'Invalid or expired OTP' });
        }
        let user = await User_1.UserModel.findOne({ phone: normalized }).lean();
        if (!user) {
            user = (await User_1.UserModel.create({
                phone: normalized,
                name: (name && String(name).trim()) || '',
                role: 'passenger',
            })).toObject();
        }
        const token = (0, auth_1.createToken)(String(user._id), user.role ?? 'passenger');
        res.json({
            user: toUserResponse(user),
            token,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.authRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }
        const emailNorm = String(email).trim().toLowerCase();
        const user = await User_1.UserModel.findOne({ email: emailNorm }).lean();
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        if (!user.passwordHash) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const valid = await (0, User_1.verifyPassword)(String(password), user.passwordHash);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = (0, auth_1.createToken)(String(user._id), user.role ?? 'passenger');
        res.json({
            user: toUserResponse(user),
            token,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.authRouter.post('/signup', async (req, res) => {
    try {
        const { email, password, name, role = 'passenger' } = req.body || {};
        console.log('signup', email, password, name, role);
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }
        const emailNorm = String(email).trim().toLowerCase();
        const existing = await User_1.UserModel.findOne({ email: emailNorm });
        if (existing) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }
        const allowedRoles = ['passenger', 'driver', 'admin'];
        const roleNorm = allowedRoles.includes(String(role)) ? role : 'passenger';
        const passwordHash = await (0, User_1.hashPassword)(String(password));
        const user = await User_1.UserModel.create({
            email: emailNorm,
            passwordHash,
            name: name ? String(name).trim() : '',
            role: roleNorm,
        });
        if (user.role === 'driver') {
            await Driver_1.DriverModel.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id, isOnline: false } }, { upsert: true });
        }
        const token = (0, auth_1.createToken)(String(user._id), user.role ?? 'passenger');
        res.status(201).json({
            user: toUserResponse(user),
            token,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.authRouter.post('/logout', (_req, res) => {
    res.json({});
});
exports.authRouter.get('/session', auth_1.authMiddleware, async (req, res) => {
    try {
        const user = await User_1.UserModel.findById(req.userId).select('email phone name role createdAt').lean();
        if (!user)
            return res.status(401).json({ message: 'Unauthorized' });
        res.json({
            user: toUserResponse(user),
            token: req.headers.authorization?.slice(7) || '',
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
