import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { UserModel } from './models/User';
import { getUserIdFromToken } from './middleware/auth';

let io: Server | null = null;

export function initRealtime(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    const userId = getUserIdFromToken(token);
    if (!userId) {
      return next(new Error('Unauthorized'));
    }
    const user = await UserModel.findById(userId).select('role').lean();
    if (!user) return next(new Error('Unauthorized'));
    (socket as any).userId = userId;
    (socket as any).role = user.role;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const role = (socket as any).role;
    socket.join(`user:${userId}`);
    if (role === 'driver') {
      socket.join('drivers');
    }
    socket.on('disconnect', () => {});
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitToDrivers(event: string, payload: unknown): void {
  io?.to('drivers').emit(event, payload);
}

export function emitToPassenger(passengerId: string, event: string, payload: unknown): void {
  io?.to(`user:${passengerId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}
