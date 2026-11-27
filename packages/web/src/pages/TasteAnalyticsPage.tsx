import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api-client';
import { TasteRadarChart, type RadarDimension } from '../components/TasteRadarChart';
import { KitchenBriefingCard } from '../components/KitchenBriefingCard';

interface DemographicMetric {
  countryCode: string;
  countryName: string;
  flag: string;
  orderCount: number;
  sharePercent: number;
  avgTotal: number;
}

interface AnalyticsOverview {
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

interface TasteRadarData {
  countryCode: string;
  countryName: string;
  dimensions: RadarDimension[];
  deviationScore: number;
  summaryText: string;
}

interface IngredientAdjustmentMetric {
  ingredient: string;
  category: 'HERB' | 'SPICE' | 'SAUCE' | 'TOPPING';
  omissionRate: number;
  boostRate: number;
  totalRequests: number;
  primaryTourist: string;
  kitchenRecommendation: string;
}

interface SubstitutionMetric {
  original: string;
  substitute: string;
  count: number;
  trend: 'UP' | 'STABLE';
  dietType: string;
  note: string;
}

const COUNTRY_OPTIONS = [
  { code: 'ALL', label: 'Toàn bộ du khách quốc tế 🌐' },
  { code: 'KR', label: 'Hàn Quốc 🇰🇷' },
  { code: 'US', label: 'Mỹ / Tây Âu 🇺🇸' },
  { code: 'JP', label: 'Nhật Bản 🇯🇵' },
  { code: 'SG', label: 'Singapore / Đông Nam Á 🇸🇬' },
  { code: 'VN', label: 'Khách nội địa Việt Nam 🇻🇳' },
];

export function TasteAnalyticsPage() {
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [radarData, setRadarData] = useState<TasteRadarData | null>(null);
  const [ingredients, setIngredients] = useState<IngredientAdjustmentMetric[]>([]);
  const [substitutions, setSubstitutions] = useState<SubstitutionMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, radarRes, ingRes, subRes] = await Promise.all([
        api.get<AnalyticsOverview>('/analytics/overview'),
        api.get<TasteRadarData>(`/analytics/taste-radar?countryCode=${selectedCountry}`),
        api.get<IngredientAdjustmentMetric[]>('/analytics/ingredients'),
        api.get<SubstitutionMetric[]>('/analytics/substitutions'),
      ]);

      if (overviewRes.data) setOverview(overviewRes.data);
      if (radarRes.data) setRadarData(radarRes.data);
      if (ingRes.data) setIngredients(ingRes.data);
      if (subRes.data) setSubstitutions(subRes.data);
    } catch (err) {
      console.warn('Error fetching taste analytics data:', err);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, [selectedCountry]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      let bearerToken: string | null = null;
      try {
        const stored = localStorage.getItem('vft-auth-storage');
        if (stored) {
          bearerToken = JSON.parse(stored)?.state?.token || null;
        }
      } catch {
        // ignore storage errors
      }
      const headers: Record<string, string> = {};
      if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
      }
      const res = await fetch('/api/analytics/export', {
        credentials: 'include',
        headers,
      });
      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taste-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">
                  Phân Tích Khẩu Vị Du Khách
                </h1>
                <span className="rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-600/50">
                  Taste Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Thống kê hành vi gia giảm gia vị, nguyên liệu và gu ẩm thực quốc tế
              </p>
            </div>
          </div>

          {/* Navigation & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
              <Link
                to="/staff/orders"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition"
              >
                <span>📋</span>
                <span>Bếp & KDS</span>
              </Link>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 text-white shadow-sm">
                <span>📊</span>
                <span>Phân tích</span>
              </span>
            </div>

            {/* Time range chips */}
            <div className="hidden md:flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 text-xs">
              {(['7d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    timeRange === range
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {range === '7d' ? '7 Ngày' : range === '30d' ? '30 Ngày' : 'Toàn bộ'}
                </button>
              ))}
            </div>

            {/* Export CSV button */}
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 px-3 py-2 text-xs font-bold text-emerald-300 border border-emerald-600/40 transition disabled:opacity-50"
              title="Tải báo cáo chi tiết về máy định dạng CSV cho Excel"
            >
              <span>{exporting ? '⏳' : '📥'}</span>
              <span>Xuất CSV</span>
            </button>

            {/* Refresh button */}
            <button
              onClick={fetchAnalytics}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-300 border border-slate-700 transition"
              title="Tải lại số liệu mới nhất"
            >
              <span>🔄</span>
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 flex-1 w-full space-y-8">
        {/* Top 4 KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Orders */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tổng đơn phân tích
              </span>
              <span className="text-xl">🍜</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">
                {overview?.totalOrdersAnalyzed ?? '...'}
              </span>
              <span className="text-xs text-emerald-400 font-bold">100% Thực tế</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Tổng doanh thu: {overview?.totalRevenueVnd.toLocaleString('vi-VN')}₫
            </p>
          </div>

          {/* Card 2: Customization Rate */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tỷ lệ tùy biến vị
              </span>
              <span className="text-xl">🎯</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-orange-400">
                {overview?.customizationRatePercent ?? '...'}%
              </span>
              <span className="text-xs text-emerald-400 font-bold">↑ Rất cao</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Đa phần du khách chủ động gia giảm vị
            </p>
          </div>

          {/* Card 3: Top Origin Country */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Top quốc gia du khách
              </span>
              <span className="text-xl">{overview?.topOriginFlag ?? '🌏'}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-300 truncate">
                {overview?.topOriginCountry ?? '...'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Chiếm tỷ trọng đặt món cao nhất
            </p>
          </div>

          {/* Card 4: Most Customized Dish */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Món được biến tấu nhiều nhất
              </span>
              <span className="text-xl">🏆</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300 truncate">
                {overview?.mostCustomizedDish ?? '...'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Nước chấm và độ cay biến thiên mạnh
            </p>
          </div>
        </section>

        {/* Middle Section: Taste Radar (Left) + Ingredient Trends (Right) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: 6-Dimensional Radar Chart (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
            <div>
              {/* Header with Country Dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>🎯</span>
                    <span>Ma Trận Sai Lệch Vị Giác (Taste Radar)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    So sánh 6 trục vị giác giữa công thức gốc và khẩu vị du khách
                  </p>
                </div>

                {/* Country Filter Select */}
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Radar Chart Display */}
              <div className="py-4 flex justify-center">
                {radarData && (
                  <TasteRadarChart
                    dimensions={radarData.dimensions}
                    touristName={radarData.countryName}
                  />
                )}
              </div>
            </div>

            {/* Radar Insights Footer */}
            {radarData && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/40 -mx-6 -mb-6 p-6 rounded-b-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">
                    Độ lệch tổng thể (Taste Deviation Score):
                  </span>
                  <span className="rounded-full bg-orange-950 text-orange-400 border border-orange-700/60 px-2.5 py-0.5 text-xs font-mono font-bold">
                    {radarData.deviationScore} / 5.0 điểm
                  </span>
                </div>
                <p className="text-xs text-slate-400 italic">
                  💡 {radarData.summaryText}
                </p>

                {/* Horizontal mini-bars for each dimension */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/60">
                  {radarData.dimensions.map((dim) => {
                    const diff = dim.difference;
                    const isPositive = diff > 0;
                    return (
                      <div
                        key={dim.key}
                        className="bg-slate-900/80 rounded-lg p-2 border border-slate-800 text-[11px]"
                      >
                        <div className="text-slate-400 truncate">{dim.label}</div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="font-mono font-bold text-white">
                            {dim.tourist} <span className="text-slate-500 text-[10px]">/ 5</span>
                          </span>
                          <span
                            className={`font-mono text-[10px] font-bold ${
                              diff === 0
                                ? 'text-slate-400'
                                : isPositive
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Ingredients Adjustment & Substitutions (5 cols) */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            {/* Box 1: Ingredient Omission & Boost */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🌿</span>
                  <span>Nguyên Liệu Gia Giảm Nhiều Nhất</span>
                </h2>
                <span className="text-[10px] text-slate-500 font-mono">Top xu hướng</span>
              </div>

              <div className="divide-y divide-slate-800/60 mt-2">
                {ingredients.map((ing, i) => (
                  <div key={ing.ingredient} className="py-3 first:pt-2 last:pb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">#{i + 1}</span>
                        <span className="text-xs font-bold text-slate-200">
                          {ing.ingredient}
                        </span>
                      </div>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                        {ing.primaryTourist}
                      </span>
                    </div>

                    {/* Split Percentage Bar: Red (Omission) vs Green (Boost) */}
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${ing.omissionRate}%` }}
                        className="bg-rose-500 h-full transition-all duration-500"
                        title={`Tỷ lệ bỏ/giảm: ${ing.omissionRate}%`}
                      />
                      <div
                        style={{ width: `${ing.boostRate}%` }}
                        className="bg-emerald-500 h-full transition-all duration-500"
                        title={`Tỷ lệ thêm: ${ing.boostRate}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] mt-1 text-slate-400 font-mono">
                      <span className="text-rose-400">Bỏ/Giảm: {ing.omissionRate}%</span>
                      <span className="text-emerald-400">Tăng thêm: {ing.boostRate}%</span>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      👨‍🍳 {ing.kitchenRecommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 2: Substitutions Matrix */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🔄</span>
                  <span>Ma Trận Thay Thế (Substitutions)</span>
                </h2>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/60">
                  Ăn kiêng / Chay
                </span>
              </div>

              <div className="space-y-3 mt-3">
                {substitutions.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-300">
                        {sub.substitute}
                      </span>
                      <span className="font-mono font-bold text-slate-400 text-[11px]">
                        {sub.count} lượt
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Thay cho: <span className="text-slate-300 line-through">{sub.original}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Mục đích: {sub.dietType}</span>
                      <span className="text-emerald-400 font-semibold">Xu hướng: ↑ Tăng</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Kitchen Intelligence & AI Operating Briefing */}
        <section className="space-y-8">
          {/* AI Kitchen Operating Briefing Live Card */}
          <KitchenBriefingCard />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* AI Kitchen Insights (6 cols) */}
            <div className="lg:col-span-6 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <span>💡</span>
                <span>Khuyến Nghị Vận Hành Bếp (Kitchen Intelligence)</span>
              </h2>

            <div className="space-y-3.5">
              {overview?.aiKitchenInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    insight.type === 'ALERT'
                      ? 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                      : insight.type === 'PREP'
                      ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                      : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                  }`}
                >
                  <span className="text-2xl">{insight.icon}</span>
                  <div>
                    <h3 className="font-bold text-white text-sm">{insight.title}</h3>
                    <p className="mt-1 leading-relaxed opacity-90">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demographics Breakdown (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <span>🌏</span>
              <span>Cơ Cấu Khách Hàng Quốc Tế</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-2.5 font-bold">Quốc gia</th>
                    <th className="pb-2.5 font-bold text-center">Số đơn</th>
                    <th className="pb-2.5 font-bold text-center">Thị phần</th>
                    <th className="pb-2.5 font-bold text-right">Chi tiêu TB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {overview?.demographics.map((demo) => (
                    <tr key={demo.countryCode} className="hover:bg-slate-800/30">
                      <td className="py-3 font-sans font-semibold text-slate-200 flex items-center gap-2">
                        <span>{demo.flag}</span>
                        <span>{demo.countryName}</span>
                      </td>
                      <td className="py-3 text-center text-slate-300 font-bold">
                        {demo.orderCount}
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${demo.sharePercent}%` }}
                              className="h-full bg-orange-500 rounded-full"
                            />
                          </div>
                          <span className="text-slate-400 text-[11px]">{demo.sharePercent}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-right text-emerald-400 font-bold">
                        {demo.avgTotal.toLocaleString('vi-VN')}₫
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </section>
      </main>
    </div>
  );
}
