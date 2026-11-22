import { useState, useEffect, useCallback } from 'react';
import { useLanguageStore } from '../i18n';
import { api } from '../lib/api-client';

export interface CulturalStorySectionProps {
  dishSlug?: string;
}

export interface CulturalDishStory {
  title: string;
  originStory: string;
  eatingEtiquette: string;
  localTip: string;
}

interface EtiquetteStep {
  step: number;
  text: string;
}

const FALLBACK_STORIES: Record<string, Record<string, CulturalDishStory>> = {
  'bun-cha': {
    vi: {
      title: 'Hồn cốt ẩm thực than hoa Hà Nội',
      originStory:
        'Bún Chả là một trong những thức quà lâu đời và đặc trưng bậc nhất của ẩm thực kinh kỳ Hà Nội. Mùi khói than hoa nướng thịt chả thơm nức mũi đã gắn liền với ký ức của biết bao thế hệ người dân thủ đô từ thời nhà văn Thạch Lam, Vũ Bằng ghi chép trong những trang tùy bút ẩm thực bất hủ.\n\nĐiểm quyến rũ của bún chả nằm ở sự hòa quyện giữa chả viên băm nhỏ tẩm ướp hành hoa, hạt tiêu và chả miếng ba chỉ nướng xém cạnh trên vỉ than củi rực hồng. Từng miếng chả được canh lửa điêu luyện để xém giòn bên ngoài mà bên trong vẫn giữ nguyên vị ngọt mọng nước tự nhiên.\n\nBát nước chấm bún chả luôn được phục vụ ấm nóng, pha theo tỷ lệ vàng giữa nước mắm cốt truyền thống, giấm thanh, đường cát và tỏi ớt băm nhỏ, điểm xuyết những lát đu đủ xanh và cà rốt ngâm giòn rụm giải ngấy thanh tao.',
      eatingEtiquette:
        '1. Gắp một đũa bún tươi vừa ăn rồi nhúng ngập vào bát nước chấm chả ấm nóng.\n2. Kèm một nhánh rau kinh giới, tía tô hoặc xà lách tươi sạch.\n3. Thưởng thức miếng chả thơm lừng cùng lát đu đủ ngâm giòn tan để cảm nhận trọn vẹn sự hòa quyện giữa vị chua ngọt, béo bùi và hương thơm than hoa.',
      localTip:
        'Người Hà Nội sành ăn chuộng thưởng thức bún chả vào bữa trưa. Đĩa rau sống ăn kèm nhất thiết phải có rau kinh giới và tía tô tươi thì mới bật lên đúng phong vị thanh tao chuẩn đất Tràng An.',
    },
    en: {
      title: 'The Charcoal-Grilled Legacy of Hanoi Street Gastronomy',
      originStory:
        "Bún Chả is widely cherished as one of Hanoi's most quintessential and evocative culinary treasures. Originating from the bustling alleyways of the Old Quarter in the early 20th century, the unmistakable aroma of pork patties grilling over glowing charcoal has lured generations of hungry poets, scholars, and travelers alike.\n\nThe dish harmonizes two styles of pork: tender hand-minced patties seasoned with shallots and black pepper, and succulent pork belly slices lightly charred to golden perfection. They are submerged into a warm, amber-hued dipping broth crafted from artisanal fish sauce, rice vinegar, cane sugar, and crisp pickled green papaya.\n\nImmortalized globally when President Barack Obama and chef Anthony Bourdain shared a casual table in Hanoi, Bún Chả remains an enduring testament to Hanoi’s communal dining warmth and refined simplicity.",
      eatingEtiquette:
        '1. Do not pour the dipping broth into the noodles; instead, take a bite-sized nest of fresh rice vermicelli and dip it gently into the warm broth.\n2. Add a pinch of purple perilla, Vietnamese balm (kinh giới), and crisp lettuce leaves into the bowl.\n3. Scoop up a piece of charcoal-grilled pork and a slice of pickled papaya together for the perfect crunch and savory burst.',
      localTip:
        'True Hanoians savor Bún Chả strictly as a midday meal. Always ensure your herb plate includes Vietnamese balm (kinh giới) — its citrusy mint aroma is the secret soul that elevates the smoky pork.',
    },
  },
  'banh-mi': {
    vi: {
      title: 'Bản giao hưởng giòn tan của ẩm thực đường phố Việt Nam',
      originStory:
        'Bánh Mì là cuộc hạnh ngộ kỳ diệu giữa kỹ nghệ làm bánh của Pháp và triết lý ẩm thực cân bằng âm dương của người Việt. Các nghệ nhân làm bánh Việt Nam đã sáng tạo công thức vỏ bánh mỏng giòn rụm, ruột xốp nhẹ để kẹp trọn những mỹ vị dân dã tinh túy nhất.\n\nLớp pate gan lợn béo ngậy được phết đều đặn, kết hợp cùng thịt xá xíu đậm đà, chả lụa thơm ngậy, dưa chuột tươi mát và đồ chua cà rốt củ cải giòn rụm. Từng cọng ngò gai, rau mùi và vài lát ớt tươi rực rỡ tạo nên sự bùng nổ hương sắc đầy mê hoặc.\n\nTừ chiếc xe đẩy bình dị góc phố cổ đến những danh xưng ẩm thực vang danh quốc tế, Bánh Mì là niềm tự hào kiêu hãnh của văn hóa ẩm thực đường phố Việt Nam.',
      eatingEtiquette:
        '1. Cầm chắc bánh mì bằng hai tay, bóp nhẹ để vỏ bánh kêu rôm rốp và các tầng nhân hòa quyện.\n2. Cắn một miếng thật sâu để cảm nhận từ lớp vỏ giòn tan đến vị béo bùi của pate và vị chua ngọt thanh mát của dưa góp.\n3. Thưởng thức kèm một ly cà phê sữa đá đậm đà để trọn vẹn phong vị phố phường.',
      localTip:
        'Hãy yêu cầu nướng lại vỏ bánh thật nóng giòn trước khi ăn. Một thìa tương ớt rim truyền thống sẽ tôn bật vị béo của pate mà không hề gây ngấy!',
    },
    en: {
      title: 'The Crispy Symphony of Vietnamese Street Culture',
      originStory:
        'Born from the intersection of French colonial baking techniques and Vietnamese culinary genius, Bánh Mì has transformed into the world’s most celebrated street sandwich. Vietnamese bakers reimagined the traditional baguette by incorporating rice flour, yielding an impossibly light, shatteringly crisp crust with a pillowy, airy crumb.\n\nInside, the baguette is layered with velvety artisanal liver pâté, savory roasted pork, silky mayonnaise, refreshing cucumber spears, and sweet-tart pickled daikon and carrot. A final flourish of spicy fresh chili and fragrant cilantro brings explosive harmony to every bite.\n\nFrom early morning market stalls to late-night street corners, Bánh Mì stands as a vibrant symbol of Vietnamese ingenuity, dynamism, and gastronomic celebration.',
      eatingEtiquette:
        '1. Hold the sandwich gently with both hands and press down lightly so all layers fuse together.\n2. Take a generous bite that captures both the crackling crust and the rich pâté, meat, and pickles in single harmony.\n3. Pair it with an iced Vietnamese milk coffee (cà phê sữa đá) for the quintessential morning ritual.',
      localTip:
        'Always request the sandwich to be freshly toasted until warm and crackling. For locals, a swirl of homemade cooked chili paste rather than bottled ketchup is non-negotiable!',
    },
  },
  'pho-bo': {
    vi: {
      title: 'Tinh hoa nước dùng trăm năm đất Tràng An',
      originStory:
        'Phở Bò Hà Nội có nguồn gốc từ đầu thế kỷ 20 tại vùng đất Nam Định và phố cổ Hà Nội. Khởi nguồn từ những đôi quang gánh phở rong với tiếng rao ấm trầm len lỏi qua từng ngõ ngách 36 phố phường, phở nhanh chóng trở thành biểu tượng tinh tế nhất của văn hóa ẩm thực Việt Nam.\n\nNước dùng phở truyền thống đất Tràng An được ninh kỹ hơn 12 tiếng từ xương ống bò tươi cùng các loại gia vị nướng thơm lừng như hoa hồi, thảo quả, quế chi, gừng già và hành nướng. Vị ngọt thanh tao của tủy xương nguyên chất hòa quyện cùng bánh phở tươi tráng mềm mướt và những lát thịt bò chín tới tạo nên sự cân bằng mỹ vị trọn vẹn.\n\nTrải qua bao thăng trầm thời gian, tô phở Hà Nội vẫn giữ nguyên cốt cách thanh lịch, tôn vinh vị ngọt tủy tự nhiên cùng hương thảo mộc thanh tao.',
      eatingEtiquette:
        '1. Húp một thìa nước dùng nguyên bản trước tiên để cảm nhận trọn vẹn vị thanh ngọt của nước hầm xương.\n2. Thêm vài lát ớt tươi, vắt 1-2 quả quất tươi (hoặc vài giọt giấm tỏi ớt truyền thống Hà Nội).\n3. Gắp thịt bò và bánh phở cùng chút hành hoa, chấm nhẹ tương ớt gia truyền rồi thưởng thức từ tốn khi còn bốc khói nghi ngút.',
      localTip:
        'Người sành ăn Hà Nội chính gốc thường chuộng dùng quất tươi hoặc giấm tỏi thay vì vắt chanh để giữ cho nước dùng trong và không bị đắng vỏ. Đừng quên gọi thêm một đĩa quẩy giòn rụm để nhúng cùng nước phở nóng hổi!',
    },
    en: {
      title: 'The Century-Old Soul of Hanoi’s Broth Artistry',
      originStory:
        'Phở Bò Hanoi traces its venerable lineage to the early 20th century along the Red River delta and the vibrant alleys of the Old Quarter. Originating from mobile street vendors carrying balanced shoulder poles (gánh phở), its soothing morning aroma has awakened Hanoi for over a hundred years.\n\nThe crown jewel of Phở is its crystalline, golden broth, gently simmered for over 12 hours from marrow-rich beef leg bones. The broth is infused with charred ginger, roasted shallots, star anise, cinnamon, and black cardamom, yielding an aromatic purity that needs no artificial embellishment.\n\nServed with silky, freshly cut rice noodles and tender cuts of rare and well-done beef, Phở Bò embodies the timeless elegance, restraint, and poetic soul of Vietnamese gastronomy.',
      eatingEtiquette:
        '1. Sip a spoonful of the pristine broth before adding any condiments to appreciate the natural sweetness of simmered marrow.\n2. Squeeze fresh calamansi or add a dash of garlic vinegar, followed by a few slices of fresh bird’s eye chili.\n3. Lift the noodles gently with chopsticks, pairing each mouthful with tender beef and scallions.',
      localTip:
        'True Hanoi connoisseurs favor fresh calamansi or garlic vinegar over lime to prevent bitterness and preserve the clarity of the beef broth. Always order a side of crispy fried crullers (quẩy) to dip into the steaming soup!',
    },
  },
};

function parseEtiquetteSteps(rawText: string): EtiquetteStep[] {
  if (!rawText) return [];
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const steps: EtiquetteStep[] = [];

  lines.forEach((line, index) => {
    const match = line.match(/^(?:(?:bước|step)\s*)?(\d+)[\.\:\)]\s*(.*)$/i);
    if (match) {
      const stepNum = parseInt(match[1], 10);
      steps.push({
        step: isNaN(stepNum) ? index + 1 : stepNum,
        text: match[2].trim(),
      });
    } else {
      steps.push({
        step: index + 1,
        text: line.replace(/^[-*•]\s*/, '').trim(),
      });
    }
  });

  return steps.length > 0 ? steps : [{ step: 1, text: rawText.trim() }];
}

export function CulturalStorySection({ dishSlug }: CulturalStorySectionProps) {
  const language = useLanguageStore((s) => s.language);
  const normalizedSlug = (dishSlug || 'pho-bo').trim().toLowerCase();
  const langKey = language?.startsWith('en') ? 'en' : 'vi';

  // Use fallback as initial state so server-side or immediate rendering looks populated
  const defaultFallback = FALLBACK_STORIES[normalizedSlug]?.[langKey] || FALLBACK_STORIES['pho-bo'][langKey];
  const [story, setStory] = useState<CulturalDishStory | null>(defaultFallback);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStory = useCallback(
    async (isManualRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.post<CulturalDishStory>('/api/ai/dish-story', {
          dishSlug: normalizedSlug,
          language,
        });

        const storyData = res?.data || (res as any)?.title ? (res.data || (res as any)) : null;

        if (storyData && storyData.title && storyData.originStory) {
          setStory(storyData);
        } else if (res?.error) {
          // If server returns error, keep fallback or update with fallback for the current lang
          const fallback = FALLBACK_STORIES[normalizedSlug]?.[langKey] || FALLBACK_STORIES['pho-bo'][langKey];
          setStory(fallback);
          if (isManualRefresh) {
            setError(res.error.message || 'Không thể tải câu chuyện từ máy chủ');
          }
        }
      } catch (err: any) {
        const fallback = FALLBACK_STORIES[normalizedSlug]?.[langKey] || FALLBACK_STORIES['pho-bo'][langKey];
        setStory(fallback);
        if (isManualRefresh) {
          setError(err?.message || 'Lỗi kết nối khi tải câu chuyện');
        }
      } finally {
        setLoading(false);
      }
    },
    [normalizedSlug, language, langKey]
  );

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  const originParagraphs = story?.originStory
    ? story.originStory
        .split(/\r?\n\r?\n|\r?\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];

  const etiquetteSteps = story?.eatingEtiquette ? parseEtiquetteSteps(story.eatingEtiquette) : [];

  return (
    <section className="rounded-3xl bg-gradient-to-b from-amber-50/50 via-white to-orange-50/30 border border-amber-200/80 p-6 sm:p-8 shadow-xs transition-all duration-300">
      {/* 1. Header with Reload/Regenerate Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/70 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
            ✨ Chuyện Ẩm Thực &amp; Hướng Dẫn Ăn Chuẩn Vị (AI Cultural Story &amp; Etiquette)
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            {langKey === 'vi'
              ? 'Khám phá văn hóa, cội nguồn và bí quyết thưởng thức trọn vẹn hương vị truyền thống.'
              : 'Explore cultural heritage, historical origins, and step-by-step local dining etiquette.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchStory(true)}
          disabled={loading}
          aria-label={langKey === 'vi' ? 'Làm mới câu chuyện' : 'Regenerate cultural story'}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-900 px-4 py-2.5 text-xs sm:text-sm font-bold transition disabled:opacity-50 cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
        >
          <span className={`text-base ${loading ? 'animate-spin' : ''}`}>🔄</span>
          <span>
            {loading
              ? langKey === 'vi'
                ? 'Đang lắng nghe AI...'
                : 'Consulting AI...'
              : langKey === 'vi'
              ? 'Làm mới câu chuyện'
              : 'Regenerate Story'}
          </span>
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-amber-100/70 border border-amber-300 p-3 text-xs text-amber-900 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => fetchStory(true)}
            className="font-bold underline hover:text-amber-950 ml-2 cursor-pointer"
          >
            {langKey === 'vi' ? 'Thử lại' : 'Retry'}
          </button>
        </div>
      )}

      {/* 2. Loading Skeleton */}
      {loading ? (
        <div className="animate-pulse space-y-6 pt-6" data-testid="cultural-story-skeleton">
          <div className="h-7 w-64 bg-amber-200/60 rounded-full"></div>
          <div className="space-y-3 rounded-2xl bg-amber-50/60 p-5 border border-amber-200/50">
            <div className="h-4 bg-amber-200/50 rounded-md w-full"></div>
            <div className="h-4 bg-amber-200/50 rounded-md w-11/12"></div>
            <div className="h-4 bg-amber-200/50 rounded-md w-4/5"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="h-32 bg-amber-100/70 rounded-2xl border border-amber-200/50 p-4"></div>
            <div className="h-32 bg-amber-100/70 rounded-2xl border border-amber-200/50 p-4"></div>
            <div className="h-32 bg-amber-100/70 rounded-2xl border border-amber-200/50 p-4"></div>
          </div>
          <div className="h-20 bg-amber-200/40 rounded-2xl border border-amber-300/40"></div>
        </div>
      ) : story ? (
        <div className="space-y-6 pt-6">
          {/* 3. Cultural Title Badge */}
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border border-amber-300/80 text-xs sm:text-sm font-bold shadow-2xs">
              <span className="text-base select-none">🏮</span>
              <span>{story.title}</span>
            </span>
          </div>

          {/* 4. Origin Story Text */}
          <div className="rounded-2xl bg-amber-50/40 p-5 sm:p-6 border border-amber-200/60 space-y-3">
            <h3 className="text-xs sm:text-sm font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-2">
              <span>📜</span>
              <span>{langKey === 'vi' ? 'Nguồn Gốc & Hồn Cốt Món Ăn' : 'Culinary Heritage & Origins'}</span>
            </h3>
            <div className="space-y-3 font-serif text-stone-800 text-sm sm:text-base leading-relaxed tracking-normal">
              {originParagraphs.map((para, idx) => (
                <p key={idx} className="leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* 5. Step-by-step Dining Etiquette Cards */}
          {etiquetteSteps.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs sm:text-sm font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <span>🥢</span>
                <span>{langKey === 'vi' ? 'Cách Ăn Chuẩn Vị Bản Địa' : 'Step-by-Step Dining Etiquette'}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {etiquetteSteps.map((st) => (
                  <div
                    key={st.step}
                    className="rounded-2xl bg-white p-4 sm:p-5 border border-amber-200/80 shadow-xs flex flex-col justify-between hover:border-amber-400 hover:shadow-sm transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-600 text-white font-black text-xs shadow-2xs">
                          {st.step}
                        </span>
                        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                          {langKey === 'vi' ? `Bước ${st.step}` : `Step ${st.step}`}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed">
                        {st.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Local Tip Callout Banner */}
          {story.localTip && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300/80 p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
              <span className="text-2xl select-none shrink-0 mt-0.5">💡</span>
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-900">
                  {langKey === 'vi' ? 'Bí Kíp Bản Địa' : 'Local Tip'}:
                </h4>
                <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                  {story.localTip}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
