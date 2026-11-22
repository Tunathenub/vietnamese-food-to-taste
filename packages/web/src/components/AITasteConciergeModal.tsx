import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useCartStore } from '../stores/cart-store';
import { useLanguageStore, formatPrice } from '../i18n';
import { api } from '../lib/api-client';

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

const DISH_IMAGES: Record<string, string> = {
  'pho-bo': 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600',
  'bun-cha': 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=600',
  'banh-mi': 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=600',
};

const DEFAULT_DISH_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600';

const SUGGESTION_CHIPS = [
  '🌶️ Thèm cay nồng Tứ Xuyên, không ngò gai',
  '🍜 Phở bò tái lăn nhiều hành, ít mặn',
  '🥗 Bún chả chay đậu phụ, thanh đạm',
  '🥩 High-protein, không hành tỏi',
];

export interface AITasteConciergeModalProps {
  defaultOpen?: boolean;
}

export function AITasteConciergeModal({ defaultOpen = false }: AITasteConciergeModalProps = {}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TasteConciergeResult | null>(null);
  const [addedToast, setAddedToast] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const navigate = useNavigate();
  const language = useLanguageStore((state) => state.language);
  const addItem = useCartStore((state) => state.addItem);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Close with Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  // Focus input on modal open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSearch = async (userPrompt: string) => {
    const trimmed = userPrompt.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setAddedToast(false);

    try {
      const res = await api.post<TasteConciergeResult>('/ai/concierge', {
        prompt: trimmed,
        language,
      });

      const payload = (res.data || res) as any;
      const data: TasteConciergeResult | null =
        payload?.recommendedDish ? payload : payload?.data || null;

      if (data && data.recommendedDish) {
        setResult(data);
      } else {
        throw new Error(res.error?.message || 'Không thể tạo gợi ý món ăn vào lúc này.');
      }
    } catch (err: any) {
      setError(err?.message || 'Đã có lỗi xảy ra khi kết nối tới Trợ lý AI. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleSearch(prompt);
  };

  const handleChipClick = (chipText: string) => {
    setPrompt(chipText);
    handleSearch(chipText);
  };

  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói Web Speech.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'en' ? 'en-US' : 'vi-VN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setPrompt(transcript);
          handleSearch(transcript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleAddToCart = () => {
    if (!result || !result.recommendedDish) return;

    const { recommendedDish, customization } = result;
    const dishSlug = recommendedDish.dishSlug;
    const dishId = `${dishSlug}-id`;

    addItem({
      dishId,
      dishName: recommendedDish.dishName,
      dishSlug,
      quantity: 1,
      basePrice: recommendedDish.basePrice,
      currency: 'VND',
      tasteProfileCode: 'AI_CUSTOM',
      tasteValues: customization.tasteValues || {},
      ingredientQuantities: customization.ingredientQuantities || {},
      substitutionIds: customization.substitutionIds || [],
      notes: customization.specialNotes || 'Tùy biến bởi AI Taste Concierge',
    });

    setAddedToast(true);
  };

  const handleViewCart = () => {
    setIsOpen(false);
    navigate('/cart');
  };

  const renderTasteSummaryTags = (customization: TasteConciergeResult['customization']) => {
    const tags: { label: string; bg: string; text: string; icon: string }[] = [];
    const tv = customization.tasteValues || {};

    if (tv.spice_level !== undefined) {
      tags.push({
        label: tv.spice_level === 0 ? 'Không cay' : `Cay cấp ${tv.spice_level}/5`,
        bg: tv.spice_level >= 4 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200',
        text: tv.spice_level >= 4 ? 'text-red-700' : 'text-orange-700',
        icon: '🌶️',
      });
    }

    if (tv.herb_intensity !== undefined) {
      tags.push({
        label: tv.herb_intensity === 0 ? 'Rau thơm: Không ngò gai' : `Rau thơm: Cấp ${tv.herb_intensity}/5`,
        bg: tv.herb_intensity === 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200',
        text: tv.herb_intensity === 0 ? 'text-amber-800' : 'text-emerald-700',
        icon: '🌿',
      });
    }

    if (tv.sweetness !== undefined) {
      tags.push({
        label: tv.sweetness <= 1 ? 'Ít ngọt (Keto)' : `Ngọt: Cấp ${tv.sweetness}/5`,
        bg: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-800',
        icon: '🍯',
      });
    }

    if (tv.fish_sauce_intensity !== undefined) {
      tags.push({
        label: tv.fish_sauce_intensity === 0 ? 'Không nước mắm' : `Độ đậm mắm: Cấp ${tv.fish_sauce_intensity}/5`,
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-700',
        icon: '🐟',
      });
    }

    if (customization.substitutionIds && customization.substitutionIds.length > 0) {
      tags.push({
        label: 'Đổi đậu phụ chay',
        bg: 'bg-teal-50 border-teal-200',
        text: 'text-teal-700',
        icon: '🌱',
      });
    }

    if (customization.specialNotes) {
      tags.push({
        label: customization.specialNotes,
        bg: 'bg-purple-50 border-purple-200',
        text: 'text-purple-700',
        icon: '✨',
      });
    }

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${tag.bg} ${tag.text}`}
          >
            <span>{tag.icon}</span>
            <span>{tag.label}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* ── Global Floating Action Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 group flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-bold text-sm hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/30 backdrop-blur-xs"
        aria-label="✨ Trợ Lý Gu Ẩm Thực (AI Taste Concierge)"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
        </span>
        <span className="text-base">✨</span>
        <span className="tracking-wide">Trợ Lý Gu Ẩm Thực (AI Taste Concierge)</span>
      </button>

      {/* ── Concierge Modal Dialog ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="concierge-modal-title"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-orange-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold mb-2 text-white">
                    <span>✨</span>
                    <span>AI-Powered Palate Personalization</span>
                  </div>
                  <h2
                    id="concierge-modal-title"
                    className="text-lg sm:text-xl font-extrabold tracking-tight"
                  >
                    ✨ Trợ Lý Gu Ẩm Thực Thông Minh (AI Taste Concierge)
                  </h2>
                  <p className="text-xs sm:text-sm text-orange-100 mt-1.5 leading-relaxed">
                    Nói cho AI biết bạn muốn ăn gì hoặc kiêng gì, AI sẽ chọn món &amp; tự động nêm nếm chuẩn gu của bạn!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
                  aria-label="Đóng"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Quick Prompt Suggestion Chips */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Gợi ý nhanh cho du khách &amp; tín đồ ẩm thực:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTION_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className="text-xs px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50/60 text-orange-900 hover:bg-orange-100 hover:border-orange-300 transition cursor-pointer font-medium text-left"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Bar */}
              <form onSubmit={handleSubmit} className="relative">
                <div className="relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ví dụ: Thèm cay nồng Tứ Xuyên, không ngò gai, ăn thanh đạm..."
                    className="w-full pl-4 pr-24 py-3 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                      }`}
                      title="Nhập bằng giọng nói"
                      aria-label="Nhập bằng giọng nói"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 02-3-3V5a3 3 0 116 0v6a3 3 0 02-3 3z" />
                      </svg>
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !prompt.trim()}
                      className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span>Gửi</span>
                          <span>✨</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Loading State */}
              {loading && (
                <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-100 flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white text-base">
                    ✨
                  </div>
                  <div className="text-xs text-orange-950">
                    <p className="font-bold">AI Taste Concierge đang phân tích khẩu vị của bạn...</p>
                    <p className="text-orange-700/80 mt-0.5">Đang chọn món phù hợp và tự động cân chỉnh gia vị theo gu riêng.</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <div>
                    <p className="font-bold">Rất tiếc, đã có lỗi xảy ra</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* AI Result Display */}
              {result && !loading && (
                <div className="space-y-4 pt-1">
                  {/* Assistant message bubble */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-rose-50/40 border border-orange-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🤖</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-800">
                        Lời nhắn từ Trợ Lý AI:
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
                      {result.reply}
                    </p>
                  </div>

                  {/* Recommended Dish Preview Card */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs hover:border-orange-200 transition bg-white">
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-36 h-32 sm:h-auto relative overflow-hidden bg-gray-100 shrink-0">
                        <img
                          src={DISH_IMAGES[result.recommendedDish.dishSlug] || DEFAULT_DISH_IMAGE}
                          alt={result.recommendedDish.dishName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-white font-bold">
                          Được gợi ý
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="font-extrabold text-base text-gray-900">
                              {result.recommendedDish.dishName}
                            </h3>
                            <span className="text-sm font-bold text-orange-600">
                              {formatPrice(result.recommendedDish.basePrice, language)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            {result.recommendedDish.reason}
                          </p>
                        </div>

                        {/* Customization Summary Tags */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Cấu hình nêm nếm độc quyền đã tạo:
                          </p>
                          {renderTasteSummaryTags(result.customization)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white font-extrabold text-sm shadow-lg shadow-orange-600/25 hover:shadow-orange-600/40 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>⚡</span>
                      <span>Thêm Món Đã Tùy Biến Vào Giỏ Hàng</span>
                    </button>

                    {/* Added Toast & Cart Link */}
                    {addedToast && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fade-in">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>✅</span>
                          <span>Đã thêm món vào giỏ hàng thành công!</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleViewCart}
                          className="font-bold underline text-emerald-900 hover:text-emerald-950 cursor-pointer ml-2"
                        >
                          Xem giỏ hàng / Thanh toán &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AITasteConciergeModal;
