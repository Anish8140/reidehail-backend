"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToken = createToken;
exports.getUserIdFromToken = getUserIdFromToken;
exports.authMiddleware = authMiddleware;
exports.requirePassenger = requirePassenger;
exports.requireDriver = requireDriver;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const JWT_SECRET = process.env.JWT_SECRET || 'ridehailing-secret-change-in-production';
function createToken(userId, role) {
    return jsonwebtoken_1.default.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}
function getUserIdFromToken(token) {
    if (!token)
        return null;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return { userId: decoded.userId, role: decoded.role };
    }
    catch {
        return null;
    }
}
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const payload = getUserIdFromToken(token);
    if (!payload) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User_1.UserModel.findById(payload.userId).select('email role').lean();
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    req.userId = payload.userId;
    req.user = {
        id: payload.userId,
        email: user.email ?? '',
        role: user.role ?? 'passenger',
    };
    next();
}
function requirePassenger(req, res, next) {
    if (req.user?.role !== 'passenger') {
        return res.status(403).json({ message: 'Access denied. Passenger only.' });
    }
    next();
}
function requireDriver(req, res, next) {
    if (req.user?.role !== 'driver') {
        return res.status(403).json({ message: 'Access denied. Driver only.' });
    }
    next();
}
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
}
