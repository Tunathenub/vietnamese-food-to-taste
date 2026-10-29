import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error-handler.js';
import { tasteProfileRoutes } from './routes/taste-profiles.js';
import { dishRoutes } from './routes/dishes.js';
import { orderRoutes } from './routes/orders.js';
import { staffRoutes } from './routes/staff.js';
import { authRouter } from './routes/auth.js';

const app = express();

// ── Global Middleware ──
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ──
app.use('/api/auth', authRouter);
app.use('/api/taste-profiles', tasteProfileRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/staff', staffRoutes);

// ── Error Handler ──
app.use(errorHandler);

export default app;
