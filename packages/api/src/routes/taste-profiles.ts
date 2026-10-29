import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import type { ApiResponse, TasteProfileDetail } from '@vft/shared';

export const tasteProfileRoutes = Router();

// GET /api/taste-profiles
tasteProfileRoutes.get('/', async (_req, res, next) => {
  try {
    const profiles = await prisma.tasteProfile.findMany({
      where: { isActive: true },
      include: {
        defaults: {
          include: {
            attribute: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const items: TasteProfileDetail[] = profiles.map((p) => {
      const attributes: Record<string, number> = {};
      for (const d of p.defaults) {
        attributes[d.attribute.code] = d.defaultValue;
      }

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        type: p.type as any,
        countryCode: p.countryCode,
        description: p.description,
        attributes,
      };
    });

    const body: ApiResponse<{ items: TasteProfileDetail[] }> = {
      data: { items },
      error: null,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// GET /api/taste-profiles/:code
tasteProfileRoutes.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const profile = await prisma.tasteProfile.findUnique({
      where: { code },
      include: {
        defaults: {
          include: {
            attribute: true,
          },
        },
      },
    });

    if (!profile || !profile.isActive) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: 'TASTE_PROFILE_NOT_FOUND', message: 'Taste profile not found.' },
      };
      res.status(404).json(body);
      return;
    }

    const attributes: Record<string, number> = {};
    for (const d of profile.defaults) {
      attributes[d.attribute.code] = d.defaultValue;
    }

    const item: TasteProfileDetail = {
      id: profile.id,
      code: profile.code,
      name: profile.name,
      type: profile.type as any,
      countryCode: profile.countryCode,
      description: profile.description,
      attributes,
    };

    const body: ApiResponse<TasteProfileDetail> = {
      data: item,
      error: null,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
