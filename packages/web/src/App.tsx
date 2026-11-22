import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { DishDetailPage } from './pages/DishDetailPage';
import { TasteProfilesPage } from './pages/TasteProfilesPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { OrderLookupPage } from './pages/OrderLookupPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { StaffOrdersPage } from './pages/StaffOrdersPage';
import { StaffOrderDetailPage } from './pages/StaffOrderDetailPage';
import { TasteAnalyticsPage } from './pages/TasteAnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';

import { Navbar } from './components/Navbar';
import { OnboardingModal } from './components/OnboardingModal';
import { AITasteConciergeModal } from './components/AITasteConciergeModal';
import { useAuthStore } from './stores/auth-store';

function StaffRouteGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    const notice = 'Vui lòng đăng nhập với tài khoản Quản trị hoặc Nhân viên Bếp để truy cập khu vực này.';
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(location.pathname)}&notice=${encodeURIComponent(notice)}`}
        replace
        state={{ notice, redirect: location.pathname }}
      />
    );
  }

  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    const notice = 'Tài khoản của bạn không có quyền truy cập khu vực Bếp & Quản trị (yêu cầu vai trò STAFF hoặc ADMIN).';
    return (
      <Navigate
        to={`/auth?notice=${encodeURIComponent(notice)}`}
        replace
        state={{ notice }}
      />
    );
  }

  return <>{children}</>;
}

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <OnboardingModal />
      <AITasteConciergeModal />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/taste-profiles" element={<TasteProfilesPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/menu/:dishSlug" element={<DishDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/success" element={<OrderSuccessPage />} />
          <Route path="/orders/lookup" element={<OrderLookupPage />} />
          <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />
          <Route
            path="/staff/orders"
            element={
              <StaffRouteGuard>
                <StaffOrdersPage />
              </StaffRouteGuard>
            }
          />
          <Route
            path="/staff/orders/:orderNumber"
            element={
              <StaffRouteGuard>
                <StaffOrderDetailPage />
              </StaffRouteGuard>
            }
          />
          <Route
            path="/staff/analytics"
            element={
              <StaffRouteGuard>
                <TasteAnalyticsPage />
              </StaffRouteGuard>
            }
          />
          <Route path="/dishes/:dishSlug" element={<DishDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
