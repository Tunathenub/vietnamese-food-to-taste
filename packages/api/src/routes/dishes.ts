import { Router } from 'express';
import crypto from 'node:crypto';
import net from 'node:net';
import { prisma } from '../lib/prisma.js';
import type { ApiResponse } from '@vft/shared';

export const dishRoutes: Router = Router();

// ── Types for Fallback Dish Definitions ──

interface FallbackTasteOption {
  value: number;
  customerLabel: string;
  customerDescription?: string;
  priceDelta: number;
}

interface FallbackTasteConfig {
  attributeId: string;
  code: string;
  name: string;
  baseValue: number;
  minValue: number;
  maxValue: number;
  isAdjustable: boolean;
  options: FallbackTasteOption[];
}

interface FallbackIngredient {
  dishIngredientId: string;
  ingredientId: string;
  name: string;
  role: string;
  defaultQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  priceDeltaPerStep: number;
  isQuantityAdjustable: boolean;
  isAvailable: boolean;
}

interface FallbackSubstitution {
  id: string;
  originalIngredientId: string;
  originalIngredientName: string;
  substituteIngredientId: string;
  substituteIngredientName: string;
  reason: string;
  priceDelta: number;
  isAvailable: boolean;
}

interface FallbackDish {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription?: string;
  imagePath: string;
  imageUrl?: string;
  category: string;
  basePrice: number;
  currency: string;
  prepTimeMinutes: number;
  preparationTimeMinutes?: number;
  isAvailable: boolean;
  tasteConfigurations: FallbackTasteConfig[];
  ingredients: FallbackIngredient[];
  substitutions: FallbackSubstitution[];
}

// ── Fallback Seed Data (pho-bo, bun-cha, banh-mi) ──

const FALLBACK_DISHES: FallbackDish[] = [
  {
    id: 'pho-bo-id',
    slug: 'pho-bo',
    name: 'Phở Bò Hà Nội',
    shortDescription: 'Bánh phở mềm cùng nước dùng hầm xương bò 12 tiếng thơm thảo mộc quế hồi.',
    description: 'Món ăn quốc hồn quốc túy của Việt Nam. Nước dùng được ninh kỹ từ xương ống bò tươi cùng gừng nướng, thảo quả, hoa hồi và quế chi. Thịt bò tái mềm ngọt tự nhiên, bánh phở tươi tráng mềm mướt.',
    imagePath: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600',
    imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600',
    category: 'NOODLE_SOUP',
    basePrice: 65000,
    currency: 'VND',
    prepTimeMinutes: 15,
    preparationTimeMinutes: 15,
    isAvailable: true,
    tasteConfigurations: [
      {
        attributeId: 'attr-spice',
        code: 'spice_level',
        name: 'Độ cay (Spiciness)',
        baseValue: 1,
        minValue: 0,
        maxValue: 5,
        isAdjustable: true,
        options: [
          { value: 0, customerLabel: 'Không cay', customerDescription: 'Không dùng ớt tươi hoặc sa tế', priceDelta: 0 },
          { value: 1, customerLabel: 'Hơi cay', customerDescription: 'Vài lát ớt tươi mỏng', priceDelta: 0 },
          { value: 3, customerLabel: 'Cay vừa', customerDescription: 'Ớt tươi và một chút tương ớt', priceDelta: 0 },
          { value: 5, customerLabel: 'Cay nhiều', customerDescription: 'Cay nồng với sa tế ớt hiểm', priceDelta: 0 },
        ],
      },
      {
        attributeId: 'attr-fish-sauce',
        code: 'fish_sauce_intensity',
        name: 'Vị nước mắm (Fish Sauce)',
        baseValue: 3,
        minValue: 0,
        maxValue: 5,
        isAdjustable: true,
        options: [
          { value: 0, customerLabel: 'Không mắm', customerDescription: 'Dùng muối biển thanh dịu', priceDelta: 0 },
          { value: 2, customerLabel: 'Mắm nhẹ', customerDescription: 'Nêm mắm vừa phải', priceDelta: 0 },
          { value: 3, customerLabel: 'Chuẩn vị truyền thống', customerDescription: 'Đậm vị nước mắm cốt nhĩ', priceDelta: 0 },
          { value: 5, customerLabel: 'Đậm đà', customerDescription: 'Thêm nước mắm cốt đậm vị', priceDelta: 0 },
        ],
      },
      {
        attributeId: 'attr-herb',
        code: 'herb_intensity',
        name: 'Rau thơm (Herbs)',
        baseValue: 4,
        minValue: 0,
        maxValue: 5,
        isAdjustable: true,
        options: [
          { value: 0, customerLabel: 'Không rau thơm', customerDescription: 'Không hành hoa, ngò gai', priceDelta: 0 },
          { value: 2, customerLabel: 'Ít rau thơm', customerDescription: 'Chỉ rắc chút hành hoa', priceDelta: 0 },
          { value: 4, customerLabel: 'Đầy đủ rau thơm', customerDescription: 'Hành hoa, ngò gai, húng quế chuẩn vị', priceDelta: 0 },
        ],
      },
    ],
    ingredients: [
      {
        dishIngredientId: 'di-pho-beef',
        ingredientId: 'ing-beef',
        name: 'Thịt bò tươi',
        role: 'REQUIRED',
        defaultQuantity: 1,
        minQuantity: 1,
        maxQuantity: 3,
        unit: 'phần',
        priceDeltaPerStep: 25000,
        isQuantityAdjustable: true,
        isAvailable: true,
      },
      {
        dishIngredientId: 'di-pho-chili',
        ingredientId: 'ing-chili',
        name: 'Ớt tươi thái lát',
        role: 'OPTIONAL',
        defaultQuantity: 1,
        minQuantity: 0,
        maxQuantity: 3,
        unit: 'phần',
        priceDeltaPerStep: 0,
        isQuantityAdjustable: true,
        isAvailable: true,
      },
      {
        dishIngredientId: 'di-pho-basil',
        ingredientId: 'ing-basil',
        name: 'Húng quế',
        role: 'REMOVABLE',
        defaultQuantity: 1,
        minQuantity: 0,
        maxQuantity: 2,
        unit: 'đĩa',
        priceDeltaPerStep: 0,
        isQuantityAdjustable: true,
        isAvailable: true,
      },
    ],
    substitutions: [
      {
        id: 'sub-pho-tofu',
        originalIngredientId: 'ing-beef',
        originalIngredientName: 'Thịt bò tươi',
        substituteIngredientId: 'ing-tofu',
        substituteIngredientName: 'Đậu phụ chiên',
        reason: 'Tùy chọn ăn chay',
        priceDelta: -10000,
        isAvailable: true,
      },
    ],
  },
  {
    id: 'bun-cha-id',
    slug: 'bun-cha',
    name: 'Bún Chả Hà Nội',
    shortDescription: 'Thịt heo nướng than hoa thơm lừng ăn kèm bún tươi và nước chấm chua ngọt.',
    description: 'Chả miếng và chả viên nướng xém cạnh than hoa vàng ruộm thơm nức mũi, thả vào bát nước chấm chua ngọt có nộm đu đủ xanh cà rốt giòn rụm.',
    imagePath: 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=600',
    imageUrl: 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=600',
    category: 'NOODLE',
    basePrice: 60000,
    currency: 'VND',
    prepTimeMinutes: 12,
    preparationTimeMinutes: 12,
    isAvailable: true,
    tasteConfigurations: [
      {
        attributeId: 'attr-sweet',
        code: 'sweetness',
        name: 'Độ ngọt nước chấm (Sweetness)',
        baseValue: 3,
        minValue: 1,
        maxValue: 5,
        isAdjustable: true,
        options: [
          { value: 1, customerLabel: 'Ngọt thanh nhẹ', customerDescription: 'Giảm 50% đường trong nước chấm', priceDelta: 0 },
          { value: 3, customerLabel: 'Chuẩn vị Hà Nội', customerDescription: 'Chua ngọt hài hòa truyền thống', priceDelta: 0 },
          { value: 5, customerLabel: 'Ngọt đậm', customerDescription: 'Thiên ngọt kiểu miền Nam', priceDelta: 0 },
        ],
      },
      {
        attributeId: 'attr-sour',
        code: 'sourness',
        name: 'Độ chua (Sourness)',
        baseValue: 3,
        minValue: 1,
        maxValue: 5,
        isAdjustable: true,
        options: [
          { value: 1, customerLabel: 'Chua dịu', customerDescription: 'Ít giấm tỏi', priceDelta: 0 },
          { value: 3, customerLabel: 'Chua thanh vừa miệng', customerDescription: 'Cân bằng giấm tỏi và đu đủ ngâm', priceDelta: 0 },
        ],
      },
    ],
    ingredients: [
      {
        dishIngredientId: 'di-bc-pork',
        ingredientId: 'ing-pork',
        name: 'Thịt nướng chả',
        role: 'REQUIRED',
        defaultQuantity: 1,
        minQuantity: 1,
        maxQuantity: 2,
        unit: 'suất',
        priceDeltaPerStep: 25000,
        isQuantityAdjustable: true,
        isAvailable: true,
      },
      {
        dishIngredientId: 'di-bc-chili',
        ingredientId: 'ing-chili',
        name: 'Ớt tươi thái lát',
        role: 'OPTIONAL',
        defaultQuantity: 1,
        minQuantity: 0,
        maxQuantity: 3,
        unit: 'đĩa',
        priceDeltaPerStep: 0,
        isQuantityAdjustable: true,
        isAvailable: true,
      },
    ],
    substitutions: [
      {
        id: 'sub-bc-tofu',
        originalIngredientId: 'ing-pork',
        originalIngredientName: 'Thịt nướng chả',
        substituteIngredientId: 'ing-tofu',
        substituteIngredientName: 'Chả đậu hũ nướng nấm',
        reason: 'Tùy chọn chay',
        priceDelta: -15000,
        isAvailable: true,
      },
    ],
  },
  {
    id: 'banh-mi-id',
    slug: 'banh-mi',
    name: 'Bánh Mì Kẹp Đặc Biệt',
    shortDescription: 'Vỏ bánh giòn rụm kẹp pate béo ngậy, thịt xá xíu, đồ chua và rau thơm.',
    description: 'Món ăn đường phố biểu tượng của Việt Nam với lớp pate gan thủ công, thịt ba chỉ, dưa chuột và sốt ớt tươi giòn tan.',
    imagePath: 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=600',
    imageUrl: 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=600',
    category: 'SANDWICH',
    basePrice: 35000,
    currency: 'VND',
    prepTimeMinutes: 5,
    preparationTimeMinutes: 5,
    isAvailable: true,
    tasteConfigurations: [
      {
        attributeId: 'attr-spice',
        code: 'spice_level',
        name: 'Độ cay (Spiciness)',
        baseValue: 2,
        minValue: 0,
        maxValue: 5,
        isAdjustable: true,
        options: [
          { value: 0, customerLabel: 'Không cay', customerDescription: 'Không ớt, không sốt cay', priceDelta: 0 },
          { value: 2, customerLabel: 'Cay nhẹ', customerDescription: 'Một đường tương ớt', priceDelta: 0 },
          { value: 4, customerLabel: 'Cay nhiều', customerDescription: 'Ớt tươi thái lát + tương ớt cay', priceDelta: 0 },
        ],
      },
    ],
    ingredients: [
      {
        dishIngredientId: 'di-bm-pork',
        ingredientId: 'ing-pork-belly',
        name: 'Thịt heo quay / ba chỉ',
        role: 'REQUIRED',
        defaultQuantity: 1,
        minQuantity: 1,
        maxQuantity: 2,
        unit: 'phần',
        priceDeltaPerStep: 15000,
        isQuantityAdjustable: true,
        isAvailable: true,
      },
      {
        dishIngredientId: 'di-bm-cilantro',
        ingredientId: 'ing-cilantro',
        name: 'Ngò gai & rau mùi',
        role: 'REMOVABLE',
        defaultQuantity: 1,
        minQuantity: 0,
        maxQuantity: 2,
        unit: 'phần',
        priceDeltaPerStep: 0,
        isQuantityAdjustable: true,
        isAvailable: true,
      },
    ],
    substitutions: [
      {
        id: 'sub-bm-tofu',
        originalIngredientId: 'ing-pork-belly',
        originalIngredientName: 'Thịt heo quay / ba chỉ',
        substituteIngredientId: 'ing-tofu',
        substituteIngredientName: 'Đậu sốt nấm',
        reason: 'Chay thanh đạm',
        priceDelta: -5000,
        isAvailable: true,
      },
    ],
  },
];

// ── Database Reachability & Resilience Helpers ──

let dbHealthyCache: { isHealthy: boolean; timestamp: number } | null = null;
const CACHE_TTL_MS = 5000;

function checkDatabaseReachability(): Promise<boolean> {
  const now = Date.now();
  if (dbHealthyCache && now - dbHealthyCache.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(dbHealthyCache.isHealthy);
  }

  return new Promise((resolve) => {
    let host = '127.0.0.1';
    let port = 5432;
    try {
      if (process.env.DATABASE_URL) {
        const parsed = new URL(process.env.DATABASE_URL);
        host = parsed.hostname === 'localhost' ? '127.0.0.1' : (parsed.hostname || '127.0.0.1');
        port = parsed.port ? parseInt(parsed.port, 10) : 5432;
      }
    } catch {}

    const socket = net.createConnection({ host, port, timeout: 80 });
    let resolved = false;

    const done = (isHealthy: boolean) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        dbHealthyCache = { isHealthy, timestamp: Date.now() };
        resolve(isHealthy);
      }
    };

    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.once('timeout', () => done(false));
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 800): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Database query timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function queryWithFallback<T>(
  dbQueryFn: () => Promise<T>,
  fallbackFn: () => T | Promise<T>
): Promise<T> {
  const isHealthy = await checkDatabaseReachability();
  if (!isHealthy) {
    return fallbackFn();
  }

  try {
    return await withTimeout(dbQueryFn(), 800);
  } catch (err) {
    dbHealthyCache = { isHealthy: false, timestamp: Date.now() };
    return fallbackFn();
  }
}

function findFallbackDish(dishIdOrSlug: string): FallbackDish | undefined {
  const norm = dishIdOrSlug.toLowerCase().trim();
  return FALLBACK_DISHES.find(
    (d) =>
      d.id.toLowerCase() === norm ||
      d.slug.toLowerCase() === norm ||
      norm === `${d.slug}-uuid` ||
      norm === `${d.slug}-id` ||
      norm.startsWith(d.slug) ||
      d.id.toLowerCase().startsWith(norm)
  );
}

function getFallbackDishesResponse(page: number, pageSize: number, search?: string, category?: string) {
  let filtered = FALLBACK_DISHES;

  if (category && category !== 'ALL') {
    filtered = filtered.filter((d) => d.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(s) ||
        d.description.toLowerCase().includes(s) ||
        (d.shortDescription && d.shortDescription.toLowerCase().includes(s))
    );
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const items = pageItems.map((d) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
    description: d.description,
    shortDescription: d.shortDescription ?? d.description,
    imagePath: d.imagePath,
    imageUrl: d.imageUrl ?? d.imagePath,
    category: d.category,
    basePrice: d.basePrice,
    currency: d.currency,
    prepTimeMinutes: d.prepTimeMinutes,
    preparationTimeMinutes: d.preparationTimeMinutes ?? d.prepTimeMinutes,
    isAvailable: d.isAvailable,
  }));

  return {
    items,
    page,
    pageSize,
    total,
  };
}

const PRESET_PROFILE_DEFAULTS: Record<string, Record<string, number>> = {
  AUTHENTIC_VN: { spice_level: 2, sweetness: 2, sourness: 2, fish_sauce_intensity: 3, herb_intensity: 4, oil_richness: 2 },
  KR_INSPIRED: { spice_level: 4, sweetness: 2, sourness: 3, fish_sauce_intensity: 2, herb_intensity: 3, oil_richness: 3 },
  WESTERN_MILD: { spice_level: 1, sweetness: 3, sourness: 2, fish_sauce_intensity: 1, herb_intensity: 2, oil_richness: 2 },
  JP_DELICATE: { spice_level: 0, sweetness: 2, sourness: 1, fish_sauce_intensity: 1, herb_intensity: 2, oil_richness: 1 },
};

function generateFallbackRecommendation(
  dish: FallbackDish,
  tasteProfileCode?: string,
  personalPreferences: Record<string, number> = {}
) {
  const profileDefaults = tasteProfileCode ? (PRESET_PROFILE_DEFAULTS[tasteProfileCode] ?? {}) : {};

  const attributes = dish.tasteConfigurations.map((tc) => {
    const code = tc.code;
    let sourceValue: number;
    let recommendationSource: string;

    if (personalPreferences[code] !== undefined) {
      sourceValue = personalPreferences[code];
      recommendationSource = 'PERSONAL';
    } else if (profileDefaults[code] !== undefined) {
      sourceValue = profileDefaults[code];
      recommendationSource = 'TASTE_PROFILE';
    } else {
      sourceValue = tc.baseValue;
      recommendationSource = 'DISH_DEFAULT';
    }

    const appliedValue = Math.max(tc.minValue, Math.min(tc.maxValue, sourceValue));
    const wasClamped = appliedValue !== sourceValue;

    const opt =
      tc.options.find((o) => o.value === appliedValue) ??
      tc.options.reduce(
        (prev, curr) =>
          Math.abs(curr.value - appliedValue) < Math.abs(prev.value - appliedValue) ? curr : prev,
        tc.options[0]
      );

    return {
      code,
      name: tc.name,
      recommendationSource,
      sourceValue,
      baseValue: tc.baseValue,
      minValue: tc.minValue,
      maxValue: tc.maxValue,
      appliedValue,
      wasClamped,
      customerLabel: opt?.customerLabel ?? `Mức ${appliedValue}`,
    };
  });

  return {
    status: 200,
    body: {
      data: {
        dishId: dish.id,
        attributes,
      },
      error: null,
    },
  };
}

function validateFallbackCustomization(
  dish: FallbackDish,
  tasteValues: Record<string, any> = {},
  ingredientQuantities: Record<string, any> = {},
  substitutionIds: string[] = []
) {
  let customizationPrice = 0;
  const warnings: Array<{ code: string; message: string }> = [];

  for (const [code, val] of Object.entries(tasteValues)) {
    const numVal = Number(val);
    const config = dish.tasteConfigurations.find((c) => c.code === code);
    if (!config) {
      return {
        status: 422,
        body: {
          data: null,
          error: { code: 'INVALID_TASTE_ATTRIBUTE', message: `Taste attribute ${code} is not valid for this dish.` },
        },
      };
    }
    if (numVal < config.minValue || numVal > config.maxValue) {
      return {
        status: 422,
        body: {
          data: null,
          error: { code: 'INVALID_TASTE_VALUE', message: `${config.name} must be between ${config.minValue} and ${config.maxValue}.` },
        },
      };
    }

    const matchingOption = config.options.find((o) => o.value === numVal);
    if (matchingOption) {
      customizationPrice += Number(matchingOption.priceDelta);
    }
  }

  for (const [ingId, qty] of Object.entries(ingredientQuantities)) {
    const numQty = Number(qty);
    const di = dish.ingredients.find((i) => i.ingredientId === ingId || i.dishIngredientId === ingId);
    if (!di) {
      return {
        status: 422,
        body: {
          data: null,
          error: { code: 'INGREDIENT_NOT_IN_DISH', message: 'Ingredient does not belong to this dish.' },
        },
      };
    }

    if (!di.isQuantityAdjustable && numQty !== di.defaultQuantity) {
      return {
        status: 422,
        body: {
          data: null,
          error: { code: 'INGREDIENT_NOT_ADJUSTABLE', message: `Ingredient ${di.name} cannot be adjusted.` },
        },
      };
    }

    if (numQty < di.minQuantity || numQty > di.maxQuantity) {
      return {
        status: 422,
        body: {
          data: null,
          error: { code: 'INVALID_INGREDIENT_QUANTITY', message: `Quantity for ${di.name} must be between ${di.minQuantity} and ${di.maxQuantity}.` },
        },
      };
    }

    const stepDiff = numQty - di.defaultQuantity;
    if (stepDiff > 0) {
      customizationPrice += stepDiff * di.priceDeltaPerStep;
    }
  }

  for (const subId of substitutionIds) {
    const sub = dish.substitutions.find((s) => s.id === subId);
    if (!sub) {
      return {
        status: 422,
        body: {
          data: null,
          error: { code: 'INVALID_SUBSTITUTION', message: 'Substitution is not available for this dish.' },
        },
      };
    }
    customizationPrice += Number(sub.priceDelta);
  }

  const basePrice = dish.basePrice;
  const finalUnitPrice = Math.max(0, basePrice + customizationPrice);

  const normalizedConfig = {
    dishId: dish.id,
    tasteValues,
    ingredientQuantities,
    substitutionIds,
    finalUnitPrice,
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(normalizedConfig)).digest('hex');

  return {
    status: 200,
    body: {
      data: {
        valid: true,
        dishId: dish.id,
        basePrice,
        customizationPrice,
        finalUnitPrice,
        currency: dish.currency,
        configurationHash: hash,
        warnings,
        normalizedConfiguration: {
          tasteValues,
          ingredientQuantities,
          substitutionIds,
        },
      },
      error: null,
    },
  };
}

// ── GET /api/dishes ──

dishRoutes.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 12));
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;

    const body: ApiResponse<{ items: any[]; page: number; pageSize: number; total: number }> =
      await queryWithFallback(
        async () => {
          const where: any = {
            deletedAt: null,
            isAvailable: true,
          };

          if (search) {
            where.OR = [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ];
          }

          if (category && category !== 'ALL') {
            where.category = category;
          }

          const [total, dishes] = await Promise.all([
            prisma.dish.count({ where }),
            prisma.dish.findMany({
              where,
              skip: (page - 1) * pageSize,
              take: pageSize,
              orderBy: { createdAt: 'asc' },
            }),
          ]);

          const items = dishes.map((d) => ({
            id: d.id,
            slug: d.slug,
            name: d.name,
            description: d.description,
            shortDescription: d.description ?? undefined,
            imagePath: d.imagePath,
            imageUrl: d.imagePath ?? undefined,
            category: d.category,
            basePrice: Number(d.basePriceMinor),
            currency: d.currency,
            prepTimeMinutes: d.prepTimeMinutes,
            preparationTimeMinutes: d.prepTimeMinutes ?? undefined,
            isAvailable: d.isAvailable,
          }));

          return {
            data: {
              items,
              page,
              pageSize,
              total,
            },
            error: null,
          };
        },
        () => {
          const fallbackData = getFallbackDishesResponse(page, pageSize, search, category);
          return {
            data: fallbackData,
            error: null,
          };
        }
      );

    res.json(body);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dishes/:dishIdOrSlug ──

dishRoutes.get('/:dishIdOrSlug', async (req, res, next) => {
  try {
    const dishIdOrSlug = req.params.dishIdOrSlug || (req.params as any).id;

    const response = await queryWithFallback(
      async () => {
        const dish = await prisma.dish.findFirst({
          where: {
            OR: [{ id: dishIdOrSlug }, { slug: dishIdOrSlug }],
            deletedAt: null,
          },
          include: {
            tasteConfigurations: {
              include: {
                attribute: true,
                options: {
                  orderBy: { value: 'asc' },
                },
              },
              orderBy: { displayOrder: 'asc' },
            },
            ingredients: {
              include: {
                ingredient: true,
              },
              orderBy: { displayOrder: 'asc' },
            },
            substitutions: {
              where: { isAvailable: true },
              include: {
                originalIngredient: true,
                substituteIngredient: true,
              },
            },
          },
        });

        if (!dish) {
          const fb = findFallbackDish(dishIdOrSlug);
          if (fb) {
            return { status: 200, body: { data: fb, error: null } };
          }
          return {
            status: 404,
            body: {
              data: null,
              error: { code: 'DISH_NOT_FOUND', message: 'Dish not found.' },
            },
          };
        }

        const tasteConfigurations = dish.tasteConfigurations.map((tc) => ({
          attributeId: tc.attributeId,
          code: tc.attribute.code,
          name: tc.attribute.name,
          baseValue: tc.baseValue,
          minValue: tc.minValue,
          maxValue: tc.maxValue,
          isAdjustable: tc.isAdjustable,
          options: tc.options.map((opt) => ({
            value: opt.value,
            customerLabel: opt.customerLabel,
            customerDescription: opt.customerDescription,
            priceDelta: Number(opt.priceDelta),
          })),
        }));

        const ingredients = dish.ingredients.map((di) => ({
          dishIngredientId: di.id,
          ingredientId: di.ingredientId,
          name: di.ingredient.name,
          role: di.role,
          defaultQuantity: Number(di.defaultQuantity),
          minQuantity: Number(di.minQuantity),
          maxQuantity: Number(di.maxQuantity),
          unit: di.unit,
          priceDeltaPerStep: Number(di.priceDeltaPerStep),
          isQuantityAdjustable: di.isQuantityAdjustable,
          isAvailable: di.isAvailable,
        }));

        const substitutions = dish.substitutions.map((sub) => ({
          id: sub.id,
          originalIngredientId: sub.originalIngredientId,
          originalIngredientName: sub.originalIngredient.name,
          substituteIngredientId: sub.substituteIngredientId,
          substituteIngredientName: sub.substituteIngredient.name,
          reason: sub.reason,
          priceDelta: Number(sub.priceDelta),
          isAvailable: sub.isAvailable,
        }));

        const detail = {
          id: dish.id,
          slug: dish.slug,
          name: dish.name,
          description: dish.description,
          shortDescription: dish.description ?? undefined,
          imagePath: dish.imagePath,
          imageUrl: dish.imagePath ?? undefined,
          category: dish.category,
          basePrice: Number(dish.basePriceMinor),
          currency: dish.currency,
          prepTimeMinutes: dish.prepTimeMinutes,
          preparationTimeMinutes: dish.prepTimeMinutes ?? undefined,
          isAvailable: dish.isAvailable,
          tasteConfigurations,
          ingredients,
          substitutions,
        };

        return { status: 200, body: { data: detail, error: null } };
      },
      () => {
        const fb = findFallbackDish(dishIdOrSlug);
        if (!fb) {
          return {
            status: 404,
            body: {
              data: null,
              error: { code: 'DISH_NOT_FOUND', message: 'Dish not found.' },
            },
          };
        }
        return { status: 200, body: { data: fb, error: null } };
      }
    );

    res.status(response.status).json(response.body);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/dishes/:dishId/recommendation ──

dishRoutes.post('/:dishId/recommendation', async (req, res, next) => {
  try {
    const { dishId } = req.params;
    const { tasteProfileCode, personalPreferences = {} } = req.body ?? {};

    const response = await queryWithFallback(
      async () => {
        const dish = await prisma.dish.findFirst({
          where: {
            OR: [{ id: dishId }, { slug: dishId }],
            deletedAt: null,
          },
          include: {
            tasteConfigurations: {
              include: {
                attribute: true,
                options: true,
              },
            },
          },
        });

        if (!dish) {
          const fb = findFallbackDish(dishId);
          if (fb) {
            return generateFallbackRecommendation(fb, tasteProfileCode, personalPreferences);
          }
          return {
            status: 404,
            body: { data: null, error: { code: 'DISH_NOT_FOUND', message: 'Dish not found.' } },
          };
        }

        let profileDefaults: Record<string, number> = {};
        if (tasteProfileCode) {
          const profile = await prisma.tasteProfile.findUnique({
            where: { code: tasteProfileCode },
            include: {
              defaults: {
                include: { attribute: true },
              },
            },
          });

          if (!profile) {
            return {
              status: 404,
              body: { data: null, error: { code: 'TASTE_PROFILE_NOT_FOUND', message: 'Taste profile not found.' } },
            };
          }

          for (const d of profile.defaults) {
            profileDefaults[d.attribute.code] = d.defaultValue;
          }
        }

        const attributes = dish.tasteConfigurations.map((tc) => {
          const code = tc.attribute.code;
          let sourceValue: number;
          let recommendationSource: string;

          if (personalPreferences[code] !== undefined) {
            sourceValue = personalPreferences[code];
            recommendationSource = 'PERSONAL';
          } else if (profileDefaults[code] !== undefined) {
            sourceValue = profileDefaults[code];
            recommendationSource = 'TASTE_PROFILE';
          } else {
            sourceValue = tc.baseValue;
            recommendationSource = 'DISH_DEFAULT';
          }

          const appliedValue = Math.max(tc.minValue, Math.min(tc.maxValue, sourceValue));
          const wasClamped = appliedValue !== sourceValue;

          // Find closest customer label from options
          const opt =
            tc.options.find((o) => o.value === appliedValue) ??
            tc.options.reduce(
              (prev, curr) =>
                Math.abs(curr.value - appliedValue) < Math.abs(prev.value - appliedValue) ? curr : prev,
              tc.options[0]
            );

          return {
            code,
            name: tc.attribute.name,
            recommendationSource,
            sourceValue,
            baseValue: tc.baseValue,
            minValue: tc.minValue,
            maxValue: tc.maxValue,
            appliedValue,
            wasClamped,
            customerLabel: opt?.customerLabel ?? `Mức ${appliedValue}`,
          };
        });

        return {
          status: 200,
          body: {
            data: {
              dishId: dish.id,
              attributes,
            },
            error: null,
          },
        };
      },
      () => {
        const fb = findFallbackDish(dishId);
        if (!fb) {
          return {
            status: 404,
            body: { data: null, error: { code: 'DISH_NOT_FOUND', message: 'Dish not found.' } },
          };
        }
        return generateFallbackRecommendation(fb, tasteProfileCode, personalPreferences);
      }
    );

    res.status(response.status).json(response.body);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/dishes/:dishId/validate-customization ──

dishRoutes.post('/:dishId/validate-customization', async (req, res, next) => {
  try {
    const { dishId } = req.params;
    const {
      tasteValues = {},
      ingredientQuantities = {},
      substitutionIds = [],
      notes = '',
    } = req.body ?? {};

    const response = await queryWithFallback(
      async () => {
        const dish = await prisma.dish.findFirst({
          where: {
            OR: [{ id: dishId }, { slug: dishId }],
            deletedAt: null,
          },
          include: {
            tasteConfigurations: {
              include: { attribute: true, options: true },
            },
            ingredients: {
              include: { ingredient: true },
            },
            substitutions: {
              where: { isAvailable: true },
            },
          },
        });

        if (!dish) {
          const fb = findFallbackDish(dishId);
          if (fb) {
            return validateFallbackCustomization(fb, tasteValues, ingredientQuantities, substitutionIds);
          }
          return {
            status: 404,
            body: { data: null, error: { code: 'DISH_NOT_FOUND', message: 'Dish not found.' } },
          };
        }

        if (!dish.isAvailable) {
          return {
            status: 409,
            body: { data: null, error: { code: 'DISH_UNAVAILABLE', message: 'Dish is currently unavailable.' } },
          };
        }

        let customizationPrice = 0;
        const warnings: Array<{ code: string; message: string }> = [];

        // Validate taste values
        for (const [code, val] of Object.entries(tasteValues)) {
          const numVal = Number(val);
          const config = dish.tasteConfigurations.find((c) => c.attribute.code === code);
          if (!config) {
            return {
              status: 422,
              body: {
                data: null,
                error: { code: 'INVALID_TASTE_ATTRIBUTE', message: `Taste attribute ${code} is not valid for this dish.` },
              },
            };
          }
          if (numVal < config.minValue || numVal > config.maxValue) {
            return {
              status: 422,
              body: {
                data: null,
                error: { code: 'INVALID_TASTE_VALUE', message: `${config.attribute.name} must be between ${config.minValue} and ${config.maxValue}.` },
              },
            };
          }

          const matchingOption = config.options.find((o) => o.value === numVal);
          if (matchingOption) {
            customizationPrice += Number(matchingOption.priceDelta);
          }
        }

        // Validate ingredient quantities
        for (const [ingId, qty] of Object.entries(ingredientQuantities)) {
          const numQty = Number(qty);
          const di = dish.ingredients.find((i) => i.ingredientId === ingId || i.ingredient.code === ingId);
          if (!di) {
            return {
              status: 422,
              body: {
                data: null,
                error: { code: 'INGREDIENT_NOT_IN_DISH', message: 'Ingredient does not belong to this dish.' },
              },
            };
          }

          if (!di.isQuantityAdjustable && numQty !== Number(di.defaultQuantity)) {
            return {
              status: 422,
              body: {
                data: null,
                error: { code: 'INGREDIENT_NOT_ADJUSTABLE', message: `Ingredient ${di.ingredient.name} cannot be adjusted.` },
              },
            };
          }

          if (numQty < Number(di.minQuantity) || numQty > Number(di.maxQuantity)) {
            return {
              status: 422,
              body: {
                data: null,
                error: { code: 'INVALID_INGREDIENT_QUANTITY', message: `Quantity for ${di.ingredient.name} must be between ${di.minQuantity} and ${di.maxQuantity}.` },
              },
            };
          }

          const stepDiff = numQty - Number(di.defaultQuantity);
          if (stepDiff > 0) {
            customizationPrice += stepDiff * Number(di.priceDeltaPerStep);
          }
        }

        // Validate substitutions
        for (const subId of substitutionIds) {
          const sub = dish.substitutions.find((s) => s.id === subId);
          if (!sub) {
            return {
              status: 422,
              body: {
                data: null,
                error: { code: 'INVALID_SUBSTITUTION', message: 'Substitution is not available for this dish.' },
              },
            };
          }
          customizationPrice += Number(sub.priceDelta);
        }

        const basePrice = Number(dish.basePriceMinor);
        const finalUnitPrice = Math.max(0, basePrice + customizationPrice);

        // Compute normalized hash
        const normalizedConfig = {
          dishId: dish.id,
          tasteValues,
          ingredientQuantities,
          substitutionIds,
          finalUnitPrice,
        };
        const hash = crypto.createHash('sha256').update(JSON.stringify(normalizedConfig)).digest('hex');

        return {
          status: 200,
          body: {
            data: {
              valid: true,
              dishId: dish.id,
              basePrice,
              customizationPrice,
              finalUnitPrice,
              currency: dish.currency,
              configurationHash: hash,
              warnings,
              normalizedConfiguration: {
                tasteValues,
                ingredientQuantities,
                substitutionIds,
              },
            },
            error: null,
          },
        };
      },
      () => {
        const fb = findFallbackDish(dishId);
        if (!fb) {
          return {
            status: 404,
            body: { data: null, error: { code: 'DISH_NOT_FOUND', message: 'Dish not found.' } },
          };
        }
        return validateFallbackCustomization(fb, tasteValues, ingredientQuantities, substitutionIds);
      }
    );

    res.status(response.status).json(response.body);
  } catch (err) {
    next(err);
  }
});
