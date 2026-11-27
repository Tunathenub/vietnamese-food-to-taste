import {
  PrismaClient,
  TasteProfileType,
  IngredientRole,
  UserRole,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  FulfillmentType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function hashPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, '');
  return crypto
    .createHmac('sha256', process.env.PHONE_SECRET ?? 'vft_secret')
    .update(normalized)
    .digest('hex');
}

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
      dialCode: '+84',
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
      dialCode: '+82',
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
      dialCode: '+1',
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
      dialCode: '+81',
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

  const profileMap = new Map<string, string>();
  for (const p of profiles) {
    const profile = await prisma.tasteProfile.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        type: p.type,
        countryCode: p.countryCode,
        dialCode: p.dialCode,
        description: p.description,
      },
      create: {
        code: p.code,
        name: p.name,
        type: p.type,
        countryCode: p.countryCode,
        dialCode: p.dialCode,
        description: p.description,
      },
    });
    profileMap.set(p.code, profile.id);

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

  const dishMap = new Map<string, { id: string; slug: string; name: string; category: string; basePriceMinor: bigint }>();
  for (const d of dishesData) {
    const dish = await prisma.dish.upsert({
      where: { slug: d.slug },
      update: {
        name: d.name,
        description: d.description,
        imagePath: d.imagePath,
        category: d.category,
        basePriceMinor: d.basePrice,
        prepTimeMinutes: d.prepTimeMinutes,
      },
      create: {
        slug: d.slug,
        name: d.name,
        description: d.description,
        imagePath: d.imagePath,
        category: d.category,
        basePriceMinor: d.basePrice,
        prepTimeMinutes: d.prepTimeMinutes,
      },
    });
    dishMap.set(d.slug, dish);

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

  // ── Demo Users ──
  const demoPasswordHash = await bcrypt.hash('password123', 10);
  const demoUsersData = [
    {
      email: 'demo@vietnamesefood.com',
      name: 'Nguyễn Văn Demo',
      phone: '+84912345678',
      role: UserRole.CUSTOMER,
      nationality: 'Vietnam',
      preferredTasteProfileCode: 'AUTHENTIC_VN',
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
      email: 'staff@vietnamesefood.com',
      name: 'Trần Bếp Trưởng',
      phone: '+84988776655',
      role: UserRole.STAFF,
      nationality: 'Vietnam',
      preferredTasteProfileCode: 'AUTHENTIC_VN',
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
      email: 'tourist@example.com',
      name: 'Kim Min-Jun',
      phone: '+821012345678',
      role: UserRole.CUSTOMER,
      nationality: 'South Korea',
      preferredTasteProfileCode: 'KR_INSPIRED',
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
      email: 'user@example.com',
      name: 'Alex Johnson',
      phone: '+14155552671',
      role: UserRole.CUSTOMER,
      nationality: 'United States',
      preferredTasteProfileCode: 'WESTERN_MILD',
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
      email: 'customer@demo.com',
      name: 'Demo Customer',
      phone: '+84901112233',
      role: UserRole.CUSTOMER,
      nationality: 'Vietnam',
      preferredTasteProfileCode: 'AUTHENTIC_VN',
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
      email: 'staff@demo.com',
      name: 'Demo Staff',
      phone: '+84909998877',
      role: UserRole.STAFF,
      nationality: 'Vietnam',
      preferredTasteProfileCode: 'AUTHENTIC_VN',
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

  const userMap = new Map<string, string>();
  for (const u of demoUsersData) {
    const profileId = profileMap.get(u.preferredTasteProfileCode) ?? null;
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        phone: u.phone,
        passwordHash: demoPasswordHash,
        role: u.role,
        nationality: u.nationality,
        preferredTasteProfileId: profileId,
        tastePreferences: u.tastePreferences,
        dietaryRestrictions: u.dietaryRestrictions,
      },
      create: {
        email: u.email,
        name: u.name,
        phone: u.phone,
        passwordHash: demoPasswordHash,
        role: u.role,
        nationality: u.nationality,
        preferredTasteProfileId: profileId,
        tastePreferences: u.tastePreferences,
        dietaryRestrictions: u.dietaryRestrictions,
      },
    });
    userMap.set(u.email, record.id);
  }

  // ── Sample Orders (idempotent by orderNumber) ──
  const phoBo = dishMap.get('pho-bo');
  const bunCha = dishMap.get('bun-cha');
  const banhMi = dishMap.get('banh-mi');

  if (phoBo && bunCha && banhMi) {
    const sampleOrders = [
      {
        orderNumber: 'VFT-SEED-001',
        idempotencyKey: 'IDEMP-VFT-SEED-001',
        userId: userMap.get('tourist@example.com') ?? null,
        status: OrderStatus.PENDING,
        fulfillmentType: FulfillmentType.DELIVERY,
        paymentStatus: PaymentStatus.UNPAID,
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        customerName: 'Kim Min-Jun',
        customerEmail: 'tourist@example.com',
        customerPhoneHash: hashPhone('+821012345678'),
        customerDialCode: '+82',
        customerCountryCode: 'KR',
        preferredContactChannel: 'WHATSAPP',
        isWhatsAppAvailable: true,
        hotelOrBuildingName: 'Lotte Hotel Hanoi',
        roomOrFloorNumber: '1204',
        deliveryAddress: '54 Liễu Giai, Ba Đình, Hà Nội',
        customerNotes: 'Cho thêm nhiều ớt tươi, gửi lễ tân nếu chưa nghe máy.',
        subtotal: BigInt(130000),
        customizationTotal: BigInt(50000),
        deliveryFee: BigInt(15000),
        discountTotal: BigInt(0),
        total: BigInt(195000),
        currency: 'VND',
        items: [
          {
            dishId: phoBo.id,
            dishNameSnapshot: phoBo.name,
            dishSlugSnapshot: phoBo.slug,
            dishCategorySnapshot: phoBo.category,
            quantity: 2,
            basePriceSnapshot: BigInt(65000),
            customizationPrice: BigInt(25000),
            finalUnitPrice: BigInt(90000),
            lineTotal: BigInt(180000),
            notes: 'Thêm thịt bò tái và ớt tươi kiểu Hàn Quốc',
            tasteCustomizations: [
              {
                attributeCodeSnapshot: 'spice_level',
                attributeNameSnapshot: 'Độ cay (Spiciness)',
                selectedValue: 5,
                customerLabelSnapshot: 'Cay nhiều',
                kitchenInstructionSnapshot: 'Extra hot chili paste',
                priceDeltaSnapshot: BigInt(0),
              },
              {
                attributeCodeSnapshot: 'fish_sauce_intensity',
                attributeNameSnapshot: 'Vị nước mắm (Fish Sauce)',
                selectedValue: 2,
                customerLabelSnapshot: 'Mắm nhẹ',
                kitchenInstructionSnapshot: 'Half fish sauce portion',
                priceDeltaSnapshot: BigInt(0),
              },
            ],
            ingredientCustomizations: [
              {
                ingredientId: ingredientMap.get('BEEF_SLICES') ?? null,
                ingredientNameSnapshot: 'Thịt bò tươi',
                action: 'INCREASED',
                selectedQuantity: 2,
                unit: 'phần',
                priceDeltaSnapshot: BigInt(25000),
                kitchenInstructionSnapshot: 'INCREASED Thịt bò tươi to 2 phần',
              },
              {
                ingredientId: ingredientMap.get('FRESH_CHILI') ?? null,
                ingredientNameSnapshot: 'Ớt tươi thái lát',
                action: 'INCREASED',
                selectedQuantity: 2,
                unit: 'phần',
                priceDeltaSnapshot: BigInt(0),
                kitchenInstructionSnapshot: 'INCREASED Ớt tươi thái lát to 2 phần',
              },
            ],
            substitutions: [],
          },
        ],
        statusHistory: [
          {
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.PENDING,
            actor: 'CUSTOMER',
            reason: 'Khách hàng đặt đơn trực tuyến',
          },
        ],
      },
      {
        orderNumber: 'VFT-SEED-002',
        idempotencyKey: 'IDEMP-VFT-SEED-002',
        userId: userMap.get('user@example.com') ?? null,
        status: OrderStatus.PREPARING,
        fulfillmentType: FulfillmentType.PICKUP,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.MOCK_PAYMENT,
        customerName: 'Alex Johnson',
        customerEmail: 'user@example.com',
        customerPhoneHash: hashPhone('+14155552671'),
        customerDialCode: '+1',
        customerCountryCode: 'US',
        preferredContactChannel: 'PHONE_CALL',
        isWhatsAppAvailable: false,
        hotelOrBuildingName: null,
        roomOrFloorNumber: null,
        deliveryAddress: null,
        customerNotes: 'No cilantro please, vegetarian tofu substitution.',
        subtotal: BigInt(70000),
        customizationTotal: BigInt(-10000),
        deliveryFee: BigInt(0),
        discountTotal: BigInt(0),
        total: BigInt(60000),
        currency: 'VND',
        items: [
          {
            dishId: banhMi.id,
            dishNameSnapshot: banhMi.name,
            dishSlugSnapshot: banhMi.slug,
            dishCategorySnapshot: banhMi.category,
            quantity: 2,
            basePriceSnapshot: BigInt(35000),
            customizationPrice: BigInt(-5000),
            finalUnitPrice: BigInt(30000),
            lineTotal: BigInt(60000),
            notes: 'Không cay, bỏ ngò rí, thay thịt bằng đậu phụ',
            tasteCustomizations: [
              {
                attributeCodeSnapshot: 'spice_level',
                attributeNameSnapshot: 'Độ cay (Spiciness)',
                selectedValue: 0,
                customerLabelSnapshot: 'Không cay',
                kitchenInstructionSnapshot: 'No chili/spicy sauce',
                priceDeltaSnapshot: BigInt(0),
              },
            ],
            ingredientCustomizations: [
              {
                ingredientId: ingredientMap.get('CILANTRO') ?? null,
                ingredientNameSnapshot: 'Ngò gai & rau mùi',
                action: 'REMOVED',
                selectedQuantity: 0,
                unit: 'phần',
                priceDeltaSnapshot: BigInt(0),
                kitchenInstructionSnapshot: 'REMOVED Ngò gai & rau mùi to 0 phần',
              },
            ],
            substitutions: [
              {
                originalIngredientId: ingredientMap.get('PORK_BELLY') ?? null,
                originalIngredientNameSnapshot: 'Thịt heo quay / ba chỉ',
                substituteIngredientNameSnapshot: 'Đậu phụ chiên',
                priceDeltaSnapshot: BigInt(-5000),
                kitchenInstructionSnapshot: 'Thay thịt bằng đậu sốt nấm',
              },
            ],
          },
        ],
        statusHistory: [
          {
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.PENDING,
            actor: 'CUSTOMER',
            reason: 'Đặt đơn mang về',
          },
          {
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.CONFIRMED,
            actor: 'STAFF',
            reason: 'Bếp đã xác nhận đơn',
          },
          {
            fromStatus: OrderStatus.CONFIRMED,
            toStatus: OrderStatus.PREPARING,
            actor: 'STAFF',
            reason: 'Đang nướng bánh và áp chảo đậu phụ',
          },
        ],
      },
      {
        orderNumber: 'VFT-SEED-003',
        idempotencyKey: 'IDEMP-VFT-SEED-003',
        userId: null,
        status: OrderStatus.COMPLETED,
        fulfillmentType: FulfillmentType.DELIVERY,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.MOCK_PAYMENT,
        customerName: 'Kenji Sato',
        customerEmail: null,
        customerPhoneHash: hashPhone('+819012345678'),
        customerDialCode: '+81',
        customerCountryCode: 'JP',
        preferredContactChannel: 'WHATSAPP',
        isWhatsAppAvailable: true,
        hotelOrBuildingName: 'Daewoo Hotel Hanoi',
        roomOrFloorNumber: '812',
        deliveryAddress: '360 Kim Mã, Ba Đình, Hà Nội',
        customerNotes: 'Vị thanh nhẹ, ít chua ngọt.',
        subtotal: BigInt(120000),
        customizationTotal: BigInt(-30000),
        deliveryFee: BigInt(15000),
        discountTotal: BigInt(0),
        total: BigInt(105000),
        currency: 'VND',
        items: [
          {
            dishId: bunCha.id,
            dishNameSnapshot: bunCha.name,
            dishSlugSnapshot: bunCha.slug,
            dishCategorySnapshot: bunCha.category,
            quantity: 2,
            basePriceSnapshot: BigInt(60000),
            customizationPrice: BigInt(-15000),
            finalUnitPrice: BigInt(45000),
            lineTotal: BigInt(90000),
            notes: 'Nước chấm thanh nhẹ chuẩn vị Nhật, thay chả đậu',
            tasteCustomizations: [
              {
                attributeCodeSnapshot: 'sweetness',
                attributeNameSnapshot: 'Độ ngọt (Sweetness)',
                selectedValue: 1,
                customerLabelSnapshot: 'Ngọt thanh nhẹ',
                kitchenInstructionSnapshot: 'Light sweet dipping',
                priceDeltaSnapshot: BigInt(0),
              },
              {
                attributeCodeSnapshot: 'sourness',
                attributeNameSnapshot: 'Độ chua (Sourness)',
                selectedValue: 1,
                customerLabelSnapshot: 'Chua dịu',
                kitchenInstructionSnapshot: 'Mild sour',
                priceDeltaSnapshot: BigInt(0),
              },
            ],
            ingredientCustomizations: [
              {
                ingredientId: ingredientMap.get('FRESH_CHILI') ?? null,
                ingredientNameSnapshot: 'Ớt tươi thái lát',
                action: 'REMOVED',
                selectedQuantity: 0,
                unit: 'đĩa',
                priceDeltaSnapshot: BigInt(0),
                kitchenInstructionSnapshot: 'REMOVED Ớt tươi thái lát to 0 đĩa',
              },
            ],
            substitutions: [
              {
                originalIngredientId: ingredientMap.get('PORK_GRILLED') ?? null,
                originalIngredientNameSnapshot: 'Thịt nướng chả',
                substituteIngredientNameSnapshot: 'Đậu phụ chiên',
                priceDeltaSnapshot: BigInt(-15000),
                kitchenInstructionSnapshot: 'Thay chả nướng bằng chả đậu chiên sốt thơm',
              },
            ],
          },
        ],
        statusHistory: [
          {
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.PENDING,
            actor: 'CUSTOMER',
            reason: 'Khách hàng hoàn tất gửi đơn online',
          },
          {
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.CONFIRMED,
            actor: 'STAFF',
            reason: 'Bếp đã nhận đơn',
          },
          {
            fromStatus: OrderStatus.CONFIRMED,
            toStatus: OrderStatus.PREPARING,
            actor: 'STAFF',
            reason: 'Đang chế biến chả đậu phụ',
          },
          {
            fromStatus: OrderStatus.PREPARING,
            toStatus: OrderStatus.READY,
            actor: 'STAFF',
            reason: 'Đóng gói hoàn tất',
          },
          {
            fromStatus: OrderStatus.READY,
            toStatus: OrderStatus.COMPLETED,
            actor: 'STAFF',
            reason: 'Đã giao hàng thành công',
          },
        ],
      },
      {
        orderNumber: 'VFT-SEED-004',
        idempotencyKey: 'IDEMP-VFT-SEED-004',
        userId: userMap.get('demo@vietnamesefood.com') ?? null,
        status: OrderStatus.READY,
        fulfillmentType: FulfillmentType.PICKUP,
        paymentStatus: PaymentStatus.UNPAID,
        paymentMethod: PaymentMethod.CASH_ON_PICKUP,
        customerName: 'Nguyễn Văn Demo',
        customerEmail: 'demo@vietnamesefood.com',
        customerPhoneHash: hashPhone('+84912345678'),
        customerDialCode: '+84',
        customerCountryCode: 'VN',
        preferredContactChannel: 'PHONE_CALL',
        isWhatsAppAvailable: false,
        hotelOrBuildingName: null,
        roomOrFloorNumber: null,
        deliveryAddress: null,
        customerNotes: 'Chuẩn vị truyền thống Hà Nội.',
        subtotal: BigInt(125000),
        customizationTotal: BigInt(0),
        deliveryFee: BigInt(0),
        discountTotal: BigInt(0),
        total: BigInt(125000),
        currency: 'VND',
        items: [
          {
            dishId: phoBo.id,
            dishNameSnapshot: phoBo.name,
            dishSlugSnapshot: phoBo.slug,
            dishCategorySnapshot: phoBo.category,
            quantity: 1,
            basePriceSnapshot: BigInt(65000),
            customizationPrice: BigInt(0),
            finalUnitPrice: BigInt(65000),
            lineTotal: BigInt(65000),
            notes: 'Đầy đủ rau thơm chuẩn vị',
            tasteCustomizations: [
              {
                attributeCodeSnapshot: 'fish_sauce_intensity',
                attributeNameSnapshot: 'Vị nước mắm (Fish Sauce)',
                selectedValue: 3,
                customerLabelSnapshot: 'Chuẩn vị truyền thống',
                kitchenInstructionSnapshot: 'Standard fish sauce',
                priceDeltaSnapshot: BigInt(0),
              },
              {
                attributeCodeSnapshot: 'herb_intensity',
                attributeNameSnapshot: 'Rau thơm (Herbs)',
                selectedValue: 4,
                customerLabelSnapshot: 'Đầy đủ rau thơm',
                kitchenInstructionSnapshot: 'Full herb set',
                priceDeltaSnapshot: BigInt(0),
              },
            ],
            ingredientCustomizations: [],
            substitutions: [],
          },
          {
            dishId: bunCha.id,
            dishNameSnapshot: bunCha.name,
            dishSlugSnapshot: bunCha.slug,
            dishCategorySnapshot: bunCha.category,
            quantity: 1,
            basePriceSnapshot: BigInt(60000),
            customizationPrice: BigInt(0),
            finalUnitPrice: BigInt(60000),
            lineTotal: BigInt(60000),
            notes: 'Nước chấm vừa vặn',
            tasteCustomizations: [
              {
                attributeCodeSnapshot: 'sweetness',
                attributeNameSnapshot: 'Độ ngọt (Sweetness)',
                selectedValue: 3,
                customerLabelSnapshot: 'Vừa vặn truyền thống',
                kitchenInstructionSnapshot: 'Standard sweet dipping',
                priceDeltaSnapshot: BigInt(0),
              },
            ],
            ingredientCustomizations: [],
            substitutions: [],
          },
        ],
        statusHistory: [
          {
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.PENDING,
            actor: 'CUSTOMER',
            reason: 'Đặt đơn nhận tại quầy',
          },
          {
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.CONFIRMED,
            actor: 'STAFF',
            reason: 'Bếp đã xác nhận đơn',
          },
          {
            fromStatus: OrderStatus.CONFIRMED,
            toStatus: OrderStatus.PREPARING,
            actor: 'STAFF',
            reason: 'Đang chuẩn bị món',
          },
          {
            fromStatus: OrderStatus.PREPARING,
            toStatus: OrderStatus.READY,
            actor: 'STAFF',
            reason: 'Món đã hoàn tất sẵn sàng tại quầy',
          },
        ],
      },
    ];

    for (const ord of sampleOrders) {
      const existing = await prisma.order.findUnique({
        where: { orderNumber: ord.orderNumber },
      });
      if (!existing) {
        await prisma.order.create({
          data: {
            orderNumber: ord.orderNumber,
            idempotencyKey: ord.idempotencyKey,
            userId: ord.userId,
            status: ord.status,
            fulfillmentType: ord.fulfillmentType,
            paymentStatus: ord.paymentStatus,
            paymentMethod: ord.paymentMethod,
            customerName: ord.customerName,
            customerEmail: ord.customerEmail,
            customerPhoneHash: ord.customerPhoneHash,
            customerDialCode: ord.customerDialCode,
            customerCountryCode: ord.customerCountryCode,
            preferredContactChannel: ord.preferredContactChannel,
            isWhatsAppAvailable: ord.isWhatsAppAvailable,
            hotelOrBuildingName: ord.hotelOrBuildingName,
            roomOrFloorNumber: ord.roomOrFloorNumber,
            deliveryAddress: ord.deliveryAddress,
            customerNotes: ord.customerNotes,
            subtotal: ord.subtotal,
            customizationTotal: ord.customizationTotal,
            deliveryFee: ord.deliveryFee,
            discountTotal: ord.discountTotal,
            total: ord.total,
            currency: ord.currency,
            items: {
              create: ord.items.map((item) => ({
                dishId: item.dishId,
                dishNameSnapshot: item.dishNameSnapshot,
                dishSlugSnapshot: item.dishSlugSnapshot,
                dishCategorySnapshot: item.dishCategorySnapshot,
                quantity: item.quantity,
                basePriceSnapshot: item.basePriceSnapshot,
                customizationPrice: item.customizationPrice,
                finalUnitPrice: item.finalUnitPrice,
                lineTotal: item.lineTotal,
                notes: item.notes,
                tasteCustomizations: { create: item.tasteCustomizations },
                ingredientCustomizations: { create: item.ingredientCustomizations },
                substitutions: { create: item.substitutions },
              })),
            },
            statusHistory: {
              create: ord.statusHistory,
            },
          },
        });
      }
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