import { PrismaClient, TasteProfileType, IngredientRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Vietnamese Food to Taste database...');

  // ── Taste Attributes ──
  const attributes = [
    { code: 'spice_level', name: 'Độ cay (Spiciness)', minValue: 0, maxValue: 5 },
    { code: 'sweetness', name: 'Độ ngọt (Sweetness)', minValue: 0, maxValue: 5 },
    { code: 'sourness', name: 'Độ chua (Sourness)', minValue: 0, maxValue: 5 },
    { code: 'fish_sauce_intensity', name: 'Vị nước mắm (Fish Sauce)', minValue: 0, maxValue: 5 },
    { code: 'herb_intensity', name: 'Rau thơm (Herbs)', minValue: 0, maxValue: 5 },
    { code: 'oil_richness', name: 'Độ béo/dầu mỡ (Richness)', minValue: 0, maxValue: 5 },
  ];

  const attributeMap = new Map<string, string>();
  for (const attr of attributes) {
    const record = await prisma.tasteAttribute.upsert({
      where: { code: attr.code },
      update: attr,
      create: attr,
    });
    attributeMap.set(attr.code, record.id);
  }

  // ── Taste Profiles ──
  const profiles = [
    {
      code: 'AUTHENTIC_VN',
      name: 'Vị chuẩn Việt Nam',
      type: TasteProfileType.COUNTRY,
      countryCode: 'VN',
      description: 'Hương vị truyền thống cân bằng, đậm đà nước mắm và rau thơm tươi.',
      defaults: {
        spice_level: 2,
        sweetness: 2,
        sourness: 2,
        fish_sauce_intensity: 3,
        herb_intensity: 4,
        oil_richness: 2,
      },
    },
    {
      code: 'KR_INSPIRED',
      name: 'Khẩu vị Hàn Quốc (Korean-inspired)',
      type: TasteProfileType.COUNTRY,
      countryCode: 'KR',
      description: 'Tăng vị cay đậm đà, vị đậm đà vừa phải, giảm bớt mùi mắm nồng.',
      defaults: {
        spice_level: 4,
        sweetness: 2,
        sourness: 3,
        fish_sauce_intensity: 2,
        herb_intensity: 3,
        oil_richness: 3,
      },
    },
    {
      code: 'WESTERN_MILD',
      name: 'Khẩu vị phương Tây dịu nhẹ (Western Mild)',
      type: TasteProfileType.COUNTRY,
      countryCode: 'US',
      description: 'Ít cay, dịu mùi nước mắm, rau thơm chọn lọc, vị thanh nhẹ.',
      defaults: {
        spice_level: 1,
        sweetness: 3,
        sourness: 2,
        fish_sauce_intensity: 1,
        herb_intensity: 2,
        oil_richness: 2,
      },
    },
    {
      code: 'JP_DELICATE',
      name: 'Khẩu vị Nhật Bản thanh tao (Japanese Delicate)',
      type: TasteProfileType.COUNTRY,
      countryCode: 'JP',
      description: 'Vị thanh ngọt tự nhiên, tối giản độ cay và mắm, giữ trọn hương vị nguyên bản.',
      defaults: {
        spice_level: 0,
        sweetness: 2,
        sourness: 1,
        fish_sauce_intensity: 1,
        herb_intensity: 2,
        oil_richness: 1,
      },
    },
  ];

  for (const p of profiles) {
    const profile = await prisma.tasteProfile.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        type: p.type,
        countryCode: p.countryCode,
        description: p.description,
      },
      create: {
        code: p.code,
        name: p.name,
        type: p.type,
        countryCode: p.countryCode,
        description: p.description,
      },
    });

    for (const [attrCode, val] of Object.entries(p.defaults)) {
      const attrId = attributeMap.get(attrCode);
      if (attrId) {
        await prisma.tasteProfileDefault.upsert({
          where: {
            tasteProfileId_attributeId: {
              tasteProfileId: profile.id,
              attributeId: attrId,
            },
          },
          update: { defaultValue: val },
          create: {
            tasteProfileId: profile.id,
            attributeId: attrId,
            defaultValue: val,
          },
        });
      }
    }
  }

  // ── Ingredients ──
  const ingredientsData = [
    { code: 'BEEF_SLICES', name: 'Thịt bò tươi', category: 'MEAT' },
    { code: 'PORK_GRILLED', name: 'Thịt nướng chả', category: 'MEAT' },
    { code: 'PORK_BELLY', name: 'Thịt heo quay / ba chỉ', category: 'MEAT' },
    { code: 'TOFU', name: 'Đậu phụ chiên', category: 'VEGETARIAN' },
    { code: 'FRESH_CHILI', name: 'Ớt tươi thái lát', category: 'SPICE' },
    { code: 'CHILI_SAUCE', name: 'Tương ớt truyền thống', category: 'SAUCE' },
    { code: 'FISH_SAUCE', name: 'Nước mắm truyền thống', category: 'SAUCE' },
    { code: 'THAI_BASIL', name: 'Húng quế', category: 'HERB' },
    { code: 'CILANTRO', name: 'Ngò gai & rau mùi', category: 'HERB' },
    { code: 'BEAN_SPROUTS', name: 'Giá đỗ', category: 'VEGETABLE' },
    { code: 'LIME', name: 'Chanh tươi', category: 'FRUIT' },
    { code: 'GARLIC_PICKLED', name: 'Tỏi ngâm giấm', category: 'PICKLE' },
  ];

  const ingredientMap = new Map<string, string>();
  for (const ing of ingredientsData) {
    const record = await prisma.ingredient.upsert({
      where: { code: ing.code },
      update: ing,
      create: ing,
    });
    ingredientMap.set(ing.code, record.id);
  }

  // ── Dishes ──
  const dishesData = [
    {
      slug: 'pho-bo',
      name: 'Phở Bò Hà Nội',
      shortDescription: 'Bánh phở mềm cùng nước dùng hầm xương bò 12 tiếng thơm thảo mộc.',
      description: 'Phở bò truyền thống với nước dùng thanh trong, đậm đà gia vị hoa hồi, quế, thảo quả, phục vụ cùng thịt bò tái mềm thơm.',
      imagePath: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600',
      category: 'NOODLE_SOUP',
      basePrice: BigInt(65000),
      prepTimeMinutes: 15,
      tasteConfigs: [
        {
          code: 'spice_level',
          baseValue: 1,
          minValue: 0,
          maxValue: 5,
          options: [
            { value: 0, customerLabel: 'Không cay', customerDescription: 'Không dùng ớt tươi hoặc sa tế', kitchenInstruction: 'No chili', priceDelta: BigInt(0) },
            { value: 1, customerLabel: 'Hơi cay', customerDescription: 'Vài lát ớt tươi mỏng', kitchenInstruction: '1 chili slice', priceDelta: BigInt(0) },
            { value: 3, customerLabel: 'Cay vừa', customerDescription: 'Ớt tươi và một chút tương ớt', kitchenInstruction: '1 spoon chili paste', priceDelta: BigInt(0) },
            { value: 5, customerLabel: 'Cay nhiều', customerDescription: 'Cay nồng với sa tế ớt hiểm', kitchenInstruction: 'Extra hot chili paste', priceDelta: BigInt(0) },
          ],
        },
        {
          code: 'fish_sauce_intensity',
          baseValue: 3,
          minValue: 0,
          maxValue: 5,
          options: [
            { value: 0, customerLabel: 'Không mắm', customerDescription: 'Dùng muối biển thanh dịu', kitchenInstruction: 'No fish sauce', priceDelta: BigInt(0) },
            { value: 2, customerLabel: 'Mắm nhẹ', customerDescription: 'Nêm mắm vừa phải', kitchenInstruction: 'Half fish sauce portion', priceDelta: BigInt(0) },
            { value: 3, customerLabel: 'Chuẩn vị truyền thống', customerDescription: 'Đậm vị nước mắm cốt nhĩ', kitchenInstruction: 'Standard fish sauce', priceDelta: BigInt(0) },
            { value: 5, customerLabel: 'Đậm đà', customerDescription: 'Thêm nước mắm cốt đậm vị', kitchenInstruction: 'Extra fish sauce', priceDelta: BigInt(0) },
          ],
        },
        {
          code: 'herb_intensity',
          baseValue: 4,
          minValue: 0,
          maxValue: 5,
          options: [
            { value: 0, customerLabel: 'Không rau thơm', customerDescription: 'Không hành hoa, ngò gai', kitchenInstruction: 'No herbs/scallions', priceDelta: BigInt(0) },
            { value: 2, customerLabel: 'Ít rau thơm', customerDescription: 'Chỉ rắc chút hành hoa', kitchenInstruction: 'Light scallions only', priceDelta: BigInt(0) },
            { value: 4, customerLabel: 'Đầy đủ rau thơm', customerDescription: 'Hành hoa, ngò gai, húng quế chuẩn vị', kitchenInstruction: 'Full herb set', priceDelta: BigInt(0) },
          ],
        },
      ],
      ingredients: [
        { code: 'BEEF_SLICES', role: IngredientRole.REQUIRED, defaultQty: 1, minQty: 1, maxQty: 3, unit: 'phần', priceDelta: BigInt(25000), adjustable: true },
        { code: 'FRESH_CHILI', role: IngredientRole.OPTIONAL, defaultQty: 1, minQty: 0, maxQty: 3, unit: 'phần', priceDelta: BigInt(0), adjustable: true },
        { code: 'THAI_BASIL', role: IngredientRole.REMOVABLE, defaultQty: 1, minQty: 0, maxQty: 2, unit: 'đĩa', priceDelta: BigInt(0), adjustable: true },
      ],
      substitutions: [
        { original: 'BEEF_SLICES', substitute: 'TOFU', reason: 'Tùy chọn ăn chay', priceDelta: BigInt(-10000), kitchen: 'Thay thịt bò bằng đậu phụ chiên' },
      ],
    },
    {
      slug: 'bun-cha',
      name: 'Bún Chả Hà Nội',
      shortDescription: 'Thịt heo nướng than hoa thơm lừng ăn kèm bún tươi và nước chấm chua ngọt.',
      description: 'Chả miếng và chả viên nướng xém cạnh, thả vào bát nước mắm pha chua ngọt có đu đủ xanh, cà rốt giòn rụm.',
      imagePath: 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=600',
      category: 'NOODLE',
      basePrice: BigInt(60000),
      prepTimeMinutes: 12,
      tasteConfigs: [
        {
          code: 'sweetness',
          baseValue: 3,
          minValue: 1,
          maxValue: 5,
          options: [
            { value: 1, customerLabel: 'Ngọt thanh nhẹ', customerDescription: 'Giảm bớt đường trong nước chấm', kitchenInstruction: 'Light sweet dipping', priceDelta: BigInt(0) },
            { value: 3, customerLabel: 'Vừa vặn truyền thống', customerDescription: 'Nước chấm chua ngọt chuẩn Hà Nội', kitchenInstruction: 'Standard sweet dipping', priceDelta: BigInt(0) },
            { value: 5, customerLabel: 'Ngọt đậm', customerDescription: 'Nước chấm thiên ngọt kiểu miền Nam', kitchenInstruction: 'Extra sweet dipping', priceDelta: BigInt(0) },
          ],
        },
        {
          code: 'sourness',
          baseValue: 3,
          minValue: 1,
          maxValue: 5,
          options: [
            { value: 1, customerLabel: 'Chua dịu', customerDescription: 'Ít giấm/chanh', kitchenInstruction: 'Mild sour', priceDelta: BigInt(0) },
            { value: 3, customerLabel: 'Chua thanh vừa miệng', customerDescription: 'Cân bằng giấm tỏi và đu đủ ngâm', kitchenInstruction: 'Standard sour', priceDelta: BigInt(0) },
          ],
        },
      ],
      ingredients: [
        { code: 'PORK_GRILLED', role: IngredientRole.REQUIRED, defaultQty: 1, minQty: 1, maxQty: 2, unit: 'suất', priceDelta: BigInt(25000), adjustable: true },
        { code: 'FRESH_CHILI', role: IngredientRole.OPTIONAL, defaultQty: 1, minQty: 0, maxQty: 3, unit: 'đĩa', priceDelta: BigInt(0), adjustable: true },
      ],
      substitutions: [
        { original: 'PORK_GRILLED', substitute: 'TOFU', reason: 'Tùy chọn chay', priceDelta: BigInt(-15000), kitchen: 'Thay chả nướng bằng chả đậu chiên sốt thơm' },
      ],
    },
    {
      slug: 'banh-mi',
      name: 'Bánh Mì Kẹp Đặc Biệt',
      shortDescription: 'Vỏ bánh giòn rụm kẹp pate béo ngậy, thịt xá xíu, đồ chua và rau thơm.',
      description: 'Món ăn đường phố biểu tượng của Việt Nam với lớp pate gan thủ công, thịt ba chỉ, dưa chuột và sốt ớt tươi.',
      imagePath: 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=600',
      category: 'SANDWICH',
      basePrice: BigInt(35000),
      prepTimeMinutes: 5,
      tasteConfigs: [
        {
          code: 'spice_level',
          baseValue: 2,
          minValue: 0,
          maxValue: 5,
          options: [
            { value: 0, customerLabel: 'Không cay', customerDescription: 'Không ớt, không sốt cay', kitchenInstruction: 'No chili/spicy sauce', priceDelta: BigInt(0) },
            { value: 2, customerLabel: 'Cay nhẹ', customerDescription: 'Một đường tương ớt', kitchenInstruction: 'Mild chili sauce', priceDelta: BigInt(0) },
            { value: 4, customerLabel: 'Cay nhiều', customerDescription: 'Ớt tươi thái lát + tương ớt cay', kitchenInstruction: 'Fresh chili + hot sauce', priceDelta: BigInt(0) },
          ],
        },
      ],
      ingredients: [
        { code: 'PORK_BELLY', role: IngredientRole.REQUIRED, defaultQty: 1, minQty: 1, maxQty: 2, unit: 'phần', priceDelta: BigInt(15000), adjustable: true },
        { code: 'CILANTRO', role: IngredientRole.REMOVABLE, defaultQty: 1, minQty: 0, maxQty: 2, unit: 'phần', priceDelta: BigInt(0), adjustable: true },
      ],
      substitutions: [
        { original: 'PORK_BELLY', substitute: 'TOFU', reason: 'Chay thanh đạm', priceDelta: BigInt(-5000), kitchen: 'Thay thịt bằng đậu sốt nấm' },
      ],
    },
  ];

  for (const d of dishesData) {
    const dish = await prisma.dish.upsert({
      where: { slug: d.slug },
      update: {
        name: d.name,
        description: d.description,
        imagePath: d.imageUrl,
        category: d.category,
        basePriceMinor: d.basePrice,
        prepTimeMinutes: d.preparationTimeMinutes,
      },
      create: {
        slug: d.slug,
        name: d.name,
        description: d.description,
        imagePath: d.imageUrl,
        category: d.category,
        basePriceMinor: d.basePrice,
        prepTimeMinutes: d.preparationTimeMinutes,
      },
    });

    // Taste configs
    for (const tc of d.tasteConfigs) {
      const attrId = attributeMap.get(tc.code);
      if (!attrId) continue;

      const config = await prisma.dishTasteConfiguration.upsert({
        where: {
          dishId_attributeId: {
            dishId: dish.id,
            attributeId: attrId,
          },
        },
        update: {
          baseValue: tc.baseValue,
          minValue: tc.minValue,
          maxValue: tc.maxValue,
        },
        create: {
          dishId: dish.id,
          attributeId: attrId,
          baseValue: tc.baseValue,
          minValue: tc.minValue,
          maxValue: tc.maxValue,
        },
      });

      for (const opt of tc.options) {
        await prisma.dishTasteOption.upsert({
          where: {
            dishTasteConfigId_value: {
              dishTasteConfigId: config.id,
              value: opt.value,
            },
          },
          update: {
            customerLabel: opt.customerLabel,
            customerDescription: opt.customerDescription,
            kitchenInstruction: opt.kitchenInstruction,
            priceDelta: opt.priceDelta,
          },
          create: {
            dishTasteConfigId: config.id,
            value: opt.value,
            customerLabel: opt.customerLabel,
            customerDescription: opt.customerDescription,
            kitchenInstruction: opt.kitchenInstruction,
            priceDelta: opt.priceDelta,
          },
        });
      }
    }

    // Dish ingredients
    for (const ing of d.ingredients) {
      const ingId = ingredientMap.get(ing.code);
      if (!ingId) continue;

      await prisma.dishIngredient.upsert({
        where: {
          dishId_ingredientId: {
            dishId: dish.id,
            ingredientId: ingId,
          },
        },
        update: {
          role: ing.role,
          defaultQuantity: ing.defaultQty,
          minQuantity: ing.minQty,
          maxQuantity: ing.maxQty,
          unit: ing.unit,
          priceDeltaPerStep: ing.priceDelta,
          isQuantityAdjustable: ing.adjustable,
        },
        create: {
          dishId: dish.id,
          ingredientId: ingId,
          role: ing.role,
          defaultQuantity: ing.defaultQty,
          minQuantity: ing.minQty,
          maxQuantity: ing.maxQty,
          unit: ing.unit,
          priceDeltaPerStep: ing.priceDelta,
          isQuantityAdjustable: ing.adjustable,
        },
      });
    }

    // Dish substitutions
    for (const sub of d.substitutions) {
      const origId = ingredientMap.get(sub.original);
      const repId = ingredientMap.get(sub.substitute);
      if (!origId || !repId) continue;

      await prisma.dishIngredientSubstitution.upsert({
        where: {
          dishId_originalIngredientId_substituteIngredientId: {
            dishId: dish.id,
            originalIngredientId: origId,
            substituteIngredientId: repId,
          },
        },
        update: {
          reason: sub.reason,
          priceDelta: sub.priceDelta,
          kitchenInstruction: sub.kitchen,
        },
        create: {
          dishId: dish.id,
          originalIngredientId: origId,
          substituteIngredientId: repId,
          reason: sub.reason,
          priceDelta: sub.priceDelta,
          kitchenInstruction: sub.kitchen,
        },
      });
    }
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });