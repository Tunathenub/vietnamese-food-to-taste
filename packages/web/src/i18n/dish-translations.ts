import { SupportedLanguage } from './types';

export interface LocalizedDishContent {
  name: string;
  shortDescription: string;
}

export const DISH_LOCALIZATION: Record<string, Record<SupportedLanguage, LocalizedDishContent>> = {
  'pho-bo': {
    vi: {
      name: 'Phở Bò Hà Nội',
      shortDescription: 'Bánh phở mềm cùng nước dùng hầm xương bò 12 tiếng thơm thảo mộc quế hồi.',
    },
    en: {
      name: 'Hanoi Beef Pho (Phở Bò)',
      shortDescription: '12-hour simmered beef bone broth with delicate star anise, cinnamon & tender beef cuts.',
    },
    ko: {
      name: '하노이 소고기 쌀국수 (포보)',
      shortDescription: '12시간 동안 우려낸 깊은 소고기 육수에 계피와 팔각 향이 어우러진 전통 쌀국수.',
    },
    ja: {
      name: 'ハノイ牛フォー (Pho Bo)',
      shortDescription: '12時間じっくり煮込んだ牛骨スープにスパイスが香る、伝統的なハノイの米麺。',
    },
    zh: {
      name: '河内经典牛肉粉 (Pho Bo)',
      shortDescription: '牛骨慢火慢炖12小时浓香高汤，搭配肉桂八角与鲜美牛肉切片。',
    },
  },
  'bun-cha': {
    vi: {
      name: 'Bún Chả Hà Nội',
      shortDescription: 'Thịt heo nướng than hoa thơm lừng ăn kèm bún tươi và nước chấm chua ngọt.',
    },
    en: {
      name: 'Hanoi Grilled Pork Bun Cha (Bún Chả)',
      shortDescription: 'Charcoal-grilled savory pork patties served with fresh vermicelli and sweet-tangy dipping broth.',
    },
    ko: {
      name: '하노이 분짜 (숯불 돼지고기 쌀국수)',
      shortDescription: '숯불 향 가득한 돼지고기 완자를 새콤달콤한 느억맘 소스에 찍어 먹는 하노이 대표 요리.',
    },
    ja: {
      name: 'ハノイ・ブンチャー (炭火焼き豚肉つけ麺)',
      shortDescription: '炭火で香ばしく焼いた豚肉と肉団子を、甘酸っぱい特製タレにつけて食べる米麺。',
    },
    zh: {
      name: '河内烤肉米线 (Bun Cha)',
      shortDescription: '炭火现烤猪肉饼与五花肉，配以爽滑鲜米线与酸甜开胃蘸汁。',
    },
  },
  'banh-mi': {
    vi: {
      name: 'Bánh Mì Kẹp Đặc Biệt',
      shortDescription: 'Vỏ bánh giòn rụm kẹp pate béo ngậy, thịt xá xíu, đồ chua giòn và sốt ớt thơm.',
    },
    en: {
      name: 'Special Crispy Banh Mi (Bánh Mì)',
      shortDescription: 'Warm crispy Vietnamese baguette stuffed with rich pate, roast pork, pickled daikon & herbs.',
    },
    ko: {
      name: '반미 스페셜 샌드위치 (Banh Mi)',
      shortDescription: '바삭한 바게트 속에 고소한 파테, 차슈, 새콤한 무당근절임과 칠리소스가 가득한 샌드위치.',
    },
    ja: {
      name: '特製ベトナム風サンドイッチ (Banh Mi)',
      shortDescription: '外はサクサク、中はふんわりのフランスパンにレバーパテ、チャーシュー、なますをサンド。',
    },
    zh: {
      name: '招牌越式法包 (Banh Mi)',
      shortDescription: '外皮金黄酥脆的法棍，内夹浓香肉酱、叉烧肉、爽脆酸萝卜与秘制酱料。',
    },
  },
  'goi-cuon': {
    vi: {
      name: 'Gỏi Cuốn Tôm Thịt',
      shortDescription: 'Bánh tráng dẻo cuốn tôm tươi, thịt ba chỉ, bún và rau thơm, chấm sốt tương đậu phộng.',
    },
    en: {
      name: 'Fresh Spring Rolls (Gỏi Cuốn)',
      shortDescription: 'Translucent rice paper rolled with fresh shrimp, pork, herbs & vermicelli, served with rich peanut sauce.',
    },
    ko: {
      name: '새우 돼지고기 스프링롤 (월남쌈)',
      shortDescription: '신선한 새우, 삶은 돼지고기, 야채를 라이스페이퍼로 감싼 건강한 요리 (땅콩 소스 제공).',
    },
    ja: {
      name: 'エビと豚肉の生春巻き (Goi Cuon)',
      shortDescription: 'ぷりぷりのエビと豚肉、新鮮なハーブをライスペーパーで巻いた定番人気メニュー。',
    },
    zh: {
      name: '鲜虾猪肉越南春卷 (Goi Cuon)',
      shortDescription: '薄韧米纸包裹鲜甜大虾、薄切五花肉与新鲜香草，佐以特调花生酱。',
    },
  },
  'com-tam': {
    vi: {
      name: 'Cơm Tấm Sườn Bì Chả',
      shortDescription: 'Hạt gạo tấm dẻo thơm ăn cùng sườn cốt lết nướng mật ong, bì sợi và chả trứng hấp.',
    },
    en: {
      name: 'Saigon Broken Rice with Pork Chop (Cơm Tấm)',
      shortDescription: 'Fragrant broken rice topped with honey-marinated grilled pork chop, shredded pork skin & egg meatloaf.',
    },
    ko: {
      name: '사이공 껌땀 (숯불 돼지갈비 덮밥)',
      shortDescription: '달콤짭조름한 숯불 돼지갈비와 계란찜, 으깬 쌀밥이 어우러진 호치민 대표 덮밥.',
    },
    ja: {
      name: 'サイゴン風 砕き米豚肉ご飯 (Com Tam)',
      shortDescription: '秘伝のタレに漬け込んだ豚肉の炭火焼きと蒸し卵を、香ばしい砕き米と一緒に。',
    },
    zh: {
      name: '西贡碎米烤猪排饭 (Com Tam)',
      shortDescription: '蜜汁炭烤猪排搭配蒸蛋肉饼与香脆碎米饭，胡志明市经典代表美食。',
    },
  },
  'bun-bo-hue': {
    vi: {
      name: 'Bún Bò Huế Cố Đô',
      shortDescription: 'Sợi bún to đậm đà trong nước dùng cay nồng hương sả, mắm ruốc và thịt bò bắp hoa.',
    },
    en: {
      name: 'Hue Spicy Beef Noodle Soup (Bún Bò Huế)',
      shortDescription: 'Thick vermicelli noodles in a rich, spicy lemongrass & fermented shrimp broth with tender beef shank.',
    },
    ko: {
      name: '후에 매운 소고기 쌀국수 (분보후에)',
      shortDescription: '레몬글라스와 발효 소스의 깊은 감칠맛, 얼큰하고 진한 국물이 매력적인 후에식 쌀국수.',
    },
    ja: {
      name: 'フエ名物 ピリ辛牛肉麺 (Bun Bo Hue)',
      shortDescription: 'レモングラスと海老だしの香りが食欲をそそる、フエ伝統のピリ辛太麺スープ。',
    },
    zh: {
      name: '顺化香辣牛肉米粉 (Bun Bo Hue)',
      shortDescription: '浓郁香茅与顺化特色鲜香辣汤底，搭配粗米粉与牛腱肉，回味悠长。',
    },
  },
};

export function getLocalizedDish(
  slug: string,
  fallbackName: string,
  fallbackDescription: string | undefined,
  language: SupportedLanguage
): LocalizedDishContent {
  const entry = DISH_LOCALIZATION[slug];
  if (entry && entry[language]) {
    return entry[language];
  }
  return {
    name: fallbackName,
    shortDescription: fallbackDescription || '',
  };
}
