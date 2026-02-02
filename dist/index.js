"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = require("./routes/auth");
const ride_1 = require("./routes/ride");
const history_1 = require("./routes/history");
const driver_1 = require("./routes/driver");
const realtime_1 = require("./realtime");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ridehailing';
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
app.use('/auth', auth_1.authRouter);
app.use('/ride', ride_1.rideRouter);
app.use('/history', history_1.historyRouter);
app.use('/driver', driver_1.driverRouter);
app.get('/health', (_req, res) => res.json({ ok: true }));
const httpServer = http_1.default.createServer(app);
(0, realtime_1.initRealtime)(httpServer);
mongoose_1.default.connect(MONGODB_URI).then(() => {
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Accepting connections on all interfaces (use your machine IP for devices)`);
        console.log(`WebSocket (Socket.io) enabled for real-time updates`);
    });
}).catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});
