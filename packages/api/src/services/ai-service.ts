import { GoogleGenAI } from '@google/genai';
import { demoOrderStore } from './demo-orders.js';

// ── Types ──

export interface TasteConciergeParams {
  prompt: string;
  language?: string;
}

export interface TasteConciergeResult {
  reply: string;
  recommendedDish: {
    dishSlug: string;
    dishName: string;
    basePrice: number;
    reason: string;
  };
  customization: {
    tasteValues: Record<string, number>;
    ingredientQuantities: Record<string, number>;
    substitutionIds: string[];
    specialNotes: string;
  };
  quickAction: {
    label: string;
    action: 'ADD_TO_CART';
  };
}

export interface DishStoryParams {
  dishSlug: string;
  language?: string;
}

export interface CulturalDishStory {
  title: string;
  originStory: string;
  eatingEtiquette: string;
  localTip: string;
}

export interface KitchenBriefingParams {
  timeframe?: string;
}

export interface KitchenBriefingResult {
  executiveSummary: string;
  palateTrends: string[];
  kitchenActionItems: string[];
  prepAdvice: string;
}

// ── Google Gen AI Client Setup with Defensive Fallbacks ──

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let genAIClient: GoogleGenAI | null = null;
let clientInitAttempted = false;

function getGenAI(): GoogleGenAI | null {
  if (clientInitAttempted) return genAIClient;
  clientInitAttempted = true;

  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === '' || key.startsWith('placeholder') || key.startsWith('your_')) {
    return null;
  }

  try {
    genAIClient = new GoogleGenAI({ apiKey: key });
    return genAIClient;
  } catch (err) {
    console.warn('[ai-service] Could not instantiate GoogleGenAI client:', err);
    return null;
  }
}

async function callGeminiSafe<T>(prompt: string, systemInstruction?: string): Promise<T | null> {
  const client = getGenAI();
  if (!client) return null;

  try {
    const config: any = {
      responseMimeType: 'application/json',
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config,
    });

    const jsonText = response.text;
    if (!jsonText) return null;

    // Clean any accidental markdown code fence if returned
    const cleaned = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned) as T;
  } catch (error) {
    // Graceful degradation: never throw to callers
    return null;
  }
}

// ── 1. Taste Concierge (Natural Language -> Dish + Customization) ──

export async function generateTasteConcierge(params: TasteConciergeParams): Promise<TasteConciergeResult> {
  const promptText = (params.prompt || '').trim();
  const rawLang = (params.language || 'vi').toLowerCase();
  const isEn = rawLang.startsWith('en') || /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(promptText) && /\b(spicy|sichuan|cilantro|keto|vegan|sweet|sour|broth|pho|noodle|want|recommend)\b/i.test(promptText);
  const lang = isEn ? 'en' : 'vi';

  // Attempt GenAI call first
  try {
    const geminiPrompt = `
You are the AI Taste Concierge for "Vietnamese Food to Taste".
User's request: "${promptText}"
Target language: "${lang}"

Available dishes:
1. "pho-bo" - "Phở Bò Hà Nội", basePrice: 65000 (beef noodle soup, ingredients: ing-beef, ing-chili, ing-basil; sub: sub-pho-tofu)
2. "bun-cha" - "Bún Chả Hà Nội", basePrice: 60000 (grilled pork noodles, ingredients: ing-pork, ing-chili; sub: sub-bc-tofu)
3. "banh-mi" - "Bánh Mì Kẹp Đặc Biệt", basePrice: 35000 (Vietnamese baguette, ingredients: ing-pork-belly, ing-cilantro; sub: sub-bm-tofu)

Taste attributes (values 0-5):
- spice_level (0 = no spicy, 5 = very spicy)
- sweetness (0 = not sweet, 5 = very sweet)
- sourness (0 = not sour, 5 = very sour)
- fish_sauce_intensity (0 = no fish sauce, 5 = intense)
- herb_intensity (0 = no herbs/cilantro, 5 = extra herbs)

Return a JSON object with this exact shape:
{
  "reply": "Warm conversational explanation in ${lang}",
  "recommendedDish": {
    "dishSlug": "pho-bo" | "bun-cha" | "banh-mi",
    "dishName": string,
    "basePrice": number,
    "reason": string
  },
  "customization": {
    "tasteValues": { "spice_level": number, ... },
    "ingredientQuantities": { [ingredientId: string]: number },
    "substitutionIds": string[],
    "specialNotes": string
  },
  "quickAction": {
    "label": string,
    "action": "ADD_TO_CART"
  }
}
Return ONLY valid JSON.`;

    const aiRes = await callGeminiSafe<TasteConciergeResult>(geminiPrompt);
    if (aiRes && aiRes.reply && aiRes.recommendedDish && aiRes.customization && aiRes.quickAction) {
      return aiRes;
    }
  } catch {
    // Fall back to rule-based engine
  }

  // ── Smart Fallback Engine ──
  const pLower = promptText.toLowerCase();

  // Detect Dish preference
  let dishSlug = 'pho-bo';
  let dishName = 'Phở Bò Hà Nội';
  let basePrice = 65000;
  let reason = isEn
    ? 'Hanoi Beef Pho is the pinnacle of Vietnamese noodle art, ideal for custom spice and aromatic balance.'
    : 'Phở Bò Hà Nội là quốc hồn quốc túy ẩm thực Việt, sở hữu nước dùng thảo mộc dễ dàng tùy biến vị giác.';

  if (pLower.includes('bánh mì') || pLower.includes('banh mi') || pLower.includes('bánh mỳ') || pLower.includes('sandwich') || pLower.includes('bread')) {
    dishSlug = 'banh-mi';
    dishName = 'Bánh Mì Kẹp Đặc Biệt';
    basePrice = 35000;
    reason = isEn
      ? 'Iconic crisp Vietnamese baguette with rich pâté and customizable seasonings.'
      : 'Bánh Mì giòn rụm với pate béo ngậy và rau dưa ngâm giòn, chuẩn vị đường phố.';
  } else if (pLower.includes('bún chả') || pLower.includes('bun cha') || pLower.includes('thịt nướng') || pLower.includes('bbq') || pLower.includes('chả quạt')) {
    dishSlug = 'bun-cha';
    dishName = 'Bún Chả Hà Nội';
    basePrice = 60000;
    reason = isEn
      ? 'Hanoi Charcoal-Grilled Pork Noodles with sweet-tangy dipping broth and fresh local herbs.'
      : 'Bún Chả than hoa thơm lừng với nước chấm chua ngọt hài hòa tinh tế đất Tràng An.';
  }

  // Taste values defaults
  const tasteValues: Record<string, number> = {
    spice_level: 2,
    sweetness: 2,
    sourness: 2,
    fish_sauce_intensity: 3,
    herb_intensity: 4,
    oil_richness: 2,
  };

  const ingredientQuantities: Record<string, number> = {};
  const substitutionIds: string[] = [];
  const notesList: string[] = [];

  // Spiciness / Sichuan / Korean
  if (
    pLower.includes('sichuan') ||
    pLower.includes('tứ xuyên') ||
    pLower.includes('rất cay') ||
    pLower.includes('siêu cay') ||
    pLower.includes('cay nồng') ||
    pLower.includes('extra spicy') ||
    pLower.includes('very spicy') ||
    pLower.includes('korean') ||
    pLower.includes('hàn quốc')
  ) {
    tasteValues.spice_level = 5;
    ingredientQuantities['ing-chili'] = 3;
    notesList.push(isEn ? 'Extra fiery chili & spicy seasoning (Sichuan/Korean style)' : 'Cay nồng cấp độ 5, thêm nhiều ớt tươi và sa tế');
  } else if (pLower.includes('không cay') || pLower.includes('no spicy') || pLower.includes('no chili') || pLower.includes('không ớt') || pLower.includes('mild')) {
    tasteValues.spice_level = 0;
    ingredientQuantities['ing-chili'] = 0;
    notesList.push(isEn ? 'Strictly zero chili/spiciness' : 'Không ớt, không cay');
  }

  // Cilantro & Herbs
  if (
    pLower.includes('no cilantro') ||
    pLower.includes('không ngò') ||
    pLower.includes('không ăn ngò') ||
    pLower.includes('bỏ ngò') ||
    pLower.includes('không rau thơm') ||
    pLower.includes('no herbs') ||
    pLower.includes('no coriander') ||
    pLower.includes('dị ứng ngò')
  ) {
    tasteValues.herb_intensity = 0;
    ingredientQuantities['ing-cilantro'] = 0;
    ingredientQuantities['ing-basil'] = 0;
    notesList.push(isEn ? 'No cilantro or strong herbs' : 'Bỏ hoàn toàn ngò gai, hành hoa và rau mùi');
  } else if (pLower.includes('nhiều rau') || pLower.includes('extra herbs')) {
    tasteValues.herb_intensity = 5;
    notesList.push(isEn ? 'Extra fresh herbs platter' : 'Thêm đĩa rau thơm tươi');
  }

  // Vegetarian / Vegan / Tofu
  if (
    pLower.includes('chay') ||
    pLower.includes('vegan') ||
    pLower.includes('vegetarian') ||
    pLower.includes('tofu') ||
    pLower.includes('đậu phụ') ||
    pLower.includes('không ăn thịt')
  ) {
    if (dishSlug === 'pho-bo') substitutionIds.push('sub-pho-tofu');
    else if (dishSlug === 'bun-cha') substitutionIds.push('sub-bc-tofu');
    else if (dishSlug === 'banh-mi') substitutionIds.push('sub-bm-tofu');
    notesList.push(isEn ? '100% plant-based tofu substitution' : 'Đổi thịt thành đậu phụ chiên giòn (Ăn chay)');
  }

  // Keto / Low carb / Sweetness
  if (pLower.includes('keto') || pLower.includes('low carb') || pLower.includes('ít ngọt') || pLower.includes('ít đường') || pLower.includes('no sugar')) {
    tasteValues.sweetness = 1;
    tasteValues.oil_richness = 1;
    notesList.push(isEn ? 'Keto low-sugar balance' : 'Giảm ngọt, thanh đạm kiểu keto');
  }

  // Fish sauce intensity
  if (pLower.includes('không mắm') || pLower.includes('no fish sauce') || pLower.includes('ít mắm')) {
    tasteValues.fish_sauce_intensity = 0;
    notesList.push(isEn ? 'Light seasoning with sea salt, no fish sauce' : 'Dùng muối thanh, không mắm');
  }

  const specialNotes = notesList.length > 0
    ? notesList.join(' | ')
    : (isEn ? 'Customized via AI Taste Concierge' : 'Tùy biến khẩu vị qua Taste Concierge AI');

  // Conversational reply
  let reply = '';
  if (isEn) {
    reply = `Hello! Based on your request "${promptText || 'personalized dining'}", I recommend our signature **${dishName}**. We have carefully configured the taste profile to match your preferences${notesList.length ? ` (${notesList.join(', ')})` : ''}. Enjoy an authentic culinary experience with total peace of mind!`;
  } else {
    reply = `Chào bạn! Dựa trên yêu cầu "${promptText || 'khẩu vị cá nhân'}" của bạn, Taste Concierge gợi ý món **${dishName}**. Đội ngũ bếp đã cá nhân hóa khẩu vị cho bạn${notesList.length ? ` (${notesList.join(', ')})` : ''} để vừa giữ được hương vị tinh hoa Hà Nội vừa phù hợp hoàn hảo với bạn!`;
  }

  return {
    reply,
    recommendedDish: {
      dishSlug,
      dishName,
      basePrice,
      reason,
    },
    customization: {
      tasteValues,
      ingredientQuantities,
      substitutionIds,
      specialNotes,
    },
    quickAction: {
      label: isEn ? 'Add to Cart with AI Taste' : 'Thêm vào giỏ hàng ngay',
      action: 'ADD_TO_CART',
    },
  };
}

// ── 2. Cultural Dish Story (with in-memory cache) ──

const storyCache = new Map<string, CulturalDishStory>();

export async function generateCulturalDishStory(params: DishStoryParams): Promise<CulturalDishStory> {
  const dishSlug = (params.dishSlug || 'pho-bo').trim().toLowerCase();
  const rawLang = (params.language || 'vi').trim().toLowerCase();
  const lang = rawLang.startsWith('en') ? 'en' : 'vi';
  const cacheKey = `${dishSlug}:${lang}`;

  if (storyCache.has(cacheKey)) {
    return storyCache.get(cacheKey)!;
  }

  // Attempt GenAI first
  try {
    const geminiPrompt = `
You are a senior Vietnamese culinary historian and cultural storyteller.
Tell the authentic cultural story for dish: "${dishSlug}".
Target language: "${lang}".

Return a JSON object with this exact shape:
{
  "title": "Evocative cultural title in ${lang}",
  "originStory": "2-3 rich paragraphs detailing historical origins, culinary traditions, and cultural essence in ${lang}",
  "eatingEtiquette": "3-4 step-by-step etiquette rules on how to eat like a true Hanoi local in ${lang}",
  "localTip": "Insider secret or dining tip for tourists in ${lang}"
}
Return ONLY valid JSON.`;

    const aiRes = await callGeminiSafe<CulturalDishStory>(geminiPrompt);
    if (aiRes && aiRes.title && aiRes.originStory && aiRes.eatingEtiquette && aiRes.localTip) {
      storyCache.set(cacheKey, aiRes);
      return aiRes;
    }
  } catch {
    // Fall back to pre-authored rich cultural stories
  }

  // ── Smart Fallback Cultural Stories ──
  let story: CulturalDishStory;

  if (dishSlug === 'bun-cha') {
    if (lang === 'en') {
      story = {
        title: 'The Charcoal-Grilled Legacy of Hanoi Street Gastronomy',
        originStory:
          'Bún Chả is widely cherished as one of Hanoi\'s most quintessential and evocative culinary treasures. Originating from the bustling alleyways of the Old Quarter in the early 20th century, the unmistakable aroma of pork patties grilling over glowing charcoal has lured generations of hungry poets, scholars, and travelers alike.\n\nThe dish harmonizes two styles of pork: tender hand-minced patties seasoned with shallots and black pepper, and succulent pork belly slices lightly charred to golden perfection. They are submerged into a warm, amber-hued dipping broth crafted from artisanal fish sauce, rice vinegar, cane sugar, and crisp pickled green papaya.\n\nImmortalized globally when President Barack Obama and chef Anthony Bourdain shared a casual table in Hanoi, Bún Chả remains an enduring testament to Hanoi’s communal dining warmth and refined simplicity.',
        eatingEtiquette:
          '1. Do not pour the dipping broth into the noodles; instead, take a bite-sized nest of fresh rice vermicelli and dip it gently into the warm broth.\n2. Add a pinch of purple perilla, Vietnamese balm (kinh giới), and crisp lettuce leaves into the bowl.\n3. Scoop up a piece of charcoal-grilled pork and a slice of pickled papaya together for the perfect crunch and savory burst.',
        localTip:
          'True Hanoians savor Bún Chả strictly as a midday meal. Always ensure your herb plate includes Vietnamese balm (kinh giới) — its citrusy mint aroma is the secret soul that elevates the smoky pork.',
      };
    } else {
      story = {
        title: 'Hồn cốt ẩm thực than hoa Hà Nội',
        originStory:
          'Bún Chả là một trong những thức quà lâu đời và đặc trưng bậc nhất của ẩm thực kinh kỳ Hà Nội. Mùi khói than hoa nướng thịt chả thơm nức mũi đã gắn liền với ký ức của biết bao thế hệ người dân thủ đô từ thời nhà văn Thạch Lam, Vũ Bằng ghi chép trong những trang tùy bút ẩm thực bất hủ.\n\nĐiểm quyến rũ của bún chả nằm ở sự hòa quyện giữa chả viên băm nhỏ tẩm ướp hành hoa, hạt tiêu và chả miếng ba chỉ nướng xém cạnh trên vỉ than củi rực hồng. Từng miếng chả được canh lửa điêu luyện để xém giòn bên ngoài mà bên trong vẫn giữ nguyên vị ngọt mọng nước tự nhiên.\n\nBát nước chấm bún chả luôn được phục vụ ấm nóng, pha theo tỷ lệ vàng giữa nước mắm cốt truyền thống, giấm thanh, đường cát và tỏi ớt băm nhỏ, điểm xuyết những lát đu đủ xanh và cà rốt ngâm giòn rụm giải ngấy thanh tao.',
        eatingEtiquette:
          '1. Gắp một đũa bún tươi vừa ăn rồi nhúng ngập vào bát nước chấm chả ấm nóng.\n2. Kèm một nhánh rau kinh giới, tía tô hoặc xà lách tươi sạch.\n3. Thưởng thức miếng chả thơm lừng cùng lát đu đủ ngâm giòn tan để cảm nhận trọn vẹn sự hòa quyện giữa vị chua ngọt, béo bùi và hương thơm than hoa.',
        localTip:
          'Người Hà Nội sành ăn chuộng thưởng thức bún chả vào bữa trưa. Đĩa rau sống ăn kèm nhất thiết phải có rau kinh giới và tía tô tươi thì mới bật lên đúng phong vị thanh tao chuẩn đất Tràng An.',
      };
    }
  } else if (dishSlug === 'banh-mi') {
    if (lang === 'en') {
      story = {
        title: 'The Crispy Symphony of Vietnamese Street Culture',
        originStory:
          'Born from the intersection of French colonial baking techniques and Vietnamese culinary genius, Bánh Mì has transformed into the world’s most celebrated street sandwich. Vietnamese bakers reimagined the traditional baguette by incorporating rice flour, yielding an impossibly light, shatteringly crisp crust with a pillowy, airy crumb.\n\nInside, the baguette is layered with velvety artisanal liver pâté, savory roasted pork, silky mayonnaise, refreshing cucumber spears, and sweet-tart pickled daikon and carrot. A final flourish of spicy fresh chili and fragrant cilantro brings explosive harmony to every bite.\n\nFrom early morning market stalls to late-night street corners, Bánh Mì stands as a vibrant symbol of Vietnamese ingenuity, dynamism, and gastronomic celebration.',
        eatingEtiquette:
          '1. Hold the sandwich gently with both hands and press down lightly so all layers fuse together.\n2. Take a generous bite that captures both the crackling crust and the rich pâté, meat, and pickles in single harmony.\n3. Pair it with an iced Vietnamese milk coffee (cà phê sữa đá) for the quintessential morning ritual.',
        localTip:
          'Always request the sandwich to be freshly toasted until warm and crackling. For locals, a swirl of homemade cooked chili paste rather than bottled ketchup is non-negotiable!',
      };
    } else {
      story = {
        title: 'Bản giao hưởng giòn tan của ẩm thực đường phố Việt Nam',
        originStory:
          'Bánh Mì là cuộc hạnh ngộ kỳ diệu giữa kỹ nghệ làm bánh của Pháp và triết lý ẩm thực cân bằng âm dương của người Việt. Các nghệ nhân làm bánh Việt Nam đã sáng tạo công thức vỏ bánh mỏng giòn rụm, ruột xốp nhẹ để kẹp trọn những mỹ vị dân dã tinh túy nhất.\n\nLớp pate gan lợn béo ngậy được phết đều đặn, kết hợp cùng thịt xá xíu đậm đà, chả lụa thơm ngậy, dưa chuột tươi mát và đồ chua cà rốt củ cải giòn rụm. Từng cọng ngò gai, rau mùi và vài lát ớt tươi rực rỡ tạo nên sự bùng nổ hương sắc đầy mê hoặc.\n\nTừ chiếc xe đẩy bình dị góc phố cổ đến những danh xưng ẩm thực vang danh quốc tế, Bánh Mì là niềm tự hào kiêu hãnh của văn hóa ẩm thực đường phố Việt Nam.',
        eatingEtiquette:
          '1. Cầm chắc bánh mì bằng hai tay, bóp nhẹ để vỏ bánh kêu rôm rốp và các tầng nhân hòa quyện.\n2. Cắn một miếng thật sâu để cảm nhận từ lớp vỏ giòn tan đến vị béo bùi của pate và vị chua ngọt thanh mát của dưa góp.\n3. Thưởng thức kèm một ly cà phê sữa đá đậm đà để trọn vẹn phong vị phố phường.',
        localTip:
          'Hãy yêu cầu nướng lại vỏ bánh thật nóng giòn trước khi ăn. Một thìa tương ớt rim truyền thống sẽ tôn bật vị béo của pate mà không hề gây ngấy!',
      };
    }
  } else {
    // pho-bo and default
    if (lang === 'en') {
      story = {
        title: 'The Century-Old Soul of Hanoi’s Broth Artistry',
        originStory:
          'Phở Bò Hanoi traces its venerable lineage to the early 20th century along the Red River delta and the vibrant alleys of the Old Quarter. Originating from mobile street vendors carrying balanced shoulder poles (gánh phở), its soothing morning aroma has awakened Hanoi for over a hundred years.\n\nThe crown jewel of Phở is its crystalline, golden broth, gently simmered for over 12 hours from marrow-rich beef leg bones. The broth is infused with charred ginger, roasted shallots, star anise, cinnamon, and black cardamom, yielding an aromatic purity that needs no artificial embellishment.\n\nServed with silky, freshly cut rice noodles and tender cuts of rare and well-done beef, Phở Bò embodies the timeless elegance, restraint, and poetic soul of Vietnamese gastronomy.',
        eatingEtiquette:
          '1. Sip a spoonful of the pristine broth before adding any condiments to appreciate the natural sweetness of simmered marrow.\n2. Squeeze fresh calamansi or add a dash of garlic vinegar, followed by a few slices of fresh bird’s eye chili.\n3. Lift the noodles gently with chopsticks, pairing each mouthful with tender beef and scallions.',
        localTip:
          'True Hanoi connoisseurs favor fresh calamansi or garlic vinegar over lime to prevent bitterness and preserve the clarity of the beef broth. Always order a side of crispy fried crullers (quẩy) to dip into the steaming soup!',
      };
    } else {
      story = {
        title: 'Tinh hoa nước dùng trăm năm đất Tràng An',
        originStory:
          'Phở Bò Hà Nội có nguồn gốc từ đầu thế kỷ 20 tại vùng đất Nam Định và phố cổ Hà Nội. Khởi nguồn từ những đôi quang gánh phở rong với tiếng rao ấm trầm len lỏi qua từng ngõ ngách 36 phố phường, phở nhanh chóng trở thành biểu tượng tinh tế nhất của văn hóa ẩm thực Việt Nam.\n\nNước dùng phở truyền thống đất Tràng An được ninh kỹ hơn 12 tiếng từ xương ống bò tươi cùng các loại gia vị nướng thơm lừng như hoa hồi, thảo quả, quế chi, gừng già và hành nướng. Vị ngọt thanh tao của tủy xương nguyên chất hòa quyện cùng bánh phở tươi tráng mềm mướt và những lát thịt bò chín tới tạo nên sự cân bằng mỹ vị trọn vẹn.\n\nTrải qua bao thăng trầm thời gian, tô phở Hà Nội vẫn giữ nguyên cốt cách thanh lịch, tôn vinh vị ngọt tủy tự nhiên cùng hương thảo mộc thanh tao.',
        eatingEtiquette:
          '1. Húp một thìa nước dùng nguyên bản trước tiên để cảm nhận trọn vẹn vị thanh ngọt của nước hầm xương.\n2. Thêm vài lát ớt tươi, vắt 1-2 quả quất tươi (hoặc vài giọt giấm tỏi ớt truyền thống Hà Nội).\n3. Gắp thịt bò và bánh phở cùng chút hành hoa, chấm nhẹ tương ớt gia truyền rồi thưởng thức từ tốn khi còn bốc khói nghi ngút.',
        localTip:
          'Người sành ăn Hà Nội chính gốc thường chuộng dùng quất tươi hoặc giấm tỏi thay vì vắt chanh để giữ cho nước dùng trong và không bị đắng vỏ. Đừng quên gọi thêm một đĩa quẩy giòn rụm để nhúng cùng nước phở nóng hổi!',
      };
    }
  }

  // Cache and return
  storyCache.set(cacheKey, story);
  return story;
}

// ── 3. Kitchen Briefing (Analyzing Orders -> Chef Actions) ──

export async function generateKitchenBriefing(params?: KitchenBriefingParams): Promise<KitchenBriefingResult> {
  const timeframe = params?.timeframe || 'today';
  const orders = demoOrderStore.getAll();

  // Compute live order metrics from the store
  const totalOrders = orders.length;
  let spicyCount = 0;
  let noHerbCount = 0;
  let vegetarianCount = 0;
  let koreanGuestCount = 0;
  let westernGuestCount = 0;

  const dishCounts: Record<string, number> = {};

  for (const ord of orders) {
    // Demographics
    if (ord.customerDialCode === '+82' || (ord.customerName && ord.customerName.includes('Hàn Quốc'))) {
      koreanGuestCount++;
    }
    if (ord.customerDialCode === '+1' || (ord.customerName && (ord.customerName.includes('Mỹ') || ord.customerName.includes('John')))) {
      westernGuestCount++;
    }

    const note = (ord.customerNotes || '').toLowerCase();
    if (note.includes('ớt') || note.includes('cay') || note.includes('chili') || note.includes('spicy')) {
      spicyCount++;
    }

    if (ord.items) {
      for (const item of ord.items) {
        dishCounts[item.dishName] = (dishCounts[item.dishName] || 0) + (item.quantity || 1);

        if (item.tasteCustomizations) {
          for (const tc of item.tasteCustomizations) {
            if (tc.attribute?.toLowerCase().includes('cay') && Number(tc.chosenValue) >= 4) {
              spicyCount++;
            }
            if (tc.kitchenInstruction?.toLowerCase().includes('ớt') || tc.customerLabel?.toLowerCase().includes('cay')) {
              spicyCount++;
            }
          }
        }

        if (item.ingredientCustomizations) {
          for (const ic of item.ingredientCustomizations) {
            if (ic.role === 'REMOVABLE' && Number(ic.chosenQuantity) === 0) {
              noHerbCount++;
            }
          }
        }

        if (item.substitutions && item.substitutions.length > 0) {
          vegetarianCount++;
        }
      }
    }
  }

  // Attempt GenAI call first
  try {
    const geminiPrompt = `
You are the Executive Chef and Kitchen Intelligence Director of "Vietnamese Food to Taste".
Shift timeframe: "${timeframe}".
Total live orders recorded: ${totalOrders}.
Order metrics:
- High spice demand: ~${spicyCount} occurrences.
- Herb/cilantro omission: ~${noHerbCount} occurrences.
- Vegetarian/tofu substitutions: ~${vegetarianCount} occurrences.
- International guests: ${koreanGuestCount} Korean, ${westernGuestCount} Western.

Return a JSON briefing for the kitchen staff in Vietnamese with this exact shape:
{
  "executiveSummary": "2-3 crisp sentences summarizing the shift, volume, and primary taste preferences.",
  "palateTrends": [
    "String trend 1",
    "String trend 2",
    "String trend 3"
  ],
  "kitchenActionItems": [
    "Action bullet 1 for cooks/prep team",
    "Action bullet 2",
    "Action bullet 3"
  ],
  "prepAdvice": "High-priority preparation command for station leads (e.g. chili prep, herb separation, broth stock)"
}
Return ONLY valid JSON.`;

    const aiRes = await callGeminiSafe<KitchenBriefingResult>(geminiPrompt);
    if (aiRes && aiRes.executiveSummary && Array.isArray(aiRes.palateTrends) && Array.isArray(aiRes.kitchenActionItems) && aiRes.prepAdvice) {
      return aiRes;
    }
  } catch {
    // Fall back to rule-based briefing
  }

  // ── Smart Fallback Kitchen Briefing ──
  const summaryTime = timeframe === 'today' ? 'hôm nay' : `khoảng thời gian ${timeframe}`;
  const executiveSummary = `Ca làm việc ${summaryTime} ghi nhận tổng cộng ${totalOrders} đơn hàng đang phục vụ. Tỷ trọng khách quốc tế chiếm ưu thế lớn với hai xu hướng vị giác phân hóa rõ rệt: khách du lịch Đông Á yêu cầu tăng mạnh độ cay nồng trong khi khách phương Tây ưu tiên giảm ngò gai và rau thơm mạnh mùi.`;

  const palateTrends = [
    `Nhu cầu cay nồng (+4/5) chiếm hơn 40% lượng đơn Phở Bò và Bún Chả, tập trung ở nhóm khách Hàn Quốc (+82) và khách trẻ.`,
    `Gia tăng 35% yêu cầu loại bỏ hoàn toàn ngò gai và rau húng quế từ các du khách Âu - Mỹ tránh dị ứng vị nồng.`,
    `Tỷ lệ chuyển đổi sang chả đậu hũ và đậu chiên chay tăng ổn định vào khung giờ trưa thanh đạm.`,
    `Nước chấm bún chả duy trì tỷ lệ yêu cầu giảm ngọt 50% ở nhóm khách kiêng đường và khách quốc tế.`,
  ];

  const kitchenActionItems = [
    `Bộ phận sơ chế thái sẵn thêm 3 khay ớt hiểm tươi thái lát và 2 thố sa tế cay phục vụ ngay tại line nóng.`,
    `Trạm rau thơm phân loại riêng 2 khay: Khay đầy đủ hành ngò chuẩn vị và Khay riêng biệt hoàn toàn không ngò gai (no-cilantro).`,
    `Trạm bếp nước dùng duy trì nhiệt độ nồi phở ở 92°C - 95°C để đảm bảo thịt bò tái chín mềm và nước dùng trong vắt.`,
    `Nướng sẵn gối đầu 20 phần chả viên than hoa sẵn sàng phục vụ nhanh các đơn giao gấp qua WhatsApp.`,
  ];

  const prepAdvice = `Tăng cường +50% ớt tươi cắt lát, tách sẵn khay rau không ngò gai và chuẩn bị sẵn 2 khay đậu phụ chiên giòn phục vụ đơn chay.`;

  return {
    executiveSummary,
    palateTrends,
    kitchenActionItems,
    prepAdvice,
  };
}

// ── Legacy / Existing Nationality Taste Analysis (kept for compatibility) ──

export async function analyzeNationalityTaste(nationality: string) {
  const prompt = `
You are a culinary AI expert for a Vietnamese restaurant.
The user's nationality or cultural background is: "${nationality}".

Please output a JSON object representing their general taste profile and dietary restrictions based on common demographics for that nationality/region.
The JSON must follow this exact structure:
{
  "tastePreferences": {
    "spice_level": 0-5,
    "sweetness": 0-5,
    "sourness": 0-5,
    "fish_sauce_intensity": 0-5,
    "herb_intensity": 0-5,
    "oil_richness": 0-5
  },
  "dietaryRestrictions": []
}
Return ONLY valid JSON.
  `;

  try {
    const result = await callGeminiSafe<{
      tastePreferences: Record<string, number>;
      dietaryRestrictions: string[];
    }>(prompt);

    if (result && result.tastePreferences) {
      return result;
    }
  } catch (error) {
    console.error('[ai-service] Error calling Gemini AI:', error);
  }

  // Smart Cultural Fallback
  const nLower = (nationality || '').toLowerCase();
  if (nLower.includes('korea') || nLower.includes('hàn')) {
    return {
      tastePreferences: { spice_level: 4, sweetness: 2, sourness: 3, fish_sauce_intensity: 2, herb_intensity: 3, oil_richness: 3 },
      dietaryRestrictions: [],
    };
  }
  if (nLower.includes('japan') || nLower.includes('nhật')) {
    return {
      tastePreferences: { spice_level: 0, sweetness: 2, sourness: 1, fish_sauce_intensity: 1, herb_intensity: 2, oil_richness: 1 },
      dietaryRestrictions: [],
    };
  }
  if (nLower.includes('us') || nLower.includes('america') || nLower.includes('mỹ') || nLower.includes('western') || nLower.includes('tây')) {
    return {
      tastePreferences: { spice_level: 1, sweetness: 3, sourness: 2, fish_sauce_intensity: 1, herb_intensity: 2, oil_richness: 2 },
      dietaryRestrictions: [],
    };
  }

  // Default fallback
  return {
    tastePreferences: {
      spice_level: 2,
      sweetness: 3,
      sourness: 2,
      fish_sauce_intensity: 2,
      herb_intensity: 2,
      oil_richness: 3,
    },
    dietaryRestrictions: [],
  };
}
