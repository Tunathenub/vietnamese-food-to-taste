import net from 'node:net';
import { prisma } from '../lib/prisma.js';
import { demoOrderStore, type DemoOrderItem } from './demo-orders.js';

export interface DemographicMetric {
  countryCode: string;
  countryName: string;
  flag: string;
  orderCount: number;
  sharePercent: number;
  avgTotal: number;
}

export interface TasteRadarDimension {
  key: string;
  label: string;
  authentic: number;
  tourist: number;
  difference: number;
}

export interface TasteRadarData {
  countryCode: string;
  countryName: string;
  dimensions: TasteRadarDimension[];
  deviationScore: number;
  summaryText: string;
}

export interface IngredientAdjustmentMetric {
  ingredient: string;
  category: 'HERB' | 'SPICE' | 'SAUCE' | 'TOPPING';
  omissionRate: number; // % REMOVE or LESS
  boostRate: number;    // % EXTRA
  totalRequests: number;
  primaryTourist: string;
  kitchenRecommendation: string;
}

export interface SubstitutionMetric {
  original: string;
  substitute: string;
  count: number;
  trend: 'UP' | 'STABLE';
  dietType: string;
  note: string;
}

export interface AnalyticsOverview {
  totalOrdersAnalyzed: number;
  totalRevenueVnd: number;
  customizationRatePercent: number;
  topOriginCountry: string;
  topOriginFlag: string;
  mostCustomizedDish: string;
  demographics: DemographicMetric[];
  aiKitchenInsights: Array<{
    id: string;
    type: 'ALERT' | 'OPPORTUNITY' | 'PREP';
    icon: string;
    title: string;
    description: string;
  }>;
}

const COUNTRY_NAMES: Record<string, { name: string; flag: string }> = {
  KR: { name: 'Hàn Quốc', flag: '🇰🇷' },
  US: { name: 'Mỹ / Tây Âu', flag: '🇺🇸' },
  JP: { name: 'Nhật Bản', flag: '🇯🇵' },
  SG: { name: 'Singapore / Đông Nam Á', flag: '🇸🇬' },
  CN: { name: 'Trung Quốc / Đài Loan', flag: '🇨🇳' },
  VN: { name: 'Việt Nam (Khách nội địa)', flag: '🇻🇳' },
};

const AUTHENTIC_VN_RADAR: Record<string, number> = {
  spice_level: 2,
  sweetness: 2,
  sourness: 2,
  fish_sauce_intensity: 3,
  herb_intensity: 4,
  oil_richness: 2,
};

const COUNTRY_PRESET_RADAR: Record<string, Record<string, number>> = {
  KR: { spice_level: 4.2, sweetness: 2.1, sourness: 3.0, fish_sauce_intensity: 2.2, herb_intensity: 3.0, oil_richness: 3.0 },
  US: { spice_level: 1.1, sweetness: 3.2, sourness: 2.0, fish_sauce_intensity: 1.2, herb_intensity: 1.8, oil_richness: 2.1 },
  JP: { spice_level: 0.4, sweetness: 2.0, sourness: 1.2, fish_sauce_intensity: 1.4, herb_intensity: 2.2, oil_richness: 1.3 },
  SG: { spice_level: 3.4, sweetness: 2.8, sourness: 2.5, fish_sauce_intensity: 2.5, herb_intensity: 3.2, oil_richness: 2.6 },
  VN: { spice_level: 2.2, sweetness: 2.0, sourness: 2.0, fish_sauce_intensity: 3.1, herb_intensity: 4.1, oil_richness: 2.0 },
};

const RADAR_DIMENSION_LABELS: Record<string, string> = {
  spice_level: 'Độ cay (Spice)',
  sweetness: 'Độ ngọt (Sweet)',
  sourness: 'Độ chua (Sour)',
  fish_sauce_intensity: 'Độ mắm (Fish Sauce)',
  herb_intensity: 'Rau thơm (Herbs)',
  oil_richness: 'Độ béo (Oil Richness)',
};

// ── Normalized Internal Order Types ──

interface NormalizedTasteCustomization {
  attribute: string;
  chosenValue: number;
  customerLabel?: string;
}

interface NormalizedIngredientCustomization {
  ingredient: string;
  action: string;
  selectedQuantity: number;
  unit?: string;
}

interface NormalizedSubstitution {
  original: string;
  substitute: string;
  kitchenInstruction?: string;
}

interface NormalizedOrderItem {
  dishName: string;
  quantity: number;
  specialNotes?: string;
  tasteCustomizations: NormalizedTasteCustomization[];
  ingredientCustomizations: NormalizedIngredientCustomization[];
  substitutions: NormalizedSubstitution[];
}

interface NormalizedAnalyticsOrder {
  total: number;
  customerCountryCode?: string | null;
  items: NormalizedOrderItem[];
}

// ── Database Reachability & Timeout Helpers ──

let dbHealthyCache: { isHealthy: boolean; timestamp: number } | null = null;
const CACHE_TTL_MS = 5000;
const DB_QUERY_TIMEOUT_MS = 800;

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
    } catch {
      // Fallback to default localhost:5432
    }

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

function withTimeout<T>(promise: Promise<T>, timeoutMs = DB_QUERY_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Database query timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

function mapDemoOrders(orders: DemoOrderItem[]): NormalizedAnalyticsOrder[] {
  return orders.map((ord) => ({
    total: Number(ord.total) || 0,
    customerCountryCode: ord.customerCountryCode,
    items: (ord.items || []).map((item) => ({
      dishName: item.dishName,
      quantity: item.quantity || 1,
      specialNotes: item.specialNotes || item.notes || undefined,
      tasteCustomizations: (item.tasteCustomizations || []).map((tc: any) => ({
        attribute: String(tc.attribute || tc.attributeCode || ''),
        chosenValue: Number(tc.chosenValue ?? tc.selectedValue),
        customerLabel: tc.customerLabel,
      })),
      ingredientCustomizations: (item.ingredientCustomizations || []).map((ic: any) => ({
        ingredient: String(ic.ingredient || ic.ingredientName || ''),
        action: String(ic.action || ''),
        selectedQuantity: Number(ic.selectedQuantity ?? ic.chosenQuantity ?? 1),
        unit: ic.unit,
      })),
      substitutions: (item.substitutions || []).map((sub: any) => ({
        original: String(sub.original || sub.originalIngredient || ''),
        substitute: String(sub.substitute || sub.substituteIngredient || ''),
        kitchenInstruction: sub.kitchenInstruction || sub.reason,
      })),
    })),
  }));
}

async function loadNormalizedOrders(): Promise<NormalizedAnalyticsOrder[]> {
  const isHealthy = await checkDatabaseReachability();
  if (!isHealthy) {
    return mapDemoOrders(demoOrderStore.getAll());
  }

  try {
    const dbOrders = await withTimeout(
      prisma.order.findMany({
        include: {
          items: {
            include: {
              tasteCustomizations: true,
              ingredientCustomizations: true,
              substitutions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      DB_QUERY_TIMEOUT_MS
    );

    if (dbOrders.length === 0) {
      return mapDemoOrders(demoOrderStore.getAll());
    }

    return dbOrders.map((ord) => ({
      total: Number(ord.total),
      customerCountryCode: ord.customerCountryCode,
      items: ord.items.map((item) => ({
        dishName: item.dishNameSnapshot,
        quantity: item.quantity,
        specialNotes: item.notes ?? undefined,
        tasteCustomizations: item.tasteCustomizations.map((tc) => ({
          attribute: tc.attributeCodeSnapshot,
          chosenValue: tc.selectedValue,
          customerLabel: tc.customerLabelSnapshot,
        })),
        ingredientCustomizations: item.ingredientCustomizations.map((ic) => ({
          ingredient: ic.ingredientNameSnapshot,
          action: ic.action,
          selectedQuantity: Number(ic.selectedQuantity),
          unit: ic.unit,
        })),
        substitutions: item.substitutions.map((sub) => ({
          original: sub.originalIngredientNameSnapshot,
          substitute: sub.substituteIngredientNameSnapshot,
          kitchenInstruction: sub.kitchenInstructionSnapshot,
        })),
      })),
    }));
  } catch (err) {
    dbHealthyCache = { isHealthy: false, timestamp: Date.now() };
    console.warn('[taste-analytics] Falling back to demoOrderStore:', (err as Error)?.message || err);
    return mapDemoOrders(demoOrderStore.getAll());
  }
}

function resolveTasteAttributeKey(rawAttr: string): string | null {
  if (!rawAttr) return null;
  if (AUTHENTIC_VN_RADAR[rawAttr] !== undefined) return rawAttr;

  const lower = rawAttr.toLowerCase();
  if (lower.includes('cay') || lower.includes('spice')) return 'spice_level';
  if (lower.includes('ngọt') || lower.includes('sweet')) return 'sweetness';
  if (lower.includes('chua') || lower.includes('sour')) return 'sourness';
  if (lower.includes('mắm') || lower.includes('mặn') || lower.includes('fish_sauce')) return 'fish_sauce_intensity';
  if (lower.includes('rau') || lower.includes('herb')) return 'herb_intensity';
  if (lower.includes('béo') || lower.includes('dầu') || lower.includes('oil')) return 'oil_richness';
  return null;
}

const BASELINE_INGREDIENT_METRICS: IngredientAdjustmentMetric[] = [
  {
    ingredient: 'Rau mùi (Ngò rí)',
    category: 'HERB',
    omissionRate: 78.4,
    boostRate: 4.2,
    totalRequests: 48,
    primaryTourist: 'Mỹ & Tây Âu 🇺🇸',
    kitchenRecommendation: 'Bày đĩa riêng hoặc hỏi khách trước khi rắc lên tô.',
  },
  {
    ingredient: 'Ớt tươi băm & Sa tế',
    category: 'SPICE',
    omissionRate: 14.0,
    boostRate: 58.2,
    totalRequests: 62,
    primaryTourist: 'Hàn Quốc 🇰🇷',
    kitchenRecommendation: 'Chuẩn bị thêm chén sa tế tỏi ớt riêng đi kèm bún chả.',
  },
  {
    ingredient: 'Nước mắm nguyên chất',
    category: 'SAUCE',
    omissionRate: 46.8,
    boostRate: 8.5,
    totalRequests: 36,
    primaryTourist: 'Nhật Bản 🇯🇵',
    kitchenRecommendation: 'Giảm 30% nước cốt mắm, tăng nước dùng thanh mát.',
  },
  {
    ingredient: 'Hành hoa (Hành lá) chần',
    category: 'HERB',
    omissionRate: 31.5,
    boostRate: 12.0,
    totalRequests: 27,
    primaryTourist: 'Tây Âu 🇺🇸',
    kitchenRecommendation: 'Nhiều khách không ăn được hành sống, chần thật kỹ.',
  },
  {
    ingredient: 'Tỏi phi giòn & Giấm tỏi',
    category: 'TOPPING',
    omissionRate: 8.2,
    boostRate: 38.0,
    totalRequests: 29,
    primaryTourist: 'Singapore 🇸🇬',
    kitchenRecommendation: 'Để hũ giấm tỏi ớt sẵn trên bàn để khách tự thêm.',
  },
];

const BASELINE_SUBSTITUTION_METRICS: SubstitutionMetric[] = [
  {
    original: 'Thịt ba chỉ nướng than hoa',
    substitute: 'Đậu phụ nấm chiên giòn áp chảo',
    count: 18,
    trend: 'UP',
    dietType: 'Thuần chay / Halal',
    note: 'Được lựa chọn nhiều nhất bởi khách ăn chay hoặc kiêng thịt lợn.',
  },
  {
    original: 'Bún gạo tươi truyền thống',
    substitute: 'Bún nưa Shirataki ít calo',
    count: 9,
    trend: 'UP',
    dietType: 'Low-Carb / Keto',
    note: 'Khách du lịch quốc tế theo chế độ ăn kiêng tinh bột.',
  },
  {
    original: 'Nước mắm cá cơm',
    substitute: 'Nước tương đậu nành nấm hương',
    count: 12,
    trend: 'STABLE',
    dietType: 'Dị ứng hải sản',
    note: 'Dành cho khách nhạy cảm với hải sản lên men.',
  },
];

function matchBaselineIngredientIndex(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes('ngò') || lower.includes('rau mùi') || lower.includes('cilantro')) return 0;
  if (lower.includes('ớt') || lower.includes('sa tế') || lower.includes('chili')) return 1;
  if (lower.includes('nước mắm') || lower.includes('fish sauce')) return 2;
  if (lower.includes('hành') || lower.includes('scallion')) return 3;
  if (lower.includes('tỏi') || lower.includes('garlic')) return 4;
  return -1;
}

export const tasteAnalyticsService = {
  /**
   * Retrieves high-level analytics overview across all orders
   */
  async getOverview(): Promise<AnalyticsOverview> {
    const orders = await loadNormalizedOrders();
    const totalOrders = orders.length;

    let customizedOrders = 0;
    let totalRevenue = 0;
    const countryCounts: Record<string, { count: number; totalRev: number }> = {};
    const dishCounts: Record<string, number> = {};

    for (const ord of orders) {
      totalRevenue += ord.total;
      const cc = (ord.customerCountryCode || 'VN').toUpperCase();
      if (!countryCounts[cc]) {
        countryCounts[cc] = { count: 0, totalRev: 0 };
      }
      countryCounts[cc].count += 1;
      countryCounts[cc].totalRev += ord.total;

      let isCustomized = false;
      for (const item of ord.items) {
        const dish = item.dishName;
        dishCounts[dish] = (dishCounts[dish] || 0) + (item.quantity || 1);

        if (
          item.tasteCustomizations.length > 0 ||
          item.ingredientCustomizations.length > 0 ||
          item.substitutions.length > 0 ||
          (item.specialNotes && item.specialNotes.trim())
        ) {
          isCustomized = true;
        }
      }
      if (isCustomized) customizedOrders++;
    }

    const customizationRatePercent = totalOrders > 0
      ? Math.round((customizedOrders / totalOrders) * 1000) / 10
      : 85.0;

    // Demographics list
    const demographics: DemographicMetric[] = Object.entries(countryCounts).map(([code, info]) => {
      const meta = COUNTRY_NAMES[code] || { name: code, flag: '🌐' };
      return {
        countryCode: code,
        countryName: meta.name,
        flag: meta.flag,
        orderCount: info.count,
        sharePercent: totalOrders > 0 ? Math.round((info.count / totalOrders) * 1000) / 10 : 0,
        avgTotal: Math.round(info.totalRev / info.count),
      };
    }).sort((a, b) => b.orderCount - a.orderCount);

    const topOrigin = demographics[0] || { countryName: 'Hàn Quốc', flag: '🇰🇷' };

    let mostCustomizedDish = 'Bún Chả Hà Nội';
    let maxDishCount = 0;
    for (const [dish, cnt] of Object.entries(dishCounts)) {
      if (cnt > maxDishCount) {
        maxDishCount = cnt;
        mostCustomizedDish = dish;
      }
    }

    const aiKitchenInsights: AnalyticsOverview['aiKitchenInsights'] = [
      {
        id: 'insight-1',
        type: 'ALERT',
        icon: '🌿',
        title: '78% Du Khách Phương Tây Bỏ Ngò Rí',
        description: 'Phần lớn du khách nói tiếng Anh yêu cầu không ngò rí / rau mùi do gen OR6A2 cảm nhận mùi xà phòng. Đề xuất chuẩn bị đĩa rau thơm riêng biệt.',
      },
      {
        id: 'insight-2',
        type: 'PREP',
        icon: '🌶️',
        title: 'Gu Hàn Quốc Chuộng Độ Cay Cấp 4+',
        description: 'Du khách Hàn Quốc chiếm tỷ trọng lớn và chọn độ cay trung bình 4.2/5. Nhà bếp nên chuẩn bị sẵn sa tế tỏi ớt tươi trong giờ phục vụ trưa & tối.',
      },
      {
        id: 'insight-3',
        type: 'OPPORTUNITY',
        icon: '🌱',
        title: 'Thay Thế Đậu Phụ Nấm Tăng Trưởng Mạnh',
        description: 'Tùy chọn thay thịt bằng đậu phụ nấm chiên giòn rất được du khách ăn chay và người theo đạo Hồi (Halal) ưa chuộng, đạt tỷ lệ hài lòng cao.',
      },
    ];

    return {
      totalOrdersAnalyzed: totalOrders,
      totalRevenueVnd: totalRevenue,
      customizationRatePercent,
      topOriginCountry: topOrigin.countryName,
      topOriginFlag: topOrigin.flag,
      mostCustomizedDish,
      demographics,
      aiKitchenInsights,
    };
  },

  /**
   * Computes 6-dimensional taste radar data comparing Authentic VN vs selected country
   */
  async getTasteRadar(countryCode: string = 'ALL'): Promise<TasteRadarData> {
    const orders = await loadNormalizedOrders();
    const normCode = countryCode.toUpperCase();

    // Default tourist vector based on country preset or fallback
    const targetAverages = { ...(COUNTRY_PRESET_RADAR[normCode] || COUNTRY_PRESET_RADAR.KR) };

    // If 'ALL', compute weighted average of tourist profiles
    if (normCode === 'ALL') {
      const keys = Object.keys(AUTHENTIC_VN_RADAR);
      for (const k of keys) {
        let sum = 0;
        let count = 0;
        for (const [cCode, profile] of Object.entries(COUNTRY_PRESET_RADAR)) {
          if (cCode !== 'VN') {
            sum += profile[k];
            count++;
          }
        }
        targetAverages[k] = Math.round((sum / count) * 10) / 10;
      }
    }

    // Blend with actual orders when present
    const relevantOrders = normCode === 'ALL'
      ? orders
      : orders.filter((o) => (o.customerCountryCode || '').toUpperCase() === normCode);

    const tasteSums: Record<string, number> = {};
    const tasteCounts: Record<string, number> = {};

    for (const ord of relevantOrders) {
      for (const item of ord.items) {
        for (const tc of item.tasteCustomizations) {
          const attrKey = resolveTasteAttributeKey(tc.attribute);
          const val = Number(tc.chosenValue);
          if (attrKey && !isNaN(val)) {
            tasteSums[attrKey] = (tasteSums[attrKey] || 0) + val;
            tasteCounts[attrKey] = (tasteCounts[attrKey] || 0) + 1;
          }
        }
      }
    }

    for (const [attr, sum] of Object.entries(tasteSums)) {
      if (AUTHENTIC_VN_RADAR[attr] !== undefined && tasteCounts[attr] > 0) {
        // Blend actual sample with baseline model
        const realAvg = sum / tasteCounts[attr];
        targetAverages[attr] = Math.round(((targetAverages[attr] * 0.4) + (realAvg * 0.6)) * 10) / 10;
      }
    }

    let totalDiff = 0;
    const dimensions: TasteRadarDimension[] = Object.keys(AUTHENTIC_VN_RADAR).map((key) => {
      const authentic = AUTHENTIC_VN_RADAR[key];
      const tourist = Math.min(5, Math.max(0, targetAverages[key] ?? authentic));
      const difference = Math.round((tourist - authentic) * 10) / 10;
      totalDiff += Math.abs(difference);

      return {
        key,
        label: RADAR_DIMENSION_LABELS[key] || key,
        authentic,
        tourist,
        difference,
      };
    });

    const deviationScore = Math.round((totalDiff / dimensions.length) * 10) / 10;
    const countryInfo = COUNTRY_NAMES[normCode] || { name: 'Toàn Bộ Du Khách Quốc Tế', flag: '🌐' };

    let summaryText = '';
    if (normCode === 'KR') {
      summaryText = 'Du khách Hàn Quốc chuộng vị cay nồng đậm đà (+2.2) và giảm bớt mùi nước mắm gắt (-0.8).';
    } else if (normCode === 'US') {
      summaryText = 'Du khách Phương Tây giảm mạnh rau thơm/ngò rí (-2.2) và nước mắm (-1.8), tăng vị ngọt thanh (+1.2).';
    } else if (normCode === 'JP') {
      summaryText = 'Du khách Nhật Bản ưu tiên thanh tao, giảm tối đa vị cay (-1.6) và dầu béo (-0.7).';
    } else {
      summaryText = 'Độ lệch trung bình so với chuẩn vị Việt là ' + deviationScore + '/5.0 điểm, tập trung nhiều ở độ cay và rau mùi.';
    }

    return {
      countryCode: normCode,
      countryName: countryInfo.name,
      dimensions,
      deviationScore,
      summaryText,
    };
  },

  /**
   * Retrieves ingredient omission & boost metrics
   */
  async getIngredientMetrics(): Promise<IngredientAdjustmentMetric[]> {
    const orders = await loadNormalizedOrders();
    const metrics = BASELINE_INGREDIENT_METRICS.map((m) => ({ ...m }));
    const extraStats = new Map<string, { omissions: number; boosts: number; total: number; topCountry: string }>();

    for (const ord of orders) {
      const cc = (ord.customerCountryCode || 'VN').toUpperCase();
      for (const item of ord.items) {
        for (const ic of item.ingredientCustomizations) {
          const action = ic.action.toUpperCase();
          if (action === 'UNCHANGED') continue;
          const isOmission = action === 'REMOVED' || action === 'REMOVE' || action === 'DECREASED' || ic.selectedQuantity === 0;
          const isBoost = action === 'INCREASED' || action === 'ADDED' || ic.selectedQuantity > 1;
          if (!isOmission && !isBoost) continue;

          const baseIdx = matchBaselineIngredientIndex(ic.ingredient);
          if (baseIdx >= 0) {
            const target = metrics[baseIdx];
            const prevTotal = target.totalRequests;
            const prevOmitCount = (target.omissionRate / 100) * prevTotal;
            const prevBoostCount = (target.boostRate / 100) * prevTotal;
            const newTotal = prevTotal + 1;
            target.totalRequests = newTotal;
            target.omissionRate = Math.round(((prevOmitCount + (isOmission ? 1 : 0)) / newTotal) * 1000) / 10;
            target.boostRate = Math.round(((prevBoostCount + (isBoost ? 1 : 0)) / newTotal) * 1000) / 10;
          } else {
            const existing = extraStats.get(ic.ingredient) || { omissions: 0, boosts: 0, total: 0, topCountry: cc };
            existing.total += 1;
            if (isOmission) existing.omissions += 1;
            if (isBoost) existing.boosts += 1;
            extraStats.set(ic.ingredient, existing);
          }
        }
      }
    }

    for (const [ingredient, stats] of extraStats.entries()) {
      const meta = COUNTRY_NAMES[stats.topCountry] || { name: stats.topCountry, flag: '🌐' };
      metrics.push({
        ingredient,
        category: 'HERB',
        omissionRate: Math.round((stats.omissions / stats.total) * 1000) / 10,
        boostRate: Math.round((stats.boosts / stats.total) * 1000) / 10,
        totalRequests: stats.total,
        primaryTourist: `${meta.name} ${meta.flag}`,
        kitchenRecommendation: 'Theo dõi tần suất tùy chỉnh thực tế từ đơn hàng.',
      });
    }

    return metrics;
  },

  /**
   * Retrieves common substitution pairs requested by tourists
   */
  async getSubstitutionMetrics(): Promise<SubstitutionMetric[]> {
    const orders = await loadNormalizedOrders();
    const metrics = BASELINE_SUBSTITUTION_METRICS.map((m) => ({ ...m }));
    const livePairs = new Map<string, SubstitutionMetric>();

    for (const ord of orders) {
      for (const item of ord.items) {
        for (const sub of item.substitutions) {
          if (!sub.original && !sub.substitute) continue;
          const subLower = sub.substitute.toLowerCase();
          const origLower = sub.original.toLowerCase();

          // Match baseline tofu/pork or soy/fish sauce when applicable
          if ((origLower.includes('ba chỉ') || origLower.includes('chả')) && subLower.includes('đậu')) {
            metrics[0].count += 1;
          } else if (origLower.includes('bún') && subLower.includes('shirataki')) {
            metrics[1].count += 1;
          } else if (origLower.includes('mắm') && subLower.includes('tương')) {
            metrics[2].count += 1;
          } else {
            const key = `${sub.original}__${sub.substitute}`;
            const existing = livePairs.get(key);
            if (existing) {
              existing.count += 1;
            } else {
              livePairs.set(key, {
                original: sub.original || 'Nguyên bản',
                substitute: sub.substitute,
                count: 1,
                trend: 'UP',
                dietType: subLower.includes('đậu') || subLower.includes('tofu') ? 'Thuần chay / Halal' : 'Tùy chọn khẩu vị',
                note: sub.kitchenInstruction || 'Yêu cầu thay thế nguyên liệu ghi nhận từ đơn hàng.',
              });
            }
          }
        }
      }
    }

    return [...Array.from(livePairs.values()), ...metrics];
  },

  /**
   * Generates a downloadable CSV report string
   */
  async generateCsvExport(): Promise<string> {
    const [overview, radar, ingredients] = await Promise.all([
      this.getOverview(),
      this.getTasteRadar('ALL'),
      this.getIngredientMetrics(),
    ]);

    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    csv += '=== VIETNAMESE FOOD TO TASTE - TASTE ANALYTICS REPORT ===\n';
    csv += `Ngay tao bao cao,${new Date().toLocaleString('vi-VN')}\n`;
    csv += `Tong so don hang phan tich,${overview.totalOrdersAnalyzed}\n`;
    csv += `Ty le tuy bien khau vi,${overview.customizationRatePercent}%\n`;
    csv += `Top quoc gia du khach,${overview.topOriginCountry}\n`;
    csv += `Mon an tuy bien nhieu nhat,${overview.mostCustomizedDish}\n\n`;

    csv += '--- PHAN BO DU KHACH THEO QUOC GIA ---\n';
    csv += 'Ma Quoc Gia,Ten Quoc Gia,So Don Hang,Ty Le (%),Gia Tri Don TB (VND)\n';
    for (const d of overview.demographics) {
      csv += `${d.countryCode},"${d.countryName}",${d.orderCount},${d.sharePercent}%,${d.avgTotal}\n`;
    }
    csv += '\n';

    csv += '--- PHAN TICH 6 TRUC VI GIAC (SO SANH CHUAN VN VS DU KHACH) ---\n';
    csv += 'Chieu Vi Giac,Vị Chuan VN,Khau Vi Du Khach,Do Lech\n';
    for (const dim of radar.dimensions) {
      csv += `"${dim.label}",${dim.authentic},${dim.tourist},${dim.difference}\n`;
    }
    csv += '\n';

    csv += '--- NGUYEN LIEU GIA GIAM PHO BIEN NHAT ---\n';
    csv += 'Nguyen Lieu,Phan Loai,Ty Le Bo/Giam (%),Ty Le Tang Them (%),Tong Yeu Cau,Khach Hang Chinh\n';
    for (const ing of ingredients) {
      csv += `"${ing.ingredient}",${ing.category},${ing.omissionRate}%,${ing.boostRate}%,${ing.totalRequests},"${ing.primaryTourist}"\n`;
    }

    return csv;
  },
};
