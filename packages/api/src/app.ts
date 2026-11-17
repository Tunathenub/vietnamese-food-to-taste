import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { errorHandler } from './middleware/error-handler.js';
import { tasteProfileRoutes } from './routes/taste-profiles.js';
import { dishRoutes } from './routes/dishes.js';
import { orderRoutes } from './routes/orders.js';
import { staffRoutes } from './routes/staff.js';
import { authRouter, JWT_SECRET, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from './routes/auth.js';

const app: Express = express();

// ── Global BigInt Serialization for Prisma ──
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

// ── Global Middleware ──
app.use(helmet());
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

// ── Sliding Session Middleware (20-minute persistent cookie or Bearer header) ──
app.use((req, res, next) => {
  let token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
      (req as any).user = decoded;
      // Slide the 20-minute window on every active request if cookie was set
      if (req.cookies?.[SESSION_COOKIE_NAME]) {
        res.cookie(SESSION_COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: SESSION_MAX_AGE,
        });
      }
    } catch {
      if (req.cookies?.[SESSION_COOKIE_NAME]) {
        res.clearCookie(SESSION_COOKIE_NAME, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      }
    }
  }
  next();
});

// ── Root Welcome Dashboard ──
app.get('/', (_req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vietnamese Food to Taste - API Server</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 1.25rem; padding: 2.5rem; max-width: 580px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .badge { display: inline-flex; align-items: center; gap: 0.5rem; background: #064e3b; color: #34d399; font-size: 0.8125rem; font-weight: 700; padding: 0.35rem 0.85rem; border-radius: 9999px; margin-bottom: 1.25rem; border: 1px solid #059669; }
        .dot { width: 8px; height: 8px; background: #34d399; border-radius: 50%; display: inline-block; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        h1 { color: #f97316; font-size: 1.75rem; font-weight: 800; margin-bottom: 0.75rem; letter-spacing: -0.025em; }
        p { color: #94a3b8; font-size: 0.9375rem; line-height: 1.6; margin-bottom: 1.5rem; }
        .links-box { background: #0f172a; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.25rem; }
        .links-box h2 { font-size: 0.875rem; font-weight: 700; color: #e2e8f0; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
        ul { list-style: none; display: flex; flex-direction: column; gap: 0.625rem; }
        li a { color: #38bdf8; text-decoration: none; font-size: 0.875rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; transition: color 0.15s; }
        li a:hover { color: #7dd3fc; text-decoration: underline; }
        .frontend-btn { display: block; text-align: center; background: #ea580c; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 0.9375rem; padding: 0.875rem 1.25rem; border-radius: 0.75rem; margin-top: 1.5rem; transition: background 0.15s; box-shadow: 0 4px 14px 0 rgba(234, 88, 12, 0.39); }
        .frontend-btn:hover { background: #c2410c; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge"><span class="dot"></span> Backend API Đang Hoạt Động</div>
        <h1>🍜 Vietnamese Food to Taste API</h1>
        <p>Máy chủ Express REST API đã sẵn sàng và đang phục vụ dữ liệu tại cổng <code>3000</code>.</p>
        <div class="links-box">
          <h2>Các Endpoint kiểm tra:</h2>
          <ul>
            <li><a href="/api/health" target="_blank">🩺 /api/health (Kiểm tra trạng thái)</a></li>
            <li><a href="/api/dishes" target="_blank">📋 /api/dishes (Danh sách món ăn)</a></li>
            <li><a href="/api/taste-profiles" target="_blank">🌶️ /api/taste-profiles (Khẩu vị quốc gia)</a></li>
          </ul>
        </div>
        <a href="http://localhost:5173" class="frontend-btn" target="_blank">Mở Giao diện Web (Frontend) →</a>
      </div>
    </body>
    </html>
  `);
});

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
