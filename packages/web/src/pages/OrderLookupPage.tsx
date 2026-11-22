import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '../i18n';

export function OrderLookupPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setError(t.orderLookup.orderNumberPlaceholder);
      return;
    }
    if (!phone.trim()) {
      setError(t.orderLookup.phonePlaceholder);
      return;
    }

    navigate(`/orders/${orderNumber.trim()}?phone=${encodeURIComponent(phone.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">
      <main className="mx-auto max-w-lg px-4 py-16 flex-1 flex flex-col justify-center w-full">
        <div className="rounded-3xl bg-white p-8 border border-gray-200/90 shadow-2xs">
          <div className="text-center mb-6">
            <span className="text-4xl block mb-2">🔍</span>
            <h1 className="text-2xl font-black text-gray-900">{t.orderLookup.title}</h1>
            <p className="text-xs text-gray-500 mt-1">
              {t.orderLookup.subtitle}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-semibold">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t.orderLookup.orderNumberLabel}
              </label>
              <input
                type="text"
                required
                placeholder={t.orderLookup.orderNumberPlaceholder}
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t.orderLookup.phoneLabel}
              </label>
              <input
                type="tel"
                required
                placeholder={t.orderLookup.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-orange-500 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-orange-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
            >
              {t.orderLookup.lookupButton} →
            </button>

            <p className="text-[11px] text-gray-400 text-center mt-2">
              💡 {t.orderLookup.guestNotice}
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
