import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'ridehailing-secret-change-in-production';

export interface AuthReq extends Request {
  userId?: string;
  user?: { id: string; email: string; role: string };
}

export interface JwtPayload {
  userId: string;
  role: string;
}

export function createToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role } as JwtPayload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function getUserIdFromToken(token: string | undefined): { userId: string; role: string } | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return { userId: decoded.userId, role: decoded.role };
  } catch {
    return null;
  }
}

export async function authMiddleware(req: AuthReq, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const payload = getUserIdFromToken(token);
  if (!payload) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const user = await UserModel.findById(payload.userId).select('email role').lean();
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.userId = payload.userId;
  req.user = {
    id: payload.userId,
    email: user.email ?? '',
    role: (user.role as string) ?? 'passenger',
  };
  next();
}

export function requirePassenger(req: AuthReq, res: Response, next: NextFunction) {
  if (req.user?.role !== 'passenger') {
    return res.status(403).json({ message: 'Access denied. Passenger only.' });
  }
  next();
}

export function requireDriver(req: AuthReq, res: Response, next: NextFunction) {
  if (req.user?.role !== 'driver') {
    return res.status(403).json({ message: 'Access denied. Driver only.' });
  }
  next();
}

export function requireAdmin(req: AuthReq, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
}
