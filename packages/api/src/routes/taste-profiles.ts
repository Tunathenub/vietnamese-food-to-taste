import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import type { ApiResponse, TasteProfileDetail } from '@vft/shared';
import { queryWithFallback } from './dishes.js';

export const tasteProfileRoutes: Router = Router();

const FALLBACK_TASTE_PROFILES: TasteProfileDetail[] = [
  {
    id: 'tp-authentic-vn',
    code: 'AUTHENTIC_VN',
    name: 'Vị chuẩn Việt Nam',
    type: 'COUNTRY' as any,
    countryCode: 'VN',
    dialCode: '+84',
    description: 'Hương vị truyền thống cân bằng, đậm đà nước mắm và rau thơm tươi.',
    attributes: {
      spice_level: 2,
      sweetness: 2,
      sourness: 2,
      fish_sauce_intensity: 3,
      herb_intensity: 4,
      oil_richness: 2,
    },
  },
  {
    id: 'tp-kr-inspired',
    code: 'KR_INSPIRED',
    name: 'Khẩu vị Hàn Quốc (Korean-inspired)',
    type: 'COUNTRY' as any,
    countryCode: 'KR',
    dialCode: '+82',
    description: 'Tăng vị cay đậm đà, vị đậm đà vừa phải, giảm bớt mùi mắm nồng.',
    attributes: {
      spice_level: 4,
      sweetness: 2,
      sourness: 3,
      fish_sauce_intensity: 2,
      herb_intensity: 3,
      oil_richness: 3,
    },
  },
  {
    id: 'tp-western-mild',
    code: 'WESTERN_MILD',
    name: 'Khẩu vị phương Tây dịu nhẹ (Western Mild)',
    type: 'COUNTRY' as any,
    countryCode: 'US',
    dialCode: '+1',
    description: 'Ít cay, dịu mùi nước mắm, rau thơm chọn lọc, vị thanh nhẹ.',
    attributes: {
      spice_level: 1,
      sweetness: 3,
      sourness: 2,
      fish_sauce_intensity: 1,
      herb_intensity: 2,
      oil_richness: 2,
    },
  },
  {
    id: 'tp-jp-delicate',
    code: 'JP_DELICATE',
    name: 'Khẩu vị Nhật Bản thanh tao (Japanese Delicate)',
    type: 'COUNTRY' as any,
    countryCode: 'JP',
    dialCode: '+81',
    description: 'Tối thiểu cay, hạn chế dầu mỡ, vị thanh nhẹ, nổi bật vị tự nhiên.',
    attributes: {
      spice_level: 0,
      sweetness: 2,
      sourness: 1,
      fish_sauce_intensity: 1,
      herb_intensity: 2,
      oil_richness: 1,
    },
  },
];

// GET /api/taste-profiles
tasteProfileRoutes.get('/', async (_req, res, next) => {
  try {
    const body: ApiResponse<{ items: TasteProfileDetail[] }> = await queryWithFallback(
      async () => {
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

        if (profiles.length === 0) {
          return {
            data: { items: FALLBACK_TASTE_PROFILES },
            error: null,
          };
        }

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
            dialCode: p.dialCode,
            description: p.description,
            attributes,
          };
        });

        return {
          data: { items },
          error: null,
        };
      },
      () => ({
        data: { items: FALLBACK_TASTE_PROFILES },
        error: null,
      })
    );

    res.json(body);
  } catch (err) {
    next(err);
  }
});

// GET /api/taste-profiles/:code
tasteProfileRoutes.get('/:code', async (req, res, next) => {
  const { code } = req.params;
  try {
    const response = await queryWithFallback(
      async () => {
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
          const fallback = FALLBACK_TASTE_PROFILES.find((p) => p.code === code);
          if (fallback) {
            return { status: 200, body: { data: fallback, error: null } };
          }
          return {
            status: 404,
            body: {
              data: null,
              error: { code: 'TASTE_PROFILE_NOT_FOUND', message: 'Taste profile not found.' },
            },
          };
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
          dialCode: profile.dialCode,
          description: profile.description,
          attributes,
        };

        return {
          status: 200,
          body: { data: item, error: null },
        };
      },
      () => {
        const fallback = FALLBACK_TASTE_PROFILES.find((p) => p.code === code);
        if (fallback) {
          return { status: 200, body: { data: fallback, error: null } };
        }
        return {
          status: 404,
          body: {
            data: null,
            error: { code: 'TASTE_PROFILE_NOT_FOUND', message: 'Taste profile not found.' },
          },
        };
      }
    );

    res.status(response.status).json(response.body);
  } catch (err) {
    next(err);
  }
});
