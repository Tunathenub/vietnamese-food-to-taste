import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuthStore } from '../stores/auth-store';
import { useTasteStore, PRESET_PROFILES } from '../stores/taste-store';
import { api } from '../lib/api-client';

const POPULAR_COUNTRIES = [
  { code: 'Vietnam', label: 'Việt Nam (Vietnam)', flag: '🇻🇳', dialCode: '+84' },
  { code: 'South Korea', label: 'Hàn Quốc (South Korea)', flag: '🇰🇷', dialCode: '+82' },
  { code: 'Japan', label: 'Nhật Bản (Japan)', flag: '🇯🇵', dialCode: '+81' },
  { code: 'United States', label: 'Hoa Kỳ (United States)', flag: '🇺🇸', dialCode: '+1' },
  { code: 'Australia', label: 'Úc (Australia)', flag: '🇦🇺', dialCode: '+61' },
  { code: 'United Kingdom', label: 'Vương quốc Anh (UK)', flag: '🇬🇧', dialCode: '+44' },
  { code: 'France', label: 'Pháp (France)', flag: '🇫🇷', dialCode: '+33' },
  { code: 'Germany', label: 'Đức (Germany)', flag: '🇩🇪', dialCode: '+49' },
  { code: 'Canada', label: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'Singapore', label: 'Singapore', flag: '🇸🇬', dialCode: '+65' },
  { code: 'India', label: 'Ấn Độ (India)', flag: '🇮🇳', dialCode: '+91' },
  { code: 'Thailand', label: 'Thái Lan (Thailand)', flag: '🇹🇭', dialCode: '+66' },
  { code: 'OTHER', label: '🌍 Quốc gia khác...', flag: '🌍', dialCode: '+84' },
];

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryChoice, setCountryChoice] = useState('Vietnam');
  const [customCountry, setCustomCountry] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const setCustomProfile = useTasteStore((state) => state.setCustomProfile);
  const setActiveProfile = useTasteStore((state) => state.setActiveProfile);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const syncTastePreferences = (user: any) => {
    if (!user) return;
    
    // Check if user nationality matches preset
    const nat = (user.nationality || '').toLowerCase();
    if (nat.includes('việt') || nat.includes('vietnam')) {
      setActiveProfile('AUTHENTIC_VN');
    } else if (nat.includes('hàn') || nat.includes('korea')) {
      setActiveProfile('KR_INSPIRED');
    } else if (nat.includes('nhật') || nat.includes('japan')) {
      setActiveProfile('JP_DELICATE');
    } else if (nat.includes('mỹ') || nat.includes('hoa kỳ') || nat.includes('united states') || nat.includes('us')) {
      setActiveProfile('WESTERN_MILD');
    } else if (user.tastePreferences) {
      const prefs = typeof user.tastePreferences === 'string'
        ? JSON.parse(user.tastePreferences)
        : user.tastePreferences;
      
      setCustomProfile({
        code: 'CUSTOM_AI',
        name: `Khẩu vị ${user.nationality || 'Cá nhân hóa'} (AI)`,
        countryCode: 'AI',
        dialCode: '+84',
        flag: '✨',
        description: 'Tối ưu theo khẩu vị cá nhân đã lưu trong tài khoản của bạn.',
        defaults: prefs,
      });
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string, demoRole: 'CUSTOMER' | 'STAFF' = 'CUSTOMER') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      let loggedUser: any = null;
      let token = 'demo-jwt-token';

      try {
        const res = await api.post<{ user: any; token: string }>('/auth/login', {
          email: demoEmail,
          password: demoPass,
        });

        if (res.data?.user) {
          loggedUser = res.data.user;
          token = res.data.token;
        }
      } catch {
        // Fallback for demo login if API is down or user is not seeded
      }

      if (!loggedUser) {
        loggedUser = {
          id: demoRole === 'STAFF' ? 'usr-demo-staff' : 'usr-demo-customer',
          name: demoRole === 'STAFF' ? 'Trần Bếp Trưởng' : 'Khách hàng Demo',
          email: demoEmail,
          phone: demoRole === 'STAFF' ? '+84988776655' : '+84912345678',
          role: demoRole,
          nationality: 'Vietnam',
          tastePreferences: {
            spice_level: 2,
            sweetness: 2,
            sourness: 2,
            fish_sauce_intensity: 3,
            herb_intensity: 3,
            oil_richness: 2,
          },
        };
      }

      login(loggedUser, token);
      syncTastePreferences(loggedUser);

      const isStaff = loggedUser.role === 'STAFF' || loggedUser.role === 'ADMIN';
      setSuccessMsg(`✅ Đăng nhập thành công với vai trò ${isStaff ? '👨‍🍳 Nhân viên Bếp' : '👤 Khách hàng'}! Đang chuyển hướng...`);

      setTimeout(() => {
        if (!searchParams.get('redirect') && isStaff) {
          navigate('/staff/orders');
        } else {
          navigate(redirectUrl);
        }
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setDevResetUrl('');

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
        return;
      }
      if (password.length < 6) {
        setError('Mật khẩu phải có tối thiểu 6 ký tự.');
        return;
      }
      const selectedNat = countryChoice === 'OTHER' ? customCountry.trim() : countryChoice;
      if (!selectedNat) {
        setError('Vui lòng chọn hoặc nhập quốc gia của bạn.');
        return;
      }
      if (!phone.trim()) {
        setError('Vui lòng nhập số điện thoại liên hệ.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'forgot') {
        const res = await api.post<{ message: string; resetUrl?: string }>('/auth/forgot-password', { email });

        if (res.error) {
          throw new Error(res.error.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
        }

        setSuccessMsg(res.data?.message || 'Đã gửi hướng dẫn đặt lại mật khẩu.');
        if (res.data?.resetUrl) {
          setDevResetUrl(res.data.resetUrl);
        }
        return;
      }

      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const nationality = countryChoice === 'OTHER' ? customCountry.trim() : countryChoice;

      const payload = mode === 'login'
        ? { email, password }
        : { email, password, name, phone, nationality };

      const res = await api.post<{ user: any; token: string }>(endpoint, payload);

      if (res.error || !res.data) {
        throw new Error(res.error?.message || 'Đã có lỗi xảy ra trong quá trình xác thực.');
      }

      login(res.data.user, res.data.token);
      syncTastePreferences(res.data.user);

      const isStaff = res.data.user?.role === 'STAFF';
      setSuccessMsg(`✅ ${mode === 'login' ? 'Đăng nhập' : 'Đăng ký'} thành công! Đang chuyển hướng...`);

      setTimeout(() => {
        if (!searchParams.get('redirect') && isStaff) {
          navigate('/staff/orders');
        } else {
          navigate(redirectUrl);
        }
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-7 sm:p-9 rounded-3xl shadow-sm border border-gray-200">
        
        {/* Header Icon & Title */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-3xl mb-3 shadow-inner">
            {mode === 'login' ? '🍜' : mode === 'register' ? '✨' : '🔑'}
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {mode === 'login' && 'Đăng nhập tài khoản'}
            {mode === 'register' && 'Đăng ký thành viên mới'}
            {mode === 'forgot' && 'Khôi phục mật khẩu'}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {mode === 'login' && 'Chào mừng bạn quay lại với ẩm thực Việt tùy biến chuẩn vị'}
            {mode === 'register' && 'Lưu hồ sơ khẩu vị theo thói quen ẩm thực của đất nước bạn'}
            {mode === 'forgot' && 'Nhập email để nhận liên kết khôi phục mật khẩu'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-bold text-gray-600">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              mode === 'login' ? 'bg-white text-orange-600 shadow-xs' : 'hover:text-gray-900'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              mode === 'register' ? 'bg-white text-orange-600 shadow-xs' : 'hover:text-gray-900'
            }`}
          >
            Đăng ký
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('forgot');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              mode === 'forgot' ? 'bg-white text-orange-600 shadow-xs' : 'hover:text-gray-900'
            }`}
          >
            Quên MK
          </button>
        </div>

        {/* Quick Demo Login Box */}
        {mode === 'login' && (
          <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-3.5 space-y-2">
            <div className="text-[11px] font-bold text-orange-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>⚡</span> Tài khoản mẫu thử nghiệm (1-Click):
              </span>
              <span className="text-[10px] text-orange-600 font-normal">MK: password123</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('customer@demo.com', 'password123', 'CUSTOMER')}
                disabled={loading}
                className="text-left p-2.5 bg-white border border-orange-200 hover:border-orange-500 rounded-xl shadow-2xs transition group"
              >
                <div className="text-xs font-bold text-gray-800 group-hover:text-orange-600 flex items-center gap-1">
                  <span>👤</span> Khách hàng
                </div>
                <div className="text-[10px] text-gray-500 font-mono truncate mt-0.5">customer@demo.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('staff@demo.com', 'password123', 'STAFF')}
                disabled={loading}
                className="text-left p-2.5 bg-white border border-orange-200 hover:border-orange-500 rounded-xl shadow-2xs transition group"
              >
                <div className="text-xs font-bold text-gray-800 group-hover:text-orange-600 flex items-center gap-1">
                  <span>👨‍🍳</span> Nhân viên Bếp (STAFF)
                </div>
                <div className="text-[10px] text-gray-500 font-mono truncate mt-0.5">staff@demo.com</div>
              </button>
            </div>
          </div>
        )}

        {searchParams.get('notice') && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 flex items-start gap-2 shadow-xs">
            <span className="text-base leading-none">🛡️</span>
            <div className="font-medium leading-relaxed">{searchParams.get('notice')}</div>
          </div>
        )}

        {searchParams.get('redirect') && !searchParams.get('notice') && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 flex items-center gap-2">
            <span>🛒</span>
            <span>Bạn có thể đăng nhập để tiếp tục hoặc quay lại giỏ hàng đặt món nhanh với tư cách khách vãng lai.</span>
          </div>
        )}

        {error && (
          <div className="text-red-700 text-xs bg-red-50 p-3 rounded-xl border border-red-200 flex items-start gap-2">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="text-green-800 text-xs bg-green-50 p-3 rounded-xl border border-green-200 flex items-start gap-2">
            <span>✅</span>
            <div>{successMsg}</div>
          </div>
        )}

        {devResetUrl && (
          <div className="bg-orange-50 border border-orange-200 p-3.5 rounded-xl text-xs space-y-1.5">
            <div className="font-bold text-orange-900">🔗 Liên kết đặt lại mật khẩu (Môi trường Dev):</div>
            <a
              href={devResetUrl}
              className="inline-block text-orange-600 underline break-all font-mono hover:text-orange-800 text-[11px]"
            >
              Bấm vào đây để mở trang đặt lại mật khẩu mới →
            </a>
          </div>
        )}

        {/* Main Form */}
        <form className="space-y-4" onSubmit={handleAuthSubmit}>
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ví dụ: Nguyễn Văn An / John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ví dụ: 0912345678 / +84912345678"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Quốc gia / Nền văn hóa ẩm thực <span className="text-red-500">*</span>
                </label>
                <select
                  value={countryChoice}
                  onChange={(e) => setCountryChoice(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {POPULAR_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.label} ({c.dialCode})
                    </option>
                  ))}
                </select>

                {countryChoice === 'OTHER' && (
                  <input
                    type="text"
                    required
                    value={customCountry}
                    onChange={(e) => setCustomCountry(e.target.value)}
                    placeholder="Nhập tên quốc gia của bạn (VD: Italy, Spain...)"
                    className="mt-2 w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                )}
                <p className="mt-1.5 text-[11px] text-gray-500">
                  💡 AI sẽ tự động phân tích và cấu hình các chỉ số mặn, ngọt, cay, nước mắm cho các món ăn theo gu của quốc gia này.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Địa chỉ Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="name@example.com"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Tối thiểu 6 ký tự"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-sm"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Xác nhận mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Nhập lại mật khẩu vừa đặt"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-white font-bold bg-orange-600 hover:bg-orange-700 transition focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 text-sm shadow-sm mt-3"
          >
            {loading
              ? 'Đang xử lý...'
              : mode === 'login'
              ? 'Đăng nhập vào hệ thống →'
              : mode === 'register'
              ? 'Hoàn tất đăng ký & Kích hoạt khẩu vị ✨'
              : 'Gửi liên kết đặt lại mật khẩu ✉️'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-100">
          {mode === 'forgot' ? (
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs text-gray-600 hover:text-orange-600 font-semibold"
            >
              ← Quay lại Đăng nhập
            </button>
          ) : (
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
            >
              {mode === 'login'
                ? 'Chưa có tài khoản? Đăng ký ngay để lưu khẩu vị'
                : 'Đã có tài khoản? Bấm để Đăng nhập'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
