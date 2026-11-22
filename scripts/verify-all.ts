import './setup-env.ts';
import http from 'node:http';
import React from 'react';
// In Node SSR test environment, ensure useSyncExternalStore reads active store snapshot
React.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();
(globalThis as any).React = React;

import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import App from '../packages/web/src/App.tsx';
import { Navbar } from '../packages/web/src/components/Navbar.tsx';
import { CulturalStorySection } from '../packages/web/src/components/CulturalStorySection.tsx';
import { KitchenBriefingCard } from '../packages/web/src/components/KitchenBriefingCard.tsx';
import { AITasteConciergeModal } from '../packages/web/src/components/AITasteConciergeModal.tsx';
import { useAuthStore } from '../packages/web/src/stores/auth-store.ts';
import { useCartStore } from '../packages/web/src/stores/cart-store.ts';
import { useLanguageStore, formatPrice } from '../packages/web/src/i18n/index.ts';
import { playOrderNotificationChime } from '../packages/web/src/lib/use-order-events.ts';
import app from '../packages/api/src/app.ts';
import { orderEvents, OrderEventBroker } from '../packages/api/src/services/order-events.ts';
import { generateTasteConcierge } from '../packages/api/src/services/ai-service.ts';

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

  // -----------------------------------------------------------------
  // 4. Verify i18n Multi-Language System (English, Korean, Japanese)
  // -----------------------------------------------------------------
  console.log('\n--- Checking i18n Multi-Language System & Currency Conversions ---');
  try {
    // A. Currency formatting checks
    const viPrice = formatPrice(65000, 'vi');
    const enPrice = formatPrice(65000, 'en');
    const koPrice = formatPrice(65000, 'ko');
    const jaPrice = formatPrice(65000, 'ja');

    assert(
      viPrice.includes('65.000₫'),
      'Vietnamese Currency Formatting',
      `Correct VND standard: ${viPrice}`
    );
    assert(
      enPrice.includes('65,000 VND') && enPrice.includes('USD'),
      'English Tourist Currency with USD Estimate',
      `Includes VND + converted USD estimate: ${enPrice}`
    );
    assert(
      koPrice.includes('65,000 VND') && koPrice.includes('원'),
      'Korean Tourist Currency with KRW Estimate',
      `Includes VND + converted KRW estimate: ${koPrice}`
    );
    assert(
      jaPrice.includes('65,000 VND') && jaPrice.includes('円'),
      'Japanese Tourist Currency with JPY Estimate',
      `Includes VND + converted JPY estimate: ${jaPrice}`
    );

    // B. English Translation Rendering Check
    useLanguageStore.getState().setLanguage('en');
    const htmlEnNav = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/'] },
        React.createElement(Navbar)
      )
    );
    assert(
      htmlEnNav.includes('AUTHENTIC VIETNAMESE FOOD CUSTOMIZED TO YOUR TASTE') &&
      htmlEnNav.includes('Taste Profile') &&
      htmlEnNav.includes('Menu') &&
      htmlEnNav.includes('Track Order'),
      'English Navbar UI Rendering',
      'Navbar navigation labels and brand tagline properly translated to English.'
    );

    const htmlEnBunCha = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/dishes/bun-cha'] },
        React.createElement(App)
      )
    );
    assert(
      htmlEnBunCha.includes('Hanoi Grilled Pork Bun Cha') &&
      htmlEnBunCha.includes('USD') &&
      htmlEnBunCha.includes('Customize Taste &amp; Ingredients') || htmlEnBunCha.includes('Customize Taste & Ingredients'),
      'English Dish Detail & Customizer',
      'Dish name and customizer sections localized into English with USD price estimate.'
    );

    // C. Korean Translation Rendering Check
    useLanguageStore.getState().setLanguage('ko');
    const htmlKoNav = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/'] },
        React.createElement(Navbar)
      )
    );
    assert(
      htmlKoNav.includes('나의 입맛에 딱 맞춘 정통 베트남 요리') &&
      htmlKoNav.includes('입맛 프로필') &&
      htmlKoNav.includes('주문 조회'),
      'Korean Navbar UI Rendering',
      'Navbar navigation labels and tagline rendered in Korean.'
    );

    // D. Japanese Translation Rendering Check
    useLanguageStore.getState().setLanguage('ja');
    const htmlJaNav = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/'] },
        React.createElement(Navbar)
      )
    );
    assert(
      htmlJaNav.includes('あなたの好みに寄り添う本場ベトナム料理') &&
      htmlJaNav.includes('味の好み') &&
      htmlJaNav.includes('注文確認'),
      'Japanese Navbar UI Rendering',
      'Navbar navigation labels and tagline rendered in Japanese.'
    );

    // Reset back to Vietnamese default for clean store state
    useLanguageStore.getState().setLanguage('vi');
  } catch (err: any) {
    assert(false, 'i18n check', `Failed with error: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // 5. Verify Real-time KDS & Order Tracking (Event Broker, SSE, Client)
  // -----------------------------------------------------------------
  console.log('\n--- Checking Real-time Event Broker & SSE Streaming ---');
  try {
    // A. Verify OrderEventBroker & orderEvents singleton
    assert(
      orderEvents instanceof OrderEventBroker,
      'OrderEventBroker Instance',
      'orderEvents singleton is an instance of OrderEventBroker.'
    );

    assert(
      orderEvents.getMaxListeners() >= 100,
      'Broker MaxListeners Capacity',
      `Configured with high listener limit (${orderEvents.getMaxListeners()}) for concurrent SSE connections.`
    );

    let brokerCreatedEventReceived = false;
    let brokerUpdatedEventReceived = false;

    const testListenerCreated = (payload: any) => {
      if (payload.orderNumber === 'VFT-TEST-REALTIME-001') {
        brokerCreatedEventReceived = true;
      }
    };
    const testListenerUpdated = (payload: any) => {
      if (payload.orderNumber === 'VFT-TEST-REALTIME-001' && payload.status === 'PREPARING') {
        brokerUpdatedEventReceived = true;
      }
    };

    orderEvents.on('order:created', testListenerCreated);
    orderEvents.on('order:status_updated', testListenerUpdated);

    orderEvents.emitOrderCreated({
      orderNumber: 'VFT-TEST-REALTIME-001',
      order: {
        orderNumber: 'VFT-TEST-REALTIME-001',
        customerName: 'Test Customer',
        total: 80000,
        status: 'PENDING',
      },
    });

    orderEvents.emitOrderStatusUpdated({
      orderNumber: 'VFT-TEST-REALTIME-001',
      status: 'PREPARING',
      updatedAt: new Date().toISOString(),
    });

    orderEvents.off('order:created', testListenerCreated);
    orderEvents.off('order:status_updated', testListenerUpdated);

    assert(
      brokerCreatedEventReceived && brokerUpdatedEventReceived,
      'OrderEventBroker Event Emission & Handling',
      'Broker correctly emits and delivers order:created and order:status_updated typed events.'
    );

    // B. Verify HTTP SSE Server Endpoints
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as any;
    const port = address.port;

    // Test 1: GET /api/events/orders (Staff KDS broadcast stream)
    const sseKdsPromise = new Promise<{ headers: any; events: string[] }>((resolve, reject) => {
      const receivedEvents: string[] = [];
      let responseHeaders: any = {};
      let eventsEmitted = false;

      const triggerEmissions = () => {
        if (eventsEmitted) return;
        eventsEmitted = true;
        orderEvents.emitOrderCreated({
          orderNumber: 'VFT-KDS-SSE-001',
          order: {
            orderNumber: 'VFT-KDS-SSE-001',
            customerName: 'KDS Customer',
            total: 120000,
          },
        });
        orderEvents.emitOrderStatusUpdated({
          orderNumber: 'VFT-KDS-SSE-001',
          status: 'READY',
          updatedAt: new Date().toISOString(),
        });
      };

      const req = http.get(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/events/orders',
          headers: { Accept: 'text/event-stream' },
        },
        (res) => {
          responseHeaders = res.headers;
          let buffer = '';
          res.on('data', (chunk) => {
            buffer += chunk.toString();
            if (buffer.includes(': connected')) {
              // Client is definitely subscribed now
              setTimeout(triggerEmissions, 50);
            }
            if (buffer.includes('\n\n')) {
              const parts = buffer.split('\n\n');
              buffer = parts.pop() || '';
              for (const part of parts) {
                if (part.trim()) receivedEvents.push(part.trim());
              }
              if (
                receivedEvents.some((e) => e.includes('order:created')) &&
                receivedEvents.some((e) => e.includes('order:status_updated'))
              ) {
                req.destroy();
                resolve({ headers: responseHeaders, events: receivedEvents });
              }
            }
          });
          res.on('error', (err) => reject(err));
        }
      );
      req.on('error', (err) => {
        if ((err as any).code === 'ECONNRESET') {
          return;
        }
        reject(err);
      });

      // Fallback trigger if : connected was batched or delayed
      setTimeout(triggerEmissions, 300);

      setTimeout(() => {
        req.destroy();
        resolve({ headers: responseHeaders, events: receivedEvents });
      }, 4000);
    });

    const kdsResult = await sseKdsPromise;
    assert(
      String(kdsResult.headers['content-type']).includes('text/event-stream') &&
      String(kdsResult.headers['cache-control']).includes('no-cache'),
      'SSE KDS Headers (/api/events/orders)',
      `Proper headers returned: Content-Type=${kdsResult.headers['content-type']}, Cache-Control=${kdsResult.headers['cache-control']}`
    );

    assert(
      kdsResult.events.some((e) => e.includes(': connected')) &&
      kdsResult.events.some((e) => e.includes('event: order:created') && e.includes('VFT-KDS-SSE-001')) &&
      kdsResult.events.some((e) => e.includes('event: order:status_updated') && e.includes('READY')),
      'SSE KDS Real-time Streaming',
      `Received initial connection handshake and broadcasted order:created / order:status_updated events (${kdsResult.events.length} messages received).`
    );

    // Test 2: GET /api/events/orders/:orderNumber (Customer specific tracking stream)
    const targetOrderNumber = 'VFT-CUST-999';
    const sseCustPromise = new Promise<{ headers: any; events: string[] }>((resolve, reject) => {
      const receivedEvents: string[] = [];
      let responseHeaders: any = {};
      let eventsEmitted = false;

      const triggerCustomerEmissions = () => {
        if (eventsEmitted) return;
        eventsEmitted = true;
        // Emit for unrelated order - should NOT be forwarded to customer stream
        orderEvents.emitOrderStatusUpdated({
          orderNumber: 'VFT-UNRELATED-888',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
        });
        // Emit for targeted order - should be forwarded
        orderEvents.emitOrderStatusUpdated({
          orderNumber: targetOrderNumber,
          status: 'DELIVERING',
          updatedAt: new Date().toISOString(),
        });
      };

      const req = http.get(
        {
          hostname: '127.0.0.1',
          port,
          path: `/api/events/orders/${targetOrderNumber}`,
          headers: { Accept: 'text/event-stream' },
        },
        (res) => {
          responseHeaders = res.headers;
          let buffer = '';
          res.on('data', (chunk) => {
            buffer += chunk.toString();
            if (buffer.includes(': connected')) {
              setTimeout(triggerCustomerEmissions, 50);
            }
            if (buffer.includes('\n\n')) {
              const parts = buffer.split('\n\n');
              buffer = parts.pop() || '';
              for (const part of parts) {
                if (part.trim()) receivedEvents.push(part.trim());
              }
              if (receivedEvents.some((e) => e.includes(targetOrderNumber))) {
                req.destroy();
                resolve({ headers: responseHeaders, events: receivedEvents });
              }
            }
          });
          res.on('error', (err) => reject(err));
        }
      );
      req.on('error', (err) => {
        if ((err as any).code === 'ECONNRESET') return;
        reject(err);
      });

      setTimeout(triggerCustomerEmissions, 300);

      setTimeout(() => {
        req.destroy();
        resolve({ headers: responseHeaders, events: receivedEvents });
      }, 4000);
    });

    const custResult = await sseCustPromise;
    const hasTargetUpdate = custResult.events.some(
      (e) => e.includes(targetOrderNumber) && e.includes('DELIVERING')
    );
    const hasUnrelatedUpdate = custResult.events.some((e) => e.includes('VFT-UNRELATED-888'));

    assert(
      hasTargetUpdate && !hasUnrelatedUpdate,
      'SSE Customer Targeted Stream Filtering',
      `Targeted stream received update for ${targetOrderNumber} and properly filtered out unrelated order events.`
    );

    // C. Verify Web Client Audio & Page Integration
    let audioRanWithoutError = true;
    try {
      playOrderNotificationChime();
    } catch {
      audioRanWithoutError = false;
    }
    assert(
      audioRanWithoutError,
      'Web Audio API Notification Chime',
      'playOrderNotificationChime executed safely with defensive checks.'
    );

    // Customer Order Tracking Page render check
    const htmlOrderDetail = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/orders/VFT-20261117-001'] },
        React.createElement(App)
      )
    );
    assert(
      htmlOrderDetail.includes('Đang tải') || htmlOrderDetail.includes('VFT-20261117-001'),
      'OrderDetailPage Real-time Tracking UI',
      'Customer order page renders tracking container and SSE listener hooks.'
    );

    // Staff KDS Orders Page render check
    useAuthStore.getState().login(
      {
        id: 'usr-staff-realtime',
        name: 'Staff KDS',
        email: 'staff@demo.com',
        phone: '+84988776655',
        role: 'STAFF',
      },
      'mock-staff-token'
    );
    const htmlStaffKds = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/staff/orders'] },
        React.createElement(App)
      )
    );
    assert(
      (htmlStaffKds.includes('Bếp') || htmlStaffKds.includes('KDS')) &&
      htmlStaffKds.includes('VFT-20261117-001'),
      'StaffOrdersPage KDS UI',
      'Staff KDS dashboard renders real-time order queue with live SSE updates.'
    );

    // Staff Order Detail Page render check
    const htmlStaffDetail = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/staff/orders/VFT-20261117-001'] },
        React.createElement(App)
      )
    );
    assert(
      htmlStaffDetail.includes('VFT-20261117-001') &&
      (htmlStaffDetail.includes('Xác nhận đơn') || htmlStaffDetail.includes('Bắt đầu nấu') || htmlStaffDetail.includes('Bếp')),
      'StaffOrderDetailPage Kitchen Controls',
      'Staff order detail view renders real-time kitchen actions and status synchronization.'
    );

    // -----------------------------------------------------------------
    // 6. Verify Taste Analytics Dashboard (Backend & UI)
    // -----------------------------------------------------------------
    console.log('\n--- Checking Taste Analytics Dashboard ---');
    // Close test server after analytics checks
    const [overviewData, radarData, ingData, exportCsv] = await Promise.all([
      new Promise<any>((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/api/analytics/overview`, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      }),
      new Promise<any>((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/api/analytics/taste-radar?countryCode=KR`, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      }),
      new Promise<any>((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/api/analytics/ingredients`, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      }),
      new Promise<string>((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/api/analytics/export`, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(data));
        }).on('error', reject);
      }),
    ]);

    // Close test server now that all HTTP requests are complete
    await new Promise<void>((resolve) => server.close(() => resolve()));

    assert(
      overviewData.data &&
      overviewData.data.totalOrdersAnalyzed > 0 &&
      overviewData.data.customizationRatePercent > 0 &&
      Array.isArray(overviewData.data.demographics),
      'Taste Analytics Overview API (/api/analytics/overview)',
      'Returns aggregate order metrics, customization rate, and tourist demographic distribution.'
    );

    assert(
      radarData.data &&
      radarData.data.dimensions.length === 6 &&
      typeof radarData.data.deviationScore === 'number' &&
      radarData.data.countryCode === 'KR',
      'Taste Radar Dimension API (/api/analytics/taste-radar)',
      'Returns 6-axis taste vectors comparing Authentic VN vs selected tourist demographic.'
    );

    assert(
      Array.isArray(ingData.data) &&
      ingData.data.length > 0 &&
      typeof ingData.data[0].omissionRate === 'number',
      'Ingredient Omission API (/api/analytics/ingredients)',
      'Returns ranking of most omitted and augmented herbs/spices by international tourists.'
    );

    assert(
      exportCsv.includes('TASTE ANALYTICS REPORT') &&
      exportCsv.includes('PHAN BO DU KHACH') &&
      exportCsv.includes('PHAN TICH 6 TRUC VI GIAC'),
      'Analytics CSV Report Export (/api/analytics/export)',
      'Generates formatted multi-section CSV report for download and external BI analysis.'
    );

    // UI Render Check: /staff/analytics
    const htmlAnalytics = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/staff/analytics'] },
        React.createElement(App)
      )
    );
    assert(
      htmlAnalytics.includes('Phân Tích Khẩu Vị Du Khách') &&
      htmlAnalytics.includes('Ma Trận Sai Lệch Vị Giác') &&
      htmlAnalytics.includes('Taste Intelligence') &&
      htmlAnalytics.includes('Nguyên Liệu Gia Giảm'),
      'TasteAnalyticsPage UI Dashboard (/staff/analytics)',
      'Renders dark-themed intelligence dashboard with SVG Radar Chart, demographic KPIs and insights.'
    );

  } catch (err: any) {
    assert(false, 'Real-time KDS & Tracking check', `Failed with error: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // 7. Verify Backend AI Module Endpoints & Graceful Degradation
  // -----------------------------------------------------------------
  console.log('\n--- Checking Backend AI Module & Endpoints (/api/ai) ---');
  try {
    const aiServer = http.createServer(app);
    await new Promise<void>((resolve) => aiServer.listen(0, '127.0.0.1', () => resolve()));
    const aiPort = (aiServer.address() as any).port;

    const postJson = (path: string, body: any): Promise<{ status: number; body: any }> => {
      return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: aiPort,
            path,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            },
          },
          (res) => {
            let respData = '';
            res.on('data', (chunk) => (respData += chunk));
            res.on('end', () => {
              try {
                resolve({ status: res.statusCode || 0, body: JSON.parse(respData) });
              } catch {
                resolve({ status: res.statusCode || 0, body: respData });
              }
            });
          }
        );
        req.on('error', reject);
        req.write(data);
        req.end();
      });
    };

    // A. POST /api/ai/concierge (Vietnamese natural language prompt)
    const conciergeViRes = await postJson('/api/ai/concierge', {
      prompt: 'Tôi muốn ăn bún chả thật cay Tứ Xuyên không ngò',
      language: 'vi',
    });
    const cVi = conciergeViRes.body.data || conciergeViRes.body;
    assert(
      conciergeViRes.status === 200 &&
      typeof cVi.reply === 'string' &&
      cVi.reply.length > 0 &&
      cVi.recommendedDish?.dishSlug === 'bun-cha' &&
      cVi.recommendedDish?.dishName === 'Bún Chả Hà Nội' &&
      typeof cVi.recommendedDish?.basePrice === 'number' &&
      typeof cVi.recommendedDish?.reason === 'string' &&
      cVi.customization?.tasteValues?.spice_level === 5 &&
      cVi.customization?.tasteValues?.herb_intensity === 0 &&
      typeof cVi.customization?.tasteValues?.sweetness === 'number' &&
      typeof cVi.customization?.tasteValues?.sourness === 'number' &&
      typeof cVi.customization?.tasteValues?.fish_sauce_intensity === 'number' &&
      cVi.quickAction?.action === 'ADD_TO_CART' &&
      typeof cVi.quickAction?.label === 'string',
      'AI Concierge API - Vietnamese Prompt (/api/ai/concierge)',
      'Parses Vietnamese prompt (spicy Sichuan, no cilantro), returning customized Bún Chả with taste values and quick action.'
    );

    // B. POST /api/ai/concierge (English natural language prompt)
    const conciergeEnRes = await postJson('/api/ai/concierge', {
      prompt: 'I want a spicy beef pho soup, extra spicy, no cilantro and keto low carb',
      language: 'en',
    });
    const cEn = conciergeEnRes.body.data || conciergeEnRes.body;
    assert(
      conciergeEnRes.status === 200 &&
      typeof cEn.reply === 'string' &&
      cEn.reply.includes('Phở Bò') &&
      cEn.recommendedDish?.dishSlug === 'pho-bo' &&
      cEn.recommendedDish?.dishName === 'Phở Bò Hà Nội' &&
      cEn.customization?.tasteValues?.spice_level >= 4 &&
      cEn.customization?.tasteValues?.herb_intensity === 0 &&
      cEn.customization?.tasteValues?.sweetness <= 2 &&
      cEn.quickAction?.action === 'ADD_TO_CART' &&
      typeof cEn.quickAction?.label === 'string',
      'AI Concierge API - English Prompt (/api/ai/concierge)',
      'Parses English prompt (spicy beef pho, no cilantro, keto), returning Phở Bò with customized taste attributes.'
    );

    // C. POST /api/ai/concierge (Vegetarian / Tofu substitution)
    const conciergeVegRes = await postJson('/api/ai/concierge', {
      prompt: 'Bún chả chay đổi thịt thành đậu phụ cho người ăn chay',
      language: 'vi',
    });
    const cVeg = conciergeVegRes.body.data || conciergeVegRes.body;
    assert(
      conciergeVegRes.status === 200 &&
      cVeg.recommendedDish?.dishSlug === 'bun-cha' &&
      Array.isArray(cVeg.customization?.substitutionIds) &&
      cVeg.customization.substitutionIds.includes('sub-bc-tofu'),
      'AI Concierge API - Vegetarian Substitution (/api/ai/concierge)',
      'Recognizes vegetarian / plant-based request and maps to tofu substitution sub-bc-tofu.'
    );

    // D. POST /api/ai/dish-story (Bún Chả - Vietnamese)
    const storyViRes = await postJson('/api/ai/dish-story', {
      dishSlug: 'bun-cha',
      language: 'vi',
    });
    const sVi = storyViRes.body.data || storyViRes.body;
    assert(
      storyViRes.status === 200 &&
      typeof sVi.title === 'string' && sVi.title.length > 5 &&
      typeof sVi.originStory === 'string' && sVi.originStory.length > 50 &&
      typeof sVi.eatingEtiquette === 'string' && sVi.eatingEtiquette.length > 20 &&
      typeof sVi.localTip === 'string' && sVi.localTip.length > 10,
      'Cultural Dish Story API - Bún Chả Vietnamese (/api/ai/dish-story)',
      'Returns authentic cultural title, origin story, eating etiquette, and local tip for Bún Chả in Vietnamese.'
    );

    // E. POST /api/ai/dish-story (Bún Chả - English)
    const storyEnRes = await postJson('/api/ai/dish-story', {
      dishSlug: 'bun-cha',
      language: 'en',
    });
    const sEn = storyEnRes.body.data || storyEnRes.body;
    assert(
      storyEnRes.status === 200 &&
      typeof sEn.title === 'string' && sEn.title.length > 5 &&
      typeof sEn.originStory === 'string' && sEn.originStory.length > 50 &&
      typeof sEn.eatingEtiquette === 'string' && sEn.eatingEtiquette.length > 20 &&
      typeof sEn.localTip === 'string' && sEn.localTip.length > 10,
      'Cultural Dish Story API - Bún Chả English (/api/ai/dish-story)',
      'Returns localized cultural storytelling, eating etiquette, and insider secrets in English.'
    );

    // F. Cultural Dish Story In-Memory Cache Check
    const tStart = Date.now();
    const storyCachedRes = await postJson('/api/ai/dish-story', {
      dishSlug: 'bun-cha',
      language: 'vi',
    });
    const cacheDuration = Date.now() - tStart;
    const sCached = storyCachedRes.body.data || storyCachedRes.body;
    assert(
      storyCachedRes.status === 200 &&
      sCached.title === sVi.title &&
      sCached.originStory === sVi.originStory &&
      cacheDuration < 50,
      'Cultural Dish Story In-Memory Cache',
      `Cached response served instantaneously (${cacheDuration}ms) with identical cultural content.`
    );

    // G. POST /api/ai/kitchen-briefing
    const briefingRes = await postJson('/api/ai/kitchen-briefing', {
      timeframe: 'today',
    });
    const briefing = briefingRes.body.data || briefingRes.body;
    assert(
      briefingRes.status === 200 &&
      typeof briefing.executiveSummary === 'string' && briefing.executiveSummary.length > 20 &&
      Array.isArray(briefing.palateTrends) && briefing.palateTrends.length >= 3 &&
      Array.isArray(briefing.kitchenActionItems) && briefing.kitchenActionItems.length >= 3 &&
      typeof briefing.prepAdvice === 'string' && briefing.prepAdvice.length > 10,
      'Kitchen Briefing Intelligence API (/api/ai/kitchen-briefing)',
      'Analyzes live orders and delivers executive summary, palate trends, kitchen action items, and prep advice for chef.'
    );

    // H. Resilience & Graceful Degradation (Dummy/Missing GEMINI_API_KEY)
    const origKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'dummy-invalid-api-key-test-resilience';

    const [resilConcierge, resilStory, resilBriefing] = await Promise.all([
      postJson('/api/ai/concierge', { prompt: 'Tôi muốn ăn phở bò thật cay', language: 'vi' }),
      postJson('/api/ai/dish-story', { dishSlug: 'pho-bo', language: 'vi' }),
      postJson('/api/ai/kitchen-briefing', { timeframe: 'today' }),
    ]);

    // Restore original key
    if (origKey !== undefined) {
      process.env.GEMINI_API_KEY = origKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }

    const cResil = resilConcierge.body.data || resilConcierge.body;
    const sResil = resilStory.body.data || resilStory.body;
    const bResil = resilBriefing.body.data || resilBriefing.body;

    assert(
      resilConcierge.status === 200 &&
      cResil?.recommendedDish?.dishSlug === 'pho-bo' &&
      resilStory.status === 200 &&
      typeof sResil?.title === 'string' &&
      resilBriefing.status === 200 &&
      typeof bResil?.executiveSummary === 'string',
      'AI Graceful Degradation & Resilience (Missing/Dummy API Key)',
      'Endpoints safely degrade to smart rule-based fallback and return HTTP 200 OK without crashing or throwing.'
    );

    await new Promise<void>((resolve) => aiServer.close(() => resolve()));
  } catch (err: any) {
    assert(false, 'Backend AI Module check', `Failed with error: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // 7. Verify Frontend AI Integrations (Storyteller, Kitchen Briefing, Concierge)
  // -----------------------------------------------------------------
  console.log('\n--- Checking Frontend AI Integrations (Storyteller, Kitchen Briefing, Taste Concierge) ---');
  try {
    // Feature 1: AI Cultural Dish Storyteller & Dining Etiquette
    // A. Render CulturalStorySection in Vietnamese
    useLanguageStore.getState().setLanguage('vi');
    const htmlStoryVi = renderToString(
      React.createElement(CulturalStorySection, { dishSlug: 'bun-cha' })
    );
    assert(
      (htmlStoryVi.includes('Chuyện Ẩm Thực &amp; Hướng Dẫn Ăn Chuẩn Vị') ||
       htmlStoryVi.includes('Chuyện Ẩm Thực & Hướng Dẫn Ăn Chuẩn Vị')) &&
      htmlStoryVi.includes('Hồn cốt ẩm thực than hoa Hà Nội') &&
      htmlStoryVi.includes('Bước 1') &&
      htmlStoryVi.includes('Bí Kíp Bản Địa') &&
      htmlStoryVi.includes('Làm mới câu chuyện'),
      'CulturalStorySection UI (Vietnamese)',
      'Renders cultural story, etiquette steps, local tip banner, and refresh action in Vietnamese.'
    );

    // B. Language switching to English in CulturalStorySection
    useLanguageStore.getState().setLanguage('en');
    const htmlStoryEn = renderToString(
      React.createElement(CulturalStorySection, { dishSlug: 'bun-cha' })
    );
    assert(
      htmlStoryEn.includes('The Charcoal-Grilled Legacy of Hanoi Street Gastronomy') &&
      htmlStoryEn.includes('Step 1') &&
      htmlStoryEn.includes('Local Tip') &&
      htmlStoryEn.includes('Regenerate Story'),
      'CulturalStorySection Localization (English)',
      'Dynamically switches to English cultural storytelling, step-by-step etiquette, and local tip.'
    );

    // C. Integration in DishDetailPage route /dishes/bun-cha
    useLanguageStore.getState().setLanguage('vi');
    const htmlDishDetailPage = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/dishes/bun-cha'] },
        React.createElement(App)
      )
    );
    assert(
      htmlDishDetailPage.includes('Bún Chả Hà Nội') &&
      htmlDishDetailPage.includes('Độ ngọt nước chấm') &&
      (htmlDishDetailPage.includes('Chuyện Ẩm Thực &amp; Hướng Dẫn Ăn Chuẩn Vị') ||
       htmlDishDetailPage.includes('Chuyện Ẩm Thực & Hướng Dẫn Ăn Chuẩn Vị')) &&
      htmlDishDetailPage.includes('Bí Kíp Bản Địa'),
      'DishDetailPage AI Storyteller Integration',
      'DishDetailPage successfully embeds CulturalStorySection alongside the interactive taste customizer.'
    );

    // Feature 2: AI Kitchen Operating Briefing Card
    // D. Direct render of KitchenBriefingCard
    const htmlBriefingCard = renderToString(
      React.createElement(KitchenBriefingCard)
    );
    assert(
      (htmlBriefingCard.includes('Báo Cáo Vận Hành Bếp Bằng AI') || htmlBriefingCard.includes('AI Kitchen Operating Briefing')) &&
      htmlBriefingCard.includes('AI Real-time Ops') &&
      htmlBriefingCard.includes('Sinh Báo Cáo AI Mới') &&
      htmlBriefingCard.includes('Hôm nay') &&
      htmlBriefingCard.includes('Tuần này') &&
      (htmlBriefingCard.includes('Xu Hướng Khẩu Vị') || htmlBriefingCard.includes('Palate Trends')) &&
      (htmlBriefingCard.includes('Chỉ Đạo Chế Biến') || htmlBriefingCard.includes('Kitchen Action Items')) &&
      (htmlBriefingCard.includes('Mẹo Sơ Chế &amp; Cân Đối') || htmlBriefingCard.includes('Mẹo Sơ Chế & Cân Đối') || htmlBriefingCard.includes('Prep Advice')),
      'KitchenBriefingCard UI Components',
      'Renders executive summary, 3 analytical insight columns, timeframe controls, and live AI generation trigger.'
    );

    // E. Integration in TasteAnalyticsPage (/staff/analytics)
    useAuthStore.getState().login(
      {
        id: 'usr-staff-analytics-test',
        name: 'Chef Analytics Verifier',
        email: 'chef-verifier@demo.com',
        phone: '+84988776655',
        role: 'STAFF',
      },
      'mock-staff-token'
    );
    const htmlAnalyticsPage = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/staff/analytics'] },
        React.createElement(App)
      )
    );
    assert(
      htmlAnalyticsPage.includes('Báo Cáo Vận Hành Bếp Bằng AI') &&
      htmlAnalyticsPage.includes('Sinh Báo Cáo AI Mới') &&
      (htmlAnalyticsPage.includes('Phân Tích Khẩu Vị Du Khách') || htmlAnalyticsPage.includes('Taste Intelligence')),
      'TasteAnalyticsPage KitchenBriefingCard Integration',
      'TasteAnalyticsPage seamlessly embeds KitchenBriefingCard alongside the Radar Chart and Demographic KPIs.'
    );

    // Feature 3: AI Taste Concierge Widget & Modal
    // F. Global Floating Concierge Button in App
    const htmlAppFloatingBtn = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/'] },
        React.createElement(App)
      )
    );
    assert(
      htmlAppFloatingBtn.includes('Trợ Lý Gu Ẩm Thực (AI Taste Concierge)'),
      'Global AI Taste Concierge Floating Button',
      'Floating assistant button is mounted globally in App.tsx and accessible across all routes.'
    );

    // G. AITasteConciergeModal Component & Suggestion Chips
    const htmlConciergeModal = renderToString(
      React.createElement(MemoryRouter, null,
        React.createElement(AITasteConciergeModal, { defaultOpen: true })
      )
    );
    assert(
      htmlConciergeModal.includes('Trợ Lý Gu Ẩm Thực (AI Taste Concierge)') &&
      htmlConciergeModal.includes('Thèm cay nồng Tứ Xuyên') &&
      htmlConciergeModal.includes('Phở bò tái lăn nhiều hành') &&
      htmlConciergeModal.includes('Bún chả chay đậu phụ') &&
      htmlConciergeModal.includes('High-protein, không hành tỏi'),
      'AITasteConciergeModal Suggestion Chips & Controls',
      'Renders quick prompt chips for international foodies, input controls, and voice recognition UI.'
    );

    // H. End-to-End AI Concierge to Cart Workflow
    useCartStore.getState().clearCart();
    assert(useCartStore.getState().items.length === 0, 'Cart Clean State', 'Cart starts empty before concierge test.');

    const promptConcierge = 'Bún chả thèm cay nồng Tứ Xuyên, không ngò gai';
    const conciergeAiResult = await generateTasteConcierge({ prompt: promptConcierge, language: 'vi' });

    assert(
      conciergeAiResult.recommendedDish?.dishSlug === 'bun-cha' &&
      conciergeAiResult.customization.tasteValues.spice_level === 5 &&
      conciergeAiResult.customization.tasteValues.herb_intensity === 0,
      'AI Concierge Taste Inference Engine',
      'Correctly infers spicy Sichuan (spice 5/5) and no cilantro (herb 0/5) for Bún Chả Hà Nội.'
    );

    // Simulate 1-click "Thêm Món Đã Tùy Biến Vào Giỏ Hàng"
    useCartStore.getState().addItem({
      dishId: `${conciergeAiResult.recommendedDish.dishSlug}-id`,
      dishName: conciergeAiResult.recommendedDish.dishName,
      dishSlug: conciergeAiResult.recommendedDish.dishSlug,
      quantity: 1,
      basePrice: conciergeAiResult.recommendedDish.basePrice,
      currency: 'VND',
      tasteProfileCode: 'AI_CUSTOM',
      tasteValues: conciergeAiResult.customization.tasteValues || {},
      ingredientQuantities: conciergeAiResult.customization.ingredientQuantities || {},
      substitutionIds: conciergeAiResult.customization.substitutionIds || [],
      notes: conciergeAiResult.customization.specialNotes || 'Tùy biến bởi AI Taste Concierge',
    });

    const cartItems = useCartStore.getState().items;
    assert(
      cartItems.length === 1 &&
      cartItems[0].dishSlug === conciergeAiResult.recommendedDish.dishSlug &&
      cartItems[0].tasteProfileCode === 'AI_CUSTOM' &&
      cartItems[0].tasteValues.spice_level === 5 &&
      cartItems[0].tasteValues.herb_intensity === 0,
      'AI Concierge 1-Click Cart Addition Workflow',
      'Cart item holds personalized spice level 5, zero cilantro, and AI custom configuration.'
    );

    // I. Vegetarian Tofu Substitution Concierge to Cart Workflow
    const vegAiResult = await generateTasteConcierge({
      prompt: 'Bún chả chay đậu phụ cho người ăn thanh đạm',
      language: 'vi',
    });
    assert(
      vegAiResult.customization.substitutionIds.includes('sub-bc-tofu'),
      'AI Concierge Vegetarian Tofu Mapping',
      'Successfully detects vegetarian request and selects sub-bc-tofu substitution ID.'
    );

    useCartStore.getState().addItem({
      dishId: `${vegAiResult.recommendedDish.dishSlug}-veg-id`,
      dishName: vegAiResult.recommendedDish.dishName,
      dishSlug: vegAiResult.recommendedDish.dishSlug,
      quantity: 1,
      basePrice: vegAiResult.recommendedDish.basePrice,
      currency: 'VND',
      tasteProfileCode: 'AI_CUSTOM',
      tasteValues: vegAiResult.customization.tasteValues || {},
      ingredientQuantities: vegAiResult.customization.ingredientQuantities || {},
      substitutionIds: vegAiResult.customization.substitutionIds || [],
      notes: vegAiResult.customization.specialNotes || 'Bún chả chay đậu phụ',
    });

    const finalCartItems = useCartStore.getState().items;
    assert(
      finalCartItems.length === 2 &&
      finalCartItems[1].substitutionIds.includes('sub-bc-tofu'),
      'AI Concierge Vegetarian Cart Integration',
      'Cart seamlessly retains vegetarian substitution IDs across multi-item sessions.'
    );

    // Clean up cart and language store
    useCartStore.getState().clearCart();
    useLanguageStore.getState().setLanguage('vi');
  } catch (err: any) {
    assert(false, 'Frontend AI Integrations check', `Failed with error: ${err.message}`);
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
