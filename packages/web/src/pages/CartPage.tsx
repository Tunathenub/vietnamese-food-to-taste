import { Link, useNavigate } from 'react-router';
import { useCartStore } from '../stores/cart-store';
import { useAuthStore } from '../stores/auth-store';
import { useTranslation } from '../i18n';

export function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const { t, formatPrice } = useTranslation();

  const handleCheckoutClick = () => {
    navigate('/checkout');
  };

  const subtotal = items.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);

  const getTasteLabel = (k: string) => {
    const attr = t.taste.attributes[k as keyof typeof t.taste.attributes];
    return attr ? attr.name.split(' (')[0] : k;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{t.cart.title}</h1>
            <p className="text-xs text-gray-500 mt-1">
              {t.cart.tasteAdjusted} & {t.cart.ingredientsAdjusted}
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
            >
              {t.taste.resetDefaults}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-gray-200/90 shadow-2xs">
            <span className="text-5xl block mb-4">🛒</span>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{t.cart.emptyTitle}</h2>
            <p className="text-xs text-gray-500 mb-6 max-w-md mx-auto">
              {t.cart.emptySubtitle}
            </p>
            <Link
              to="/menu"
              className="inline-block rounded-xl bg-orange-600 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
            >
              {t.cart.exploreMenu} →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Items list */}
            <div className="lg:col-span-8 space-y-4">
              {items.map((item, idx) => (
                <div
                  key={`${item.dishId}-${idx}`}
                  className="rounded-2xl bg-white p-5 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between mb-1">
                      <h2 className="text-base font-bold text-gray-900">{item.dishName}</h2>
                      <span className="font-extrabold text-orange-600 text-sm">
                        {formatPrice(item.basePrice * item.quantity)}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 mb-3">
                      {t.common.price}: {formatPrice(item.basePrice, false)}
                    </div>

                    {/* Taste customization pills */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {Object.entries(item.tasteValues).map(([k, v]) => (
                        <span
                          key={k}
                          className="rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-800 border border-orange-100"
                        >
                          {getTasteLabel(k)}: {v}/5
                        </span>
                      ))}
                    </div>

                    {/* Substitutions or notes */}
                    {item.substitutionIds.length > 0 && (
                      <div className="text-[11px] text-green-700 font-semibold mb-1">
                        🥗 {t.dish.substitutionsTitle}
                      </div>
                    )}

                    {item.notes && (
                      <div className="text-[11px] text-gray-500 italic">
                        {t.dish.specialNotes}: "{item.notes}"
                      </div>
                    )}
                  </div>

                  {/* Quantity & Remove */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100">
                    <div className="flex items-center rounded-lg border border-gray-200 bg-slate-50 p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity > 1) updateQuantity(idx, item.quantity - 1);
                          else removeItem(idx);
                        }}
                        className="h-7 w-7 rounded-sm font-bold text-gray-600 hover:bg-gray-200 text-xs"
                      >
                        -
                      </button>
                      <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className="h-7 w-7 rounded-sm font-bold text-gray-600 hover:bg-gray-200 text-xs"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-[11px] text-red-500 hover:text-red-700 hover:underline"
                    >
                      {t.cart.removeItem}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Box */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-2xs sticky top-20">
                <h3 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                  {t.cart.orderSummary}
                </h3>

                <div className="space-y-2.5 text-xs text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>{t.common.subtotal}:</span>
                    <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.cart.deliveryFee}:</span>
                    <span className="text-gray-500">{t.checkout.pickup} ({t.cart.freeDelivery}) / 🛵</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline mb-6">
                  <span className="font-bold text-sm text-gray-900">{t.common.total}:</span>
                  <span className="text-xl font-black text-orange-600">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  className="w-full rounded-xl bg-orange-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-orange-700 transition"
                >
                  {t.cart.proceedCheckout} →
                </button>

                {!user && (
                  <p className="mt-2 text-center text-[11px] text-gray-500">
                    💡 {t.orderLookup.guestNotice}
                  </p>
                )}

                <Link
                  to="/menu"
                  className="mt-3 block text-center text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  {t.common.backToMenu}
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
