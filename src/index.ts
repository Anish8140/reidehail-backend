import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { authRouter } from './routes/auth';
import { rideRouter } from './routes/ride';
import { historyRouter } from './routes/history';
import { driverRouter } from './routes/driver';
import { initRealtime } from './realtime';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ridehailing';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/auth', authRouter);
app.use('/ride', rideRouter);
app.use('/history', historyRouter);
app.use('/driver', driverRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);
initRealtime(httpServer);

mongoose.connect(MONGODB_URI).then(() => {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Accepting connections on all interfaces (use your machine IP for devices)`);
    console.log(`WebSocket (Socket.io) enabled for real-time updates`);
  });
}).catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
