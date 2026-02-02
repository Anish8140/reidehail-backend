"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToken = createToken;
exports.getUserIdFromToken = getUserIdFromToken;
exports.authMiddleware = authMiddleware;
exports.requirePassenger = requirePassenger;
exports.requireDriver = requireDriver;
const User_1 = require("../models/User");
const tokenToUserId = new Map();
function createToken(userId) {
    const token = `tk_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    tokenToUserId.set(token, userId);
    return token;
}
function getUserIdFromToken(token) {
    if (!token || !token.startsWith('tk_'))
        return null;
    return tokenToUserId.get(token) ?? null;
}
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const userId = getUserIdFromToken(token);
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User_1.UserModel.findById(userId).select('email role').lean();
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    req.userId = userId;
    req.user = {
        id: userId,
        email: user.email ?? '',
        role: user.role ?? 'passenger',
    };
    next();
}
/** Require authenticated user to be a passenger (rider). Use after authMiddleware. */
function requirePassenger(req, res, next) {
    if (req.user?.role !== 'passenger') {
        return res.status(403).json({ message: 'Access denied. Passenger only.' });
    }
    next();
}
/** Require authenticated user to be a driver. Use after authMiddleware. */
function requireDriver(req, res, next) {
    if (req.user?.role !== 'driver') {
        return res.status(403).json({ message: 'Access denied. Driver only.' });
    }
    next();
}
