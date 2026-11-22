import React from 'react';
React.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();
(globalThis as any).React = React;

import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import App from '../packages/web/src/App.js';
import { AITasteConciergeModal } from '../packages/web/src/components/AITasteConciergeModal.js';
import { useCartStore } from '../packages/web/src/stores/cart-store.js';
import { useLanguageStore } from '../packages/web/src/i18n/index.js';
import { generateTasteConcierge } from '../packages/api/src/services/ai-service.js';

async function testConcierge() {
  console.log('Testing Feature 3: AI Taste Concierge Modal...');

  // 1. SSR / App mount test
  const html = renderToString(
    React.createElement(MemoryRouter, { initialEntries: ['/'] },
      React.createElement(App)
    )
  );

  if (!html.includes('Trợ Lý Gu Ẩm Thực (AI Taste Concierge)')) {
    throw new Error('Floating button text not found in rendered App!');
  }
  console.log('✅ Floating button correctly rendered in App.tsx');

  // 2. Direct component render
  const modalHtml = renderToString(
    React.createElement(MemoryRouter, null,
      React.createElement(AITasteConciergeModal)
    )
  );
  if (!modalHtml.includes('Trợ Lý Gu Ẩm Thực (AI Taste Concierge)')) {
    throw new Error('AITasteConciergeModal failed to render floating button');
  }
  console.log('✅ AITasteConciergeModal renders cleanly');

  // 3. Test AI Concierge Service directly
  const prompt = '🌶️ Thèm cay nồng Tứ Xuyên, không ngò gai';
  const conciergeRes = await generateTasteConcierge({ prompt, language: 'vi' });

  console.log('Concierge Response:', {
    dish: conciergeRes.recommendedDish.dishName,
    spice: conciergeRes.customization.tasteValues.spice_level,
    herbs: conciergeRes.customization.tasteValues.herb_intensity,
  });

  if (conciergeRes.customization.tasteValues.spice_level !== 5) {
    throw new Error(`Expected spice_level 5, got ${conciergeRes.customization.tasteValues.spice_level}`);
  }
  if (conciergeRes.customization.tasteValues.herb_intensity !== 0) {
    throw new Error(`Expected herb_intensity 0, got ${conciergeRes.customization.tasteValues.herb_intensity}`);
  }
  console.log('✅ AI Concierge correctly configures custom taste parameters');

  // 4. Test Cart Integration
  useCartStore.getState().clearCart();
  const initialCount = useCartStore.getState().items.length;
  if (initialCount !== 0) throw new Error('Cart not empty initially');

  useCartStore.getState().addItem({
    dishId: `${conciergeRes.recommendedDish.dishSlug}-id`,
    dishName: conciergeRes.recommendedDish.dishName,
    dishSlug: conciergeRes.recommendedDish.dishSlug,
    quantity: 1,
    basePrice: conciergeRes.recommendedDish.basePrice,
    currency: 'VND',
    tasteProfileCode: 'AI_CUSTOM',
    tasteValues: conciergeRes.customization.tasteValues || {},
    ingredientQuantities: conciergeRes.customization.ingredientQuantities || {},
    substitutionIds: conciergeRes.customization.substitutionIds || [],
    notes: conciergeRes.customization.specialNotes || 'Tùy biến bởi AI Taste Concierge',
  });

  const cartItems = useCartStore.getState().items;
  if (cartItems.length !== 1) {
    throw new Error(`Expected 1 cart item, got ${cartItems.length}`);
  }

  const added = cartItems[0];
  if (added.tasteValues.spice_level !== 5 || added.tasteValues.herb_intensity !== 0) {
    throw new Error('Cart item does not retain custom taste values');
  }
  console.log('✅ Cart successfully receives tailored dish with custom taste preferences intact');
  console.log('Added Cart Item:', added);

  console.log('\n🎉 ALL CONCIERGE TESTS PASSED 100%!');
}

testConcierge().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
