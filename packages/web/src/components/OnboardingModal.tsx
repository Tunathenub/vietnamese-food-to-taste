import { useState } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { useTasteStore } from '../stores/taste-store';
import { api } from '../lib/api-client';

export function OnboardingModal() {
  const { user, updateOnboarding, token } = useAuthStore();
  const setCustomProfile = useTasteStore((state) => state.setCustomProfile);
  const [nationality, setNationality] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If user is not logged in or already has a nationality, don't show the modal
  if (!user || user.nationality) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationality.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/onboard', { nationality }, {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      });

      if (res.error) {
        throw new Error(res.error.message || 'Có lỗi xảy ra');
      }

      const { tastePreferences, dietaryRestrictions } = res.data;

      updateOnboarding(nationality, tastePreferences, dietaryRestrictions);
      
      // Update the taste store to match the AI preferences
      setCustomProfile({
        code: 'CUSTOM_AI',
        name: `Khẩu vị ${nationality} (AI)`,
        countryCode: 'AI',
        flag: '✨',
        description: 'Được hệ thống AI phân tích và tự động tối ưu dựa trên thói quen ẩm thực của quốc gia bạn.',
        defaults: tastePreferences,
      });
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chào mừng bạn! 👋</h2>
          <p className="text-gray-600 mb-6 text-sm">
            Để mang đến trải nghiệm hương vị chuẩn xác nhất, AI của chúng tôi sẽ tự động phân tích và 
            điều chỉnh độ mặn, ngọt, cay, mắm... của món ăn Việt Nam sao cho phù hợp nhất với khẩu vị chung của quê hương bạn!
          </p>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Quốc tịch / Vùng văn hóa của bạn:
              </label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="Ví dụ: Hàn Quốc, Mỹ, Nhật Bản, Ấn Độ..."
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>
            
            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !nationality.trim()}
              className="w-full bg-orange-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⌛</span> AI Đang phân tích khẩu vị...
                </>
              ) : (
                'Phân tích khẩu vị bằng AI ✨'
              )}
            </button>
          </form>
        </div>
        <div className="bg-slate-50 px-6 py-4 border-t border-gray-100 text-xs text-gray-500 text-center">
          Bạn có thể thay đổi các thông số gia vị này bất kỳ lúc nào trong lúc đặt món.
        </div>
      </div>
    </div>
  );
}
