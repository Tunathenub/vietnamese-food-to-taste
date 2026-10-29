import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import type { ApiResponse } from '@vft/shared';

export const dishRoutes = Router();

// GET /api/dishes
dishRoutes.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 12));
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;

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

    if (category) {
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
      shortDescription: d.shortDescription,
      imageUrl: d.imageUrl,
      category: d.category,
      basePrice: Number(d.basePrice),
      currency: d.currency,
      preparationTimeMinutes: d.preparationTimeMinutes,
      isAvailable: d.isAvailable,
    }));

    const body: ApiResponse<{ items: typeof items; page: number; pageSize: number; total: number }> = {
      data: {
        items,
        page,
        pageSize,
        total,
      },
      error: null,
    };

    res.json(body);
  } catch (err) {
    next(err);
  }
});

// GET /api/dishes/:dishIdOrSlug
dishRoutes.get('/:dishIdOrSlug', async (req, res, next) => {
  try {
    const { dishIdOrSlug } = req.params;

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
      const body: ApiResponse<null> = {
        data: null,
        error: { code: 'DISH_NOT_FOUND', message: 'Dish not found.' },
      };
      res.status(404).json(body);
      return;
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
      shortDescription: dish.shortDescription,
      description: dish.description,
      imageUrl: dish.imageUrl,
      category: dish.category,
      basePrice: Number(dish.basePrice),
      currency: dish.currency,
      preparationTimeMinutes: dish.preparationTimeMinutes,
      isAvailable: dish.isAvailable,
      tasteConfigurations,
      ingredients,
      substitutions,
    };

    res.json({ data: detail, error: null });
  } catch (err) {
    next(err);
  }
});

// POST /api/dishes/:dishId/recommendation
dishRoutes.post('/:dishId/recommendation', async (req, res, next) => {
  try {
    const { dishId } = req.params;
    const { tasteProfileCode, personalPreferences = {} } = req.body ?? {};

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
      res.status(404).json({ data: null, error: { code: 'DISH_NOT_FOUND', message: 'Dish not found.' } });
      return;
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
        res.status(404).json({ data: null, error: { code: 'TASTE_PROFILE_NOT_FOUND', message: 'Taste profile not found.' } });
        return;
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
      const opt = tc.options.find((o) => o.value === appliedValue) ??
        tc.options.reduce((prev, curr) =>
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

    res.json({
      data: {
        dishId: dish.id,
        attributes,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/dishes/:dishId/validate-customization
dishRoutes.post('/:dishId/validate-customization', async (req, res, next) => {
  try {
    const { dishId } = req.params;
    const {
      tasteValues = {},
      ingredientQuantities = {},
      substitutionIds = [],
      notes = '',
    } = req.body ?? {};

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
      res.status(404).json({ data: null, error: { code: 'DISH_NOT_FOUND', message: 'Dish not found.' } });
      return;
    }

    if (!dish.isAvailable) {
      res.status(409).json({ data: null, error: { code: 'DISH_UNAVAILABLE', message: 'Dish is currently unavailable.' } });
      return;
    }

    let customizationPrice = 0;
    const warnings: Array<{ code: string; message: string }> = [];

    // Validate taste values
    for (const [code, val] of Object.entries(tasteValues)) {
      const numVal = Number(val);
      const config = dish.tasteConfigurations.find((c) => c.attribute.code === code);
      if (!config) {
        res.status(422).json({
          data: null,
          error: { code: 'INVALID_TASTE_ATTRIBUTE', message: `Taste attribute ${code} is not valid for this dish.` },
        });
        return;
      }
      if (numVal < config.minValue || numVal > config.maxValue) {
        res.status(422).json({
          data: null,
          error: { code: 'INVALID_TASTE_VALUE', message: `${config.attribute.name} must be between ${config.minValue} and ${config.maxValue}.` },
        });
        return;
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
        res.status(422).json({
          data: null,
          error: { code: 'INGREDIENT_NOT_IN_DISH', message: 'Ingredient does not belong to this dish.' },
        });
        return;
      }

      if (!di.isQuantityAdjustable && numQty !== Number(di.defaultQuantity)) {
        res.status(422).json({
          data: null,
          error: { code: 'INGREDIENT_NOT_ADJUSTABLE', message: `Ingredient ${di.ingredient.name} cannot be adjusted.` },
        });
        return;
      }

      if (numQty < Number(di.minQuantity) || numQty > Number(di.maxQuantity)) {
        res.status(422).json({
          data: null,
          error: { code: 'INVALID_INGREDIENT_QUANTITY', message: `Quantity for ${di.ingredient.name} must be between ${di.minQuantity} and ${di.maxQuantity}.` },
        });
        return;
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
        res.status(422).json({
          data: null,
          error: { code: 'INVALID_SUBSTITUTION', message: 'Substitution is not available for this dish.' },
        });
        return;
      }
      customizationPrice += Number(sub.priceDelta);
    }

    const basePrice = Number(dish.basePrice);
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

    res.json({
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
    });
  } catch (err) {
    next(err);
  }
});
