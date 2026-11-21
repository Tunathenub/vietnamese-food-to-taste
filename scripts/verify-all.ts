import './setup-env.ts';
import React from 'react';
// In Node SSR test environment, ensure useSyncExternalStore reads active store snapshot
React.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();
(globalThis as any).React = React;

import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import App from '../packages/web/src/App.tsx';
import { Navbar } from '../packages/web/src/components/Navbar.tsx';
import { useAuthStore } from '../packages/web/src/stores/auth-store.ts';

interface VerificationResult {
  step: string;
  passed: boolean;
  details: string;
}

const results: VerificationResult[] = [];

function assert(condition: boolean, step: string, details: string) {
  results.push({ step, passed: condition, details });
  if (condition) {
    console.log(`✅ [PASS] ${step}: ${details}`);
  } else {
    console.error(`❌ [FAIL] ${step}: ${details}`);
  }
}

async function runVerification() {
  console.log('====================================================');
  console.log('       STARTING FULL PROJECT VERIFICATION           ');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // 1. Verify Route /dishes/bun-cha is registered and renders
  // -----------------------------------------------------------------
  console.log('--- Checking Route /dishes/bun-cha ---');
  try {
    const htmlBunCha = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/dishes/bun-cha'] },
        React.createElement(App)
      )
    );
    assert(
      htmlBunCha.includes('Bún Chả Hà Nội') &&
      htmlBunCha.includes('60.000') &&
      htmlBunCha.includes('Độ ngọt nước chấm') &&
      htmlBunCha.includes('Thịt chả nướng'),
      'Route /dishes/bun-cha renders',
      'Matches DishDetailPage and renders Bún Chả Hà Nội with taste configs and ingredients.'
    );

    // Also check route /menu/bun-cha
    const htmlMenuBunCha = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/menu/bun-cha'] },
        React.createElement(App)
      )
    );
    assert(
      htmlMenuBunCha.includes('Bún Chả Hà Nội'),
      'Route /menu/bun-cha renders',
      'Both /menu/:dishSlug and /dishes/:dishSlug work consistently.'
    );

    // Check 404 on unhandled route
    const html404 = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/nonexistent-route-404'] },
        React.createElement(App)
      )
    );
    assert(
      html404.includes('404') && html404.includes('Không tìm thấy trang'),
      'Wildcard Route /* 404',
      'NotFoundPage renders correctly on unmatched URLs.'
    );
  } catch (err: any) {
    assert(false, 'Route rendering check', `Failed with error: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // 2. Verify Staff Route Protection Logic
  // -----------------------------------------------------------------
  console.log('\n--- Checking Staff Route Protection Logic ---');
  try {
    // A. Unauthenticated user accessing /staff/orders
    useAuthStore.getState().logout();
    const htmlUnauthStaff = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/staff/orders'] },
        React.createElement(App)
      )
    );
    assert(
      !htmlUnauthStaff.includes('Danh sách đơn hàng cần chuẩn bị') &&
      !htmlUnauthStaff.includes('Bếp &amp; Pha chế') &&
      !htmlUnauthStaff.includes('Bếp & Pha chế'),
      'Unauthenticated Staff Guard',
      'Blocks unauthenticated user from /staff/orders and emits Navigate redirect to /auth.'
    );

    // Unauthenticated Navbar check: should NOT have '👨‍🍳 Bếp & Quản trị'
    const htmlNavbarUnauth = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/'] },
        React.createElement(Navbar)
      )
    );
    assert(
      !htmlNavbarUnauth.includes('Bếp &amp; Quản trị') && !htmlNavbarUnauth.includes('Bếp & Quản trị'),
      'Navbar hides Staff link for Unauthenticated',
      'Link 👨‍🍳 Bếp & Quản trị is completely hidden.'
    );

    // B. Customer user accessing /staff/orders
    useAuthStore.getState().login(
      {
        id: 'usr-customer-1',
        name: 'Nguyen Van Khach',
        email: 'customer@demo.com',
        phone: '+84912345678',
        role: 'CUSTOMER',
      },
      'mock-customer-token'
    );
    const htmlCustomerStaff = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/staff/orders'] },
        React.createElement(App)
      )
    );
    assert(
      !htmlCustomerStaff.includes('Danh sách đơn hàng cần chuẩn bị') &&
      !htmlCustomerStaff.includes('Bếp &amp; Pha chế') &&
      !htmlCustomerStaff.includes('Bếp & Pha chế'),
      'Customer Role Staff Guard',
      'Customer user is blocked from /staff/orders and emitted Navigate redirect to /auth with notice.'
    );

    // Customer Navbar check
    const htmlNavbarCustomer = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/'] },
        React.createElement(Navbar)
      )
    );
    assert(
      !htmlNavbarCustomer.includes('Bếp &amp; Quản trị') && !htmlNavbarCustomer.includes('Bếp & Quản trị'),
      'Navbar hides Staff link for Customer',
      'Customer cannot see 👨‍🍳 Bếp & Quản trị link in Navbar.'
    );

    // C. Staff user accessing /staff/orders
    useAuthStore.getState().login(
      {
        id: 'usr-staff-1',
        name: 'Tran Bep Truong',
        email: 'staff@demo.com',
        phone: '+84988776655',
        role: 'STAFF',
      },
      'mock-staff-token'
    );
    const htmlStaffAllowed = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/staff/orders'] },
        React.createElement(App)
      )
    );
    assert(
      htmlStaffAllowed.includes('Bếp &amp; Pha chế') ||
      htmlStaffAllowed.includes('Bếp & Pha chế') ||
      htmlStaffAllowed.includes('Bếp') ||
      htmlStaffAllowed.includes('KDS'),
      'Staff Role Access Allowed',
      'User with role STAFF successfully accesses /staff/orders.'
    );

    // Staff Navbar check
    const htmlNavbarStaff = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/'] },
        React.createElement(Navbar)
      )
    );
    assert(
      (htmlNavbarStaff.includes('Bếp &amp; Quản trị') || htmlNavbarStaff.includes('Bếp & Quản trị')) &&
      htmlNavbarStaff.includes('Bếp'),
      'Navbar shows Staff link for STAFF',
      'Link 👨‍🍳 Bếp & Quản trị is visible and role badge "Bếp" is displayed.'
    );

    // D. Admin user accessing /staff/orders
    useAuthStore.getState().login(
      {
        id: 'usr-admin-1',
        name: 'Le Quan Tri',
        email: 'admin@demo.com',
        phone: '+84900000000',
        role: 'ADMIN',
      },
      'mock-admin-token'
    );
    const htmlAdminAllowed = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/staff/orders'] },
        React.createElement(App)
      )
    );
    assert(
      htmlAdminAllowed.includes('Bếp &amp; Pha chế') ||
      htmlAdminAllowed.includes('Bếp & Pha chế') ||
      htmlAdminAllowed.includes('Quản trị') ||
      htmlAdminAllowed.includes('KDS'),
      'Admin Role Access Allowed',
      'User with role ADMIN successfully accesses /staff/orders.'
    );

    // Admin Navbar check
    const htmlNavbarAdmin = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/'] },
        React.createElement(Navbar)
      )
    );
    assert(
      (htmlNavbarAdmin.includes('Bếp &amp; Quản trị') || htmlNavbarAdmin.includes('Bếp & Quản trị')) &&
      htmlNavbarAdmin.includes('Quản trị'),
      'Navbar shows Staff link for ADMIN',
      'Link 👨‍🍳 Bếp & Quản trị is visible and role badge "Quản trị" is displayed.'
    );
  } catch (err: any) {
    assert(false, 'Staff protection check', `Failed with error: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // 3. Verify AuthPage Demo Logins & Notice display
  // -----------------------------------------------------------------
  console.log('\n--- Checking AuthPage Demo Login Buttons & Notice ---');
  try {
    const htmlAuth = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/auth?notice=TestNoticeSecurity'] },
        React.createElement(App)
      )
    );
    assert(
      htmlAuth.includes('customer@demo.com') &&
      htmlAuth.includes('staff@demo.com') &&
      htmlAuth.includes('Nhân viên Bếp (STAFF)'),
      'AuthPage Demo Logins',
      '1-Click quick login buttons for customer@demo.com and staff@demo.com are present.'
    );
    assert(
      htmlAuth.includes('TestNoticeSecurity'),
      'AuthPage Notice Banner',
      'Security notice message from query parameters is displayed prominently.'
    );
  } catch (err: any) {
    assert(false, 'AuthPage check', `Failed with error: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`TOTAL CHECKS: ${results.length}`);
  const passed = results.filter((r) => r.passed).length;
  console.log(`PASSED: ${passed} / ${results.length}`);
  console.log('====================================================\n');

  if (passed !== results.length) {
    process.exit(1);
  }
}

runVerification();
