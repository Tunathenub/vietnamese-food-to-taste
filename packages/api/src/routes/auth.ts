import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { analyzeNationalityTaste } from '../services/ai-service.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-prod';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  nationality: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, nationality } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(400, 'USER_EXISTS', 'Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // If nationality is provided during registration, run AI analysis
    let tastePreferences = null;
    let dietaryRestrictions = null;
    
    if (nationality) {
      const aiResult = await analyzeNationalityTaste(nationality);
      tastePreferences = JSON.stringify(aiResult.tastePreferences);
      dietaryRestrictions = JSON.stringify(aiResult.dietaryRestrictions);
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        nationality,
        tastePreferences,
        dietaryRestrictions,
      },
    });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          nationality: user.nationality,
          tastePreferences: user.tastePreferences ? JSON.parse(user.tastePreferences) : null,
          dietaryRestrictions: user.dietaryRestrictions ? JSON.parse(user.dietaryRestrictions) : null,
        }
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          nationality: user.nationality,
          tastePreferences: user.tastePreferences ? JSON.parse(user.tastePreferences) : null,
          dietaryRestrictions: user.dietaryRestrictions ? JSON.parse(user.dietaryRestrictions) : null,
        }
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
});

// Update nationality after registration (Onboarding Flow)
const onboardSchema = z.object({
  nationality: z.string().min(2),
});

router.post('/onboard', validate(onboardSchema), async (req, res, next) => {
  try {
    // In a real app, extract user id from auth middleware JWT
    // For MVP testing, we can accept userId in body if no auth header is present
    const authHeader = req.headers.authorization;
    let userId = req.body.userId;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      userId = decoded.id;
    }

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const { nationality } = req.body;
    
    // Call Gemini to analyze
    const aiResult = await analyzeNationalityTaste(nationality);
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        nationality,
        tastePreferences: JSON.stringify(aiResult.tastePreferences),
        dietaryRestrictions: JSON.stringify(aiResult.dietaryRestrictions),
      }
    });

    res.json({
      data: {
        tastePreferences: aiResult.tastePreferences,
        dietaryRestrictions: aiResult.dietaryRestrictions,
      },
      error: null
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
