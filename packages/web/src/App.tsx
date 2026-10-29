import { Routes, Route } from 'react-router';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { DishDetailPage } from './pages/DishDetailPage';
import { TasteProfilesPage } from './pages/TasteProfilesPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { OrderLookupPage } from './pages/OrderLookupPage';
import { OrderDetailPage } from './pages/OrderDetailPage';

import { Navbar } from './components/Navbar';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthPage } from './pages/AuthPage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <OnboardingModal />
      <main className="flex-grow">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/taste-profiles" element={<TasteProfilesPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/menu/:dishSlug" element={<DishDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/orders/success" element={<OrderSuccessPage />} />
      <Route path="/orders/lookup" element={<OrderLookupPage />} />
      <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
