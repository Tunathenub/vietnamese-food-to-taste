import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { useAuthStore } from '../stores/auth-store';
import { api } from '../lib/api-client';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Mã liên kết xác thực không tồn tại hoặc không hợp lệ.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post<{ user?: any; message?: string }>('/auth/reset-password', { token, newPassword });

      if (res.error) {
        throw new Error(res.error.message || 'Có lỗi xảy ra khi đặt lại mật khẩu.');
      }

      setSuccess(true);
      if (res.data?.user) {
        login(res.data.user);
      }

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <div className="flex justify-center text-4xl mb-2">🔐</div>
          <h2 className="text-center text-2xl font-extrabold text-gray-900">
            Đặt lại mật khẩu mới
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Nhập mật khẩu mới an toàn cho tài khoản của bạn
          </p>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="text-green-700 text-sm bg-green-50 p-4 rounded-lg border border-green-200 text-center font-medium">
            ✅ Đặt lại mật khẩu thành công! Đang chuyển hướng về trang chủ...
          </div>
        )}

        {!token ? (
          <div className="text-center space-y-4">
            <p className="text-red-500 text-sm">
              Không tìm thấy token hợp lệ trên URL. Vui lòng yêu cầu lại liên kết quên mật khẩu.
            </p>
            <Link
              to="/auth"
              className="inline-block font-semibold text-orange-600 hover:text-orange-700"
            >
              ← Quay lại trang đăng nhập
            </Link>
          </div>
        ) : !success && (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Mật khẩu mới
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-white font-semibold bg-orange-600 hover:bg-orange-700 transition focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 text-sm shadow-sm"
            >
              {loading ? 'Đang cập nhật...' : 'Xác nhận đặt lại mật khẩu'}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/auth"
                className="text-xs font-medium text-gray-500 hover:text-orange-600"
              >
                ← Quay lại đăng nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
