import './setup-env.ts';
import http from 'node:http';
import React from 'react';

// SSR react setup
React.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();
(globalThis as any).React = React;

import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import App from '../packages/web/src/App.tsx';
import { CulturalStorySection } from '../packages/web/src/components/CulturalStorySection.tsx';
import { useLanguageStore } from '../packages/web/src/i18n/index.ts';
import app from '../packages/api/src/app.ts';

async function main() {
  console.log('--- Testing CulturalStorySection & Language Switching ---');

  // Start local server for testing API requests
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3001, () => resolve()));
  const port = (server.address() as any).port;
  console.log(`Test API Server running on port ${port}`);

  // Test 1: Render CulturalStorySection in VI
  useLanguageStore.getState().setLanguage('vi');
  const htmlVi = renderToString(
    React.createElement(CulturalStorySection, { dishSlug: 'bun-cha' })
  );

  console.log('\n[Check 1] VI Story Section Render:');
  const hasViHeader = htmlVi.includes('✨ Chuyện Ẩm Thực &amp; Hướng Dẫn Ăn Chuẩn Vị (AI Cultural Story &amp; Etiquette)') ||
                      htmlVi.includes('✨ Chuyện Ẩm Thực & Hướng Dẫn Ăn Chuẩn Vị (AI Cultural Story & Etiquette)');
  console.log('Has Header:', hasViHeader);
  console.log('Has Badge (Hồn cốt):', htmlVi.includes('Hồn cốt ẩm thực than hoa Hà Nội'));
  console.log('Has Etiquette (Bước 1):', htmlVi.includes('Bước 1'));
  console.log('Has Local Tip Banner:', htmlVi.includes('Bí Kíp Bản Địa'));
  console.log('Has Reload Button:', htmlVi.includes('Làm mới câu chuyện'));

  if (!hasViHeader || !htmlVi.includes('Hồn cốt ẩm thực than hoa Hà Nội') || !htmlVi.includes('Bước 1') || !htmlVi.includes('Bí Kíp Bản Địa')) {
    console.error('FAIL Check 1');
    process.exit(1);
  }

  // Test 2: Render in EN
  useLanguageStore.getState().setLanguage('en');
  const htmlEn = renderToString(
    React.createElement(CulturalStorySection, { dishSlug: 'bun-cha' })
  );

  console.log('\n[Check 2] EN Story Section Render:');
  console.log('Has Badge (Charcoal-Grilled Legacy):', htmlEn.includes('The Charcoal-Grilled Legacy of Hanoi Street Gastronomy'));
  console.log('Has Etiquette (Step 1):', htmlEn.includes('Step 1'));
  console.log('Has Local Tip Banner (Local Tip):', htmlEn.includes('Local Tip'));
  console.log('Has Reload Button (Regenerate):', htmlEn.includes('Regenerate Story'));

  if (!htmlEn.includes('The Charcoal-Grilled Legacy of Hanoi Street Gastronomy') || !htmlEn.includes('Step 1') || !htmlEn.includes('Local Tip')) {
    console.error('FAIL Check 2');
    process.exit(1);
  }

  // Test 3: Render DishDetailPage with CulturalStorySection
  console.log('\n[Check 3] DishDetailPage route /dishes/bun-cha:');
  useLanguageStore.getState().setLanguage('vi');
  const htmlPage = renderToString(
    React.createElement(MemoryRouter, { initialEntries: ['/dishes/bun-cha'] },
      React.createElement(App)
    )
  );

  const pageHasCustomizer = htmlPage.includes('Độ ngọt nước chấm');
  const pageHasStorySection = htmlPage.includes('Chuyện Ẩm Thực &amp; Hướng Dẫn Ăn Chuẩn Vị') || htmlPage.includes('Chuyện Ẩm Thực & Hướng Dẫn Ăn Chuẩn Vị');
  const pageHasSteps = htmlPage.includes('Bước 1');
  const pageHasTip = htmlPage.includes('Bí Kíp Bản Địa');

  console.log('DishDetailPage has customizer:', pageHasCustomizer);
  console.log('DishDetailPage has CulturalStorySection:', pageHasStorySection);
  console.log('DishDetailPage has Etiquette steps:', pageHasSteps);
  console.log('DishDetailPage has Local Tip:', pageHasTip);

  if (!pageHasCustomizer || !pageHasStorySection || !pageHasSteps || !pageHasTip) {
    console.error('FAIL Check 3');
    process.exit(1);
  }

  // Test 4: API endpoint test for /api/ai/dish-story with both languages
  console.log('\n[Check 4] API test /api/ai/dish-story with language switching:');
  const postApi = async (body: any) => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ai/dish-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const viRes = await postApi({ dishSlug: 'bun-cha', language: 'vi' });
  const enRes = await postApi({ dishSlug: 'bun-cha', language: 'en' });
  const phoRes = await postApi({ dishSlug: 'pho-bo', language: 'vi' });

  console.log('VI bun-cha title:', viRes.data?.title || viRes.title);
  console.log('EN bun-cha title:', enRes.data?.title || enRes.title);
  console.log('VI pho-bo title:', phoRes.data?.title || phoRes.title);

  if ((viRes.data?.title || viRes.title) !== 'Hồn cốt ẩm thực than hoa Hà Nội') {
    console.error('FAIL Check 4: VI Title mismatch');
    process.exit(1);
  }
  if ((enRes.data?.title || enRes.title) !== 'The Charcoal-Grilled Legacy of Hanoi Street Gastronomy') {
    console.error('FAIL Check 4: EN Title mismatch');
    process.exit(1);
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));
  console.log('\n🎉 ALL CULTURAL STORY TESTS PASSED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
