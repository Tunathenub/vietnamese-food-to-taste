import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api-client';

export interface KitchenBriefingResult {
  executiveSummary: string;
  palateTrends: string[];
  kitchenActionItems: string[];
  prepAdvice: string;
}

const DEFAULT_BRIEFING: KitchenBriefingResult = {
  executiveSummary:
    'Ca làm việc hôm nay ghi nhận tổng cộng 8 đơn hàng đang phục vụ. Tỷ trọng khách quốc tế chiếm ưu thế lớn với hai xu hướng vị giác phân hóa rõ rệt: khách du lịch Đông Á yêu cầu tăng mạnh độ cay nồng trong khi khách phương Tây ưu tiên giảm ngò gai và rau thơm mạnh mùi.',
  palateTrends: [
    'Nhu cầu cay nồng (+4/5) chiếm hơn 40% lượng đơn Phở Bò và Bún Chả, tập trung ở nhóm khách Hàn Quốc (+82) và khách trẻ.',
    'Gia tăng 35% yêu cầu loại bỏ hoàn toàn ngò gai và rau húng quế từ các du khách Âu - Mỹ tránh dị ứng vị nồng.',
    'Tỷ lệ chuyển đổi sang chả đậu hũ và đậu chiên chay tăng ổn định vào khung giờ trưa thanh đạm.',
    'Nước chấm bún chả duy trì tỷ lệ yêu cầu giảm ngọt 50% ở nhóm khách kiêng đường và khách quốc tế.',
  ],
  kitchenActionItems: [
    'Bộ phận sơ chế thái sẵn thêm 3 khay ớt hiểm tươi thái lát và 2 thố sa tế cay phục vụ ngay tại line nóng.',
    'Trạm rau thơm phân loại riêng 2 khay: Khay đầy đủ hành ngò chuẩn vị và Khay riêng biệt hoàn toàn không ngò gai (no-cilantro).',
    'Trạm bếp nước dùng duy trì nhiệt độ nồi phở ở 92°C - 95°C để đảm bảo thịt bò tái chín mềm và nước dùng trong vắt.',
    'Nướng sẵn gối đầu 20 phần chả viên than hoa sẵn sàng phục vụ nhanh các đơn giao gấp qua WhatsApp.',
  ],
  prepAdvice:
    'Tăng cường +50% ớt tươi cắt lát, tách sẵn khay rau không ngò gai và chuẩn bị sẵn 2 khay đậu phụ chiên giòn phục vụ đơn chay.',
};

export interface KitchenBriefingCardProps {
  className?: string;
}

export function KitchenBriefingCard({ className = '' }: KitchenBriefingCardProps) {
  const [timeframe, setTimeframe] = useState<'today' | 'week'>('today');
  const [briefing, setBriefing] = useState<KitchenBriefingResult>(DEFAULT_BRIEFING);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date>(() => new Date());

  const fetchBriefing = useCallback(
    async (targetTimeframe: 'today' | 'week' = timeframe) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.post<KitchenBriefingResult>('/api/ai/kitchen-briefing', {
          timeframe: targetTimeframe,
        });

        const data = res.data || (res as any);
        if (data && data.executiveSummary) {
          setBriefing({
            executiveSummary: data.executiveSummary,
            palateTrends: Array.isArray(data.palateTrends) ? data.palateTrends : [],
            kitchenActionItems: Array.isArray(data.kitchenActionItems) ? data.kitchenActionItems : [],
            prepAdvice: data.prepAdvice || '',
          });
          setLastGeneratedAt(new Date());
        } else if (res.error) {
          setError(res.error.message || 'Không thể tạo báo cáo vận hành bếp từ AI.');
        } else {
          setError('Phản hồi từ AI không đúng định dạng mong đợi.');
        }
      } catch (err: any) {
        setError(err?.message || 'Lỗi kết nối máy chủ AI briefing.');
      } finally {
        setLoading(false);
      }
    },
    [timeframe]
  );

  // Auto-fetch on mount and when timeframe changes
  useEffect(() => {
    fetchBriefing(timeframe);
  }, [timeframe]);

  const handleTimeframeChange = (newTimeframe: 'today' | 'week') => {
    if (newTimeframe !== timeframe) {
      setTimeframe(newTimeframe);
    }
  };

  const formattedTime = lastGeneratedAt
    ? lastGeneratedAt.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  return (
    <div
      className={`rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all ${className}`}
      data-testid="kitchen-briefing-card"
    >
      {/* Decorative Warm Ambient Glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pb-6 border-b border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>✨ Báo Cáo Vận Hành Bếp Bằng AI (AI Kitchen Operating Briefing)</span>
            </h2>
            <span className="rounded-full bg-orange-950/80 px-2.5 py-0.5 text-[10px] font-bold text-orange-400 border border-orange-600/50 uppercase tracking-wider">
              AI Real-time Ops
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Tự động tổng hợp dữ liệu đơn gọi món, tùy biến gia vị và khẩu vị thực khách thời gian thực để hướng dẫn bếp.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex rounded-xl bg-slate-800/90 p-1 border border-slate-700/60 shadow-inner">
            <button
              type="button"
              onClick={() => handleTimeframeChange('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                timeframe === 'today'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>☀️</span>
              <span>Hôm nay</span>
            </button>
            <button
              type="button"
              onClick={() => handleTimeframeChange('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                timeframe === 'week'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📅</span>
              <span>Tuần này</span>
            </button>
          </div>

          {/* Prominent Generate Button */}
          <button
            type="button"
            onClick={() => fetchBriefing(timeframe)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-orange-500/25 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Kích hoạt phân tích AI tổng hợp các đơn hàng mới nhất"
          >
            <span className={loading ? 'animate-spin' : ''}>✨</span>
            <span>{loading ? 'Đang phân tích...' : '✨ Sinh Báo Cáo AI Mới'}</span>
          </button>
        </div>
      </div>

      {/* Meta Bar: Timestamp & Status */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 py-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Trạng thái: Hoạt động liên tục</span>
          <span className="text-slate-600">•</span>
          <span>Khung giờ: {timeframe === 'today' ? 'Ca trong ngày' : 'Tổng hợp 7 ngày qua'}</span>
        </div>
        <div className="font-mono text-slate-400">
          🕒 Tạo lúc: <span className="text-amber-400 font-bold">{formattedTime}</span>
        </div>
      </div>

      {/* Defensive Error Alert */}
      {error && (
        <div className="relative z-10 my-4 rounded-xl bg-rose-950/40 border border-rose-800/60 p-4 text-xs text-rose-200 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-bold text-rose-100">Không thể kết nối AI Briefing</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchBriefing(timeframe)}
            className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-100 font-bold border border-rose-700/60 transition cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Executive Summary Card with warm kitchen gradient highlight */}
      <div className="relative z-10 mt-2 rounded-2xl bg-gradient-to-r from-amber-950/50 via-orange-950/40 to-rose-950/30 border border-amber-500/40 p-5 sm:p-6 shadow-xl overflow-hidden backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-lg">📋</span>
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
            TỔNG QUAN ĐIỀU HÀNH BẾP (EXECUTIVE SUMMARY)
          </h3>
        </div>
        {loading ? (
          <div className="space-y-2 animate-pulse py-2">
            <div className="h-4 bg-amber-500/20 rounded w-full" />
            <div className="h-4 bg-amber-500/20 rounded w-5/6" />
            <div className="h-4 bg-amber-500/20 rounded w-2/3" />
          </div>
        ) : (
          <p className="text-sm sm:text-base text-amber-50 font-medium leading-relaxed">
            {briefing.executiveSummary}
          </p>
        )}
      </div>

      {/* 3 Grid Columns / Sections */}
      <div className="relative z-10 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Palate Trends */}
        <div className="rounded-2xl bg-slate-950/60 border border-orange-900/40 p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-orange-500/60" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>🔥 Xu Hướng Khẩu Vị (Palate Trends)</span>
              </h3>
              <span className="text-[10px] font-bold text-orange-400 bg-orange-950/80 px-2 py-0.5 rounded-full border border-orange-700/40">
                Xu hướng
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Insights thống kê từ các tùy chỉnh vị giác của đơn hàng:
            </p>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-800/60 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {briefing.palateTrends.map((trend, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed flex items-start gap-3 hover:border-orange-500/40 transition shadow-sm"
                  >
                    <span className="flex-shrink-0 text-base">🌶️</span>
                    <span>{trend}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Kitchen Action Items */}
        <div className="rounded-2xl bg-slate-950/60 border border-amber-900/40 p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-500/60" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>👨‍🍳 Chỉ Đạo Chế Biến (Kitchen Action Items)</span>
              </h3>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-700/40">
                Chỉ đạo ca
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Hành động cụ thể cho đầu bếp line và trạm sơ chế nóng:
            </p>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-800/60 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {briefing.kitchenActionItems.map((action, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed flex items-start gap-3 hover:border-amber-500/40 transition shadow-sm"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] border border-amber-500/40 mt-0.5">
                      {index + 1}
                    </span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Prep Advice */}
        <div className="rounded-2xl bg-slate-950/60 border border-emerald-900/40 p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-emerald-500/60" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>💡 Mẹo Sơ Chế & Cân Đối (Prep Advice)</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/40">
                Sơ chế & Nêm
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Cân đối gia vị, tỷ lệ chuẩn bị gối đầu và lưu ý dị ứng:
            </p>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-24 bg-slate-800/60 rounded-xl" />
                <div className="h-16 bg-slate-800/60 rounded-xl" />
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Main Prep Advice Callout */}
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/40 text-emerald-100 text-xs sm:text-sm leading-relaxed shadow-sm">
                  <div className="font-bold text-emerald-300 flex items-center gap-2 mb-1.5">
                    <span>⚡ Trọng tâm chuẩn bị:</span>
                  </div>
                  <p>{briefing.prepAdvice}</p>
                </div>

                {/* Additional Seasoning Balance Tips */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>🧂 Cân đối nêm nếm & Gia vị phụ trợ:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                    <li>Nước mắm Phú Quốc truyền thống: Cân bằng chua ngọt bằng giấm tỏi ớt ngâm sẵn.</li>
                    <li>Khay rau thơm: Tách riêng rau mùi tàu (ngò gai) cho khách phương Tây.</li>
                    <li>Ớt tươi & Sa tế: Tăng thêm 50% lượng thái lát sẵn trong giờ cao điểm.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
