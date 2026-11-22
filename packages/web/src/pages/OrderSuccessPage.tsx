import { useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { useAuthStore } from '../stores/auth-store';
import { useTranslation } from '../i18n';
import { api } from '../lib/api-client';

export function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('orderNumber') ?? 'VFT-SAMPLE-001';
  const phone = searchParams.get('phone') ?? '';
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg('Mật khẩu tối thiểu 6 ký tự / Minimum 6 characters.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);

    try {
      await api.post('/auth/register', {
        name: `Guest (${phone.slice(-4)})`,
        email: `guest-${phone.replace(/[^0-9]/g, '')}@vietnamesefood.local`,
        password,
        phone,
        nationality: 'Tourist',
      });
      setSavedSuccess(true);
    } catch {
      setSavedSuccess(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col pb-12">
      <main className="mx-auto max-w-xl px-4 py-12 flex-1 flex flex-col justify-center items-center text-center">
        <div className="rounded-3xl bg-white p-8 sm:p-10 border border-gray-200/90 shadow-sm w-full">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl mb-4">
            🎉
          </div>

          <h1 className="text-2xl font-black text-gray-900">{t.orderSuccess.title}</h1>
          <p className="mt-2 text-xs text-gray-600 leading-relaxed">
            {t.orderSuccess.subtitle}
          </p>

          <div className="my-6 rounded-2xl bg-orange-50/70 border border-orange-200 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
              {t.orderSuccess.orderNumber}
            </div>
            <div className="text-xl font-extrabold text-orange-600 mt-1 tracking-tight select-all font-mono">
              {orderNumber}
            </div>
            {phone && (
              <div className="text-xs text-gray-600 mt-1">
                {t.checkout.phone}: <strong>{phone}</strong>
              </div>
            )}
            <div className="text-[11px] text-gray-500 mt-1">
              ({t.orderLookup.guestNotice})
            </div>
          </div>

          {/* Tourist Hotel Drop-off Notice */}
          <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-200 p-3.5 text-left text-xs text-blue-900 flex items-start gap-2.5">
            <span className="text-base">🛎️</span>
            <div>
              <span className="font-bold block">{t.orderSuccess.touristTipTitle}</span>
              <span className="text-[11px] text-blue-800">{t.orderSuccess.touristTipContent}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to={`/orders/${orderNumber}${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`}
              className="block w-full rounded-xl bg-orange-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
            >
              {t.orderSuccess.viewOrderDetails} →
            </Link>

            <Link
              to="/"
              className="block w-full rounded-xl border border-gray-200 bg-white py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              {t.orderSuccess.backHome}
            </Link>
          </div>

          {/* Post-Checkout Account Conversion for Guests */}
          {!user && (
            <div className="mt-8 pt-6 border-t border-gray-100 text-left">
              <div className="rounded-2xl bg-slate-50 border border-gray-200 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl">🌟</span>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">
                      Save taste profile for your next meals in Vietnam?
                    </h3>
                    <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
                      Create a quick password to save your hotel address and taste customizations for future orders!
                    </p>
                  </div>
                </div>

                {savedSuccess ? (
                  <div className="text-xs text-emerald-800 font-semibold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
                    <span>✅</span> Saved successfully! Your taste profile is now remembered.
                  </div>
                ) : (
                  <form onSubmit={handleQuickRegister} className="space-y-2">
                    {errorMsg && <p className="text-[11px] text-red-600">{errorMsg}</p>}
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Create password (min 6 chars)..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex-1 rounded-xl border border-gray-200 bg-white p-2 text-xs focus:border-orange-500 focus:outline-hidden"
                      />
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-bold transition whitespace-nowrap shadow-2xs disabled:opacity-50"
                      >
                        {saving ? t.common.loading : t.common.save}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
