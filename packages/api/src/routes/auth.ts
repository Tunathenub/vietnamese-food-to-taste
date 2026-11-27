import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { analyzeNationalityTaste } from '../services/ai-service.js';
import { AppError } from '../middleware/error-handler.js';

const router: Router = Router();
const envJwtSecret = process.env.JWT_SECRET?.trim();
if (process.env.NODE_ENV === 'production' && !envJwtSecret) {
  throw new Error('JWT_SECRET must be configured in production.');
}
export const JWT_SECRET = envJwtSecret || 'vft-dev-jwt-secret-change-in-production';
export const SESSION_COOKIE_NAME = 'vft_session';
export const SESSION_MAX_AGE = 20 * 60 * 1000; // 20 minutes in ms

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_MAX_AGE,
};

// ── In-Memory Resilient Store for Offline Dev & Demo Accounts ──
interface StoredUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  nationality: string;
  tastePreferences: string | null;
  dietaryRestrictions: string | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
}

const memoryUsers: Map<string, StoredUser> = new Map();

// Initialize Demo Users
const demoUsersReady: Promise<void> = (async function initDemoUsers() {
  const hash = await bcrypt.hash('password123', 10);
  const demoAccounts: StoredUser[] = [
    {
      id: 'usr-demo-customer',
      name: 'Nguyễn Văn Demo',
      email: 'demo@vietnamesefood.com',
      phone: '+84912345678',
      passwordHash: hash,
      role: 'CUSTOMER',
      nationality: 'Vietnam',
      tastePreferences: JSON.stringify({
        spice_level: 3,
        sweetness: 2,
        sourness: 2,
        fish_sauce_intensity: 3,
        herb_intensity: 4,
        oil_richness: 2,
      }),
      dietaryRestrictions: JSON.stringify([]),
    },
    {
      id: 'usr-demo-staff',
      name: 'Trần Bếp Trưởng',
      email: 'staff@vietnamesefood.com',
      phone: '+84988776655',
      passwordHash: hash,
      role: 'STAFF',
      nationality: 'Vietnam',
      tastePreferences: JSON.stringify({
        spice_level: 2,
        sweetness: 2,
        sourness: 2,
        fish_sauce_intensity: 3,
        herb_intensity: 3,
        oil_richness: 2,
      }),
      dietaryRestrictions: JSON.stringify([]),
    },
    {
      id: 'usr-demo-tourist',
      name: 'Kim Min-Jun',
      email: 'tourist@example.com',
      phone: '+821012345678',
      passwordHash: hash,
      role: 'CUSTOMER',
      nationality: 'South Korea',
      tastePreferences: JSON.stringify({
        spice_level: 4,
        sweetness: 2,
        sourness: 3,
        fish_sauce_intensity: 2,
        herb_intensity: 3,
        oil_richness: 3,
      }),
      dietaryRestrictions: JSON.stringify([]),
    },
    {
      id: 'usr-demo-user',
      name: 'Alex Johnson',
      email: 'user@example.com',
      phone: '+14155552671',
      passwordHash: hash,
      role: 'CUSTOMER',
      nationality: 'United States',
      tastePreferences: JSON.stringify({
        spice_level: 1,
        sweetness: 3,
        sourness: 2,
        fish_sauce_intensity: 1,
        herb_intensity: 2,
        oil_richness: 2,
      }),
      dietaryRestrictions: JSON.stringify([]),
    },
    {
      id: 'usr-quick-customer',
      name: 'Demo Customer',
      email: 'customer@demo.com',
      phone: '+84901112233',
      passwordHash: hash,
      role: 'CUSTOMER',
      nationality: 'Vietnam',
      tastePreferences: JSON.stringify({
        spice_level: 2,
        sweetness: 2,
        sourness: 2,
        fish_sauce_intensity: 3,
        herb_intensity: 4,
        oil_richness: 2,
      }),
      dietaryRestrictions: JSON.stringify([]),
    },
    {
      id: 'usr-quick-staff',
      name: 'Demo Staff',
      email: 'staff@demo.com',
      phone: '+84909998877',
      passwordHash: hash,
      role: 'STAFF',
      nationality: 'Vietnam',
      tastePreferences: JSON.stringify({
        spice_level: 2,
        sweetness: 2,
        sourness: 2,
        fish_sauce_intensity: 3,
        herb_intensity: 3,
        oil_richness: 2,
      }),
      dietaryRestrictions: JSON.stringify([]),
    },
  ];

  for (const acc of demoAccounts) {
    if (!memoryUsers.has(acc.email)) {
      memoryUsers.set(acc.email, acc);
    }
  }
})();

function formatUserResponse(user: StoredUser) {
  let tastePreferences = null;
  if (user.tastePreferences) {
    try {
      tastePreferences = typeof user.tastePreferences === 'string'
        ? JSON.parse(user.tastePreferences)
        : user.tastePreferences;
    } catch {
      tastePreferences = null;
    }
  }

  let dietaryRestrictions = null;
  if (user.dietaryRestrictions) {
    try {
      dietaryRestrictions = typeof user.dietaryRestrictions === 'string'
        ? JSON.parse(user.dietaryRestrictions)
        : user.dietaryRestrictions;
    } catch {
      dietaryRestrictions = null;
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role || 'CUSTOMER',
    nationality: user.nationality,
    tastePreferences,
    dietaryRestrictions,
  };
}

async function findUserByEmail(email: string): Promise<StoredUser | null> {
  await demoUsersReady;
  const normalized = email.toLowerCase().trim();
  try {
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (user) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        passwordHash: user.passwordHash,
        role: (user.role as any) || 'CUSTOMER',
        nationality: user.nationality || '',
        tastePreferences: user.tastePreferences,
        dietaryRestrictions: user.dietaryRestrictions,
        resetPasswordToken: (user as any).resetPasswordToken,
        resetPasswordExpires: (user as any).resetPasswordExpires,
      };
    }
  } catch (err: any) {
    // Database offline or unreachable, fall back gracefully
  }

  return memoryUsers.get(normalized) || null;
}

async function findUserById(id: string): Promise<StoredUser | null> {
  await demoUsersReady;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        passwordHash: user.passwordHash,
        role: (user.role as any) || 'CUSTOMER',
        nationality: user.nationality || '',
        tastePreferences: user.tastePreferences,
        dietaryRestrictions: user.dietaryRestrictions,
        resetPasswordToken: (user as any).resetPasswordToken,
        resetPasswordExpires: (user as any).resetPasswordExpires,
      };
    }
  } catch (err: any) {
    // Database offline, fall back gracefully
  }

  for (const u of memoryUsers.values()) {
    if (u.id === id) return u;
  }
  return null;
}

// ── Validation Schemas ──
const registerSchema = z.object({
  name: z.string({ required_error: 'Vui lòng nhập họ và tên' }).min(2, 'Họ và tên tối thiểu 2 ký tự'),
  email: z.string({ required_error: 'Vui lòng nhập địa chỉ email' }).email('Email không đúng định dạng'),
  password: z.string({ required_error: 'Vui lòng nhập mật khẩu' }).min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  phone: z.string({ required_error: 'Vui lòng nhập số điện thoại' }).min(8, 'Số điện thoại tối thiểu 8 ký tự'),
  nationality: z.string({ required_error: 'Vui lòng chọn quốc gia của bạn' }).min(2, 'Vui lòng chọn hoặc nhập quốc gia của bạn'),
});

const loginSchema = z.object({
  email: z.string({ required_error: 'Vui lòng nhập địa chỉ email' }).email('Email không đúng định dạng'),
  password: z.string({ required_error: 'Vui lòng nhập mật khẩu' }).min(1, 'Vui lòng nhập mật khẩu'),
});

// ── POST /api/auth/register ──
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, phone, nationality } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError(400, 'USER_EXISTS', 'Email này đã được đăng ký trong hệ thống.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // AI Analysis for taste preferences
    let tastePreferences: string | null = null;
    let dietaryRestrictions: string | null = null;

    if (nationality) {
      try {
        const aiResult = await analyzeNationalityTaste(nationality);
        tastePreferences = JSON.stringify(aiResult.tastePreferences);
        dietaryRestrictions = JSON.stringify(aiResult.dietaryRestrictions);
      } catch {
        // Fallback default
        tastePreferences = JSON.stringify({
          spice_level: 2,
          sweetness: 2,
          sourness: 2,
          fish_sauce_intensity: 3,
          herb_intensity: 3,
          oil_richness: 2,
        });
        dietaryRestrictions = JSON.stringify([]);
      }
    }

    // Always assign CUSTOMER role on self-registration (staff/admin accounts are provisioned separately)
    const role: 'CUSTOMER' = 'CUSTOMER';

    let user: StoredUser;
    try {
      const dbUser = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          phone,
          passwordHash,
          nationality,
          tastePreferences,
          dietaryRestrictions,
          role,
        },
      });

      user = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone || '',
        passwordHash: dbUser.passwordHash,
        role: (dbUser.role as any) || role,
        nationality: dbUser.nationality || '',
        tastePreferences: dbUser.tastePreferences,
        dietaryRestrictions: dbUser.dietaryRestrictions,
      };
    } catch {
      // In-memory fallback
      user = {
        id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        email: normalizedEmail,
        phone,
        passwordHash,
        role,
        nationality,
        tastePreferences,
        dietaryRestrictions,
      };
    }

    memoryUsers.set(normalizedEmail, user);

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie(SESSION_COOKIE_NAME, token, cookieOptions);

    res.status(201).json({
      data: {
        token,
        user: formatUserResponse(user),
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/auth/login ──
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.');
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie(SESSION_COOKIE_NAME, token, cookieOptions);

    res.json({
      data: {
        token,
        user: formatUserResponse(user),
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/auth/me ──
router.get('/me', async (req, res, next) => {
  try {
    let userPayload = (req as any).user;

    // Check Authorization Bearer header if not populated via cookies
    if (!userPayload?.id) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          userPayload = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
        } catch {
          // invalid token
        }
      }
    }

    if (!userPayload?.id) {
      throw new AppError(401, 'UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập.');
    }

    const user = await findUserById(userPayload.id);
    if (!user) {
      throw new AppError(401, 'USER_NOT_FOUND', 'Không tìm thấy thông tin tài khoản người dùng.');
    }

    res.json({
      data: {
        user: formatUserResponse(user),
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/auth/forgot-password ──
const forgotPasswordSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      res.json({
        data: {
          message: 'Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được tạo.',
        },
        error: null,
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires,
        },
      });
    } catch {
      // ignore db error
    }

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    memoryUsers.set(normalizedEmail, user);

    const clientOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
    const resetUrl = `${clientOrigin}/reset-password?token=${resetToken}`;

    console.log(`\n======================================================`);
    console.log(`🔑 PASSWORD RESET LINK for ${user.email}:`);
    console.log(`   ${resetUrl}`);
    console.log(`   (Expires in 15 minutes)`);
    console.log(`======================================================\n`);

    res.json({
      data: {
        message: 'Liên kết đặt lại mật khẩu đã được tạo thành công.',
        resetUrl,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/auth/reset-password ──
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Mã token không hợp lệ'),
  newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
});

router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    let targetUser: StoredUser | null = null;
    const now = new Date();

    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { gt: now },
        },
      });
      if (dbUser) {
        targetUser = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone || '',
          passwordHash: dbUser.passwordHash,
          role: (dbUser.role as any) || 'CUSTOMER',
          nationality: dbUser.nationality || '',
          tastePreferences: dbUser.tastePreferences,
          dietaryRestrictions: dbUser.dietaryRestrictions,
        };
      }
    } catch {
      // db offline
    }

    if (!targetUser) {
      for (const u of memoryUsers.values()) {
        if (u.resetPasswordToken === token && u.resetPasswordExpires && u.resetPasswordExpires > now) {
          targetUser = u;
          break;
        }
      }
    }

    if (!targetUser) {
      throw new AppError(400, 'INVALID_TOKEN', 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    try {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          passwordHash,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });
    } catch {
      // db offline
    }

    targetUser.passwordHash = passwordHash;
    targetUser.resetPasswordToken = null;
    targetUser.resetPasswordExpires = null;
    memoryUsers.set(targetUser.email, targetUser);

    const jwtToken = jwt.sign({ id: targetUser.id, role: targetUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie(SESSION_COOKIE_NAME, jwtToken, cookieOptions);

    res.json({
      data: {
        message: 'Đặt lại mật khẩu thành công.',
        user: formatUserResponse(targetUser),
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/auth/logout ──
router.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({
    data: { message: 'Đăng xuất thành công' },
    error: null,
  });
});

// ── POST /api/auth/onboard ──
const onboardSchema = z.object({
  nationality: z.string().min(2, 'Vui lòng nhập quốc tịch hợp lệ'),
});

router.post('/onboard', validate(onboardSchema), async (req, res, next) => {
  try {
    let userPayload = (req as any).user;
    let userId = userPayload?.id || req.body.userId;

    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
          userId = decoded.id;
        } catch {
          // invalid token
        }
      }
    }

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Bạn cần đăng nhập để thiết lập khẩu vị.');
    }

    const { nationality } = req.body;
    const aiResult = await analyzeNationalityTaste(nationality);
    const tastePrefStr = JSON.stringify(aiResult.tastePreferences);
    const dietaryStr = JSON.stringify(aiResult.dietaryRestrictions);

    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          nationality,
          tastePreferences: tastePrefStr,
          dietaryRestrictions: dietaryStr,
        },
      });
    } catch {
      // db offline
    }

    for (const u of memoryUsers.values()) {
      if (u.id === userId) {
        u.nationality = nationality;
        u.tastePreferences = tastePrefStr;
        u.dietaryRestrictions = dietaryStr;
        break;
      }
    }

    res.json({
      data: {
        tastePreferences: aiResult.tastePreferences,
        dietaryRestrictions: aiResult.dietaryRestrictions,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
