"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRealtime = initRealtime;
exports.getIO = getIO;
exports.emitToDrivers = emitToDrivers;
exports.emitToPassenger = emitToPassenger;
exports.emitToUser = emitToUser;
const socket_io_1 = require("socket.io");
const User_1 = require("./models/User");
const auth_1 = require("./middleware/auth");
let io = null;
function initRealtime(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: { origin: true, credentials: true },
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        const userId = (0, auth_1.getUserIdFromToken)(token);
        if (!userId) {
            return next(new Error('Unauthorized'));
        }
        const user = await User_1.UserModel.findById(userId).select('role').lean();
        if (!user)
            return next(new Error('Unauthorized'));
        socket.userId = userId;
        socket.role = user.role;
        next();
    });
    io.on('connection', (socket) => {
        const userId = socket.userId;
        const role = socket.role;
        socket.join(`user:${userId}`);
        if (role === 'driver') {
            socket.join('drivers');
        }
        socket.on('disconnect', () => { });
    });
    return io;
}
function getIO() {
    return io;
}
function emitToDrivers(event, payload) {
    io?.to('drivers').emit(event, payload);
}
function emitToPassenger(passengerId, event, payload) {
    io?.to(`user:${passengerId}`).emit(event, payload);
}
function emitToUser(userId, event, payload) {
    io?.to(`user:${userId}`).emit(event, payload);
}
