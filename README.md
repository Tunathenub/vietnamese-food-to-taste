# 🍲 Vietnamese Food - To Taste (VFT)

> **Authentic Vietnamese Cuisine, Tailored to International Tourist Palates & Powered by Gemini AI.**
> A modern, production-grade full-stack monorepo featuring real-time kitchen orchestration (KDS), interactive taste customizers, 6-axis taste radar analytics, and AI cultural intelligence.

---

## 🌟 Highlights & Key Innovations

### 1. 🌍 Tourist-First Experience & Multi-Language (i18n)
- **Multi-language support**: Instant switching between **Vietnamese**, **English**, **Korean (한국어)**, and **Japanese (日本語)** with persistent state.
- **Dynamic tourist currency conversion**: Shows authentic **VND** alongside real-time estimates in **USD ($)**, **KRW (원)**, and **JPY (円)**.
- **Hotel & Resort Delivery Checkout**:
  - Auto-fills international dial codes based on tourist nationality.
  - One-click WhatsApp / Zalo communication channels for staff (no roaming or number saving required).
  - Hotel-specific delivery notes (room number, front desk drop-off permission for data-only eSIMs).

### 2. 🎛️ 6-Axis Taste Customization Engine
- Dish taste fine-tuning across 6 core dimensions:
  - `spice_level` (Độ cay: 0 - 5)
  - `sweetness` (Độ ngọt: 0 - 5)
  - `sourness` (Độ chua: 0 - 5)
  - `fish_sauce_intensity` (Độ đậm nước mắm: 0 - 5)
  - `herb_intensity` (Rau thơm: 0 - 5)
  - `oil_richness` (Độ béo ngậy: 0 - 5)
- Ingredient omission controls (e.g., cilantro/ngò gai, fresh chili, scallions) and dietary substitutions (e.g., grilled pork -> lemongrass tofu).

### 3. ⚡ Real-Time Kitchen Display System (KDS) & Order Stepper
- **Server-Sent Events (SSE)** via high-performance event broker:
  - `/api/events/orders`: Live kitchen feed for restaurant staff.
  - `/api/events/orders/:orderNumber`: Live tracking stream for tourists.
- **Web Audio API**: Real-time dual-tone notification chime (C6/G6 bell) when orders arrive in the kitchen.
- Smooth animated status transitions (`PENDING` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `COMPLETED`).

### 4. 📊 Taste Analytics Intelligence Dashboard (`/staff/analytics`)
- **Interactive SVG Taste Radar Chart**: Compares authentic Vietnamese baseline vectors with international tourist profiles (US/Europe, Korea, Japan, China, etc.).
- **Demographic KPIs**: Customization rates, top altered dimensions, herb omission rankings.
- **1-Click CSV Export**: Comprehensive data export for external BI analysis.

### 5. 🤖 3 Standout AI Features (Google Gemini 2.5 Flash + Zero-Failure Engine)
- **✨ AI Cultural Dish Storyteller & Dining Etiquette** (`/dishes/:dishSlug`):
  - Dynamic cultural storytelling, historical context, step-by-step local dining etiquette (e.g., sip broth before garnishing, squeeze calamansi instead of lime).
  - In-memory cache (<1ms response) and multilingual support.
- **✨ AI Kitchen Operating Briefing** (`/staff/analytics`):
  - Ingests real-time orders to generate executive summaries, palate trends, line-chef action items, and prep balance advice.
- **✨ AI Taste Concierge Widget** (Global floating assistant & modal):
  - Natural language cravings parser (e.g., *"Thèm cay nồng Tứ Xuyên không ngò gai"*, *"Keto high-protein beef pho"*).
  - Voice input support (Web Speech API) & suggestion chips.
  - **1-Click Cart Addition**: Converts conversational requests directly into a tailored cart item retaining custom taste values.
- **Zero-Failure Architecture**: Graceful fallback ensures 100% uptime with rich structured JSON even during offline mode or key absence.

---

## 🏗️ Architecture & Monorepo Structure

```text
├── packages/
│   ├── api/                   # Backend REST API + SSE + AI Engine (Node.js, Express, TypeScript)
│   │   ├── src/routes/        # REST routes (/ai, /analytics, /events, /orders, /dishes, /staff)
│   │   ├── src/services/      # Business logic (ai-service, order-events, taste-analytics, demo-orders)
│   │   └── prisma/            # Schema and database definitions
│   ├── web/                   # Frontend SPA (React 18, Vite, Tailwind CSS, Zustand)
│   │   ├── src/components/    # Reusable UI (AITasteConcierge, CulturalStory, KitchenBriefing, RadarChart)
│   │   ├── src/pages/         # Pages (Menu, DishDetail, Cart, Checkout, OrderDetail, Staff, Analytics)
│   │   └── src/i18n/          # Multilingual dictionary (VI, EN, KO, JA)
│   └── shared/                # Shared Zod validation schemas & TypeScript types
├── scripts/                   # Development, startup & verification automation
│   └── verify-all.ts          # Comprehensive automated test suite (56 checks)
└── docs/                      # Complete specifications and architectural contracts
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.x
- pnpm >= 8.x

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/tonynguyen1105/vietnamese-food-to-taste.git
cd vietnamese-food-to-taste

# Install dependencies across all packages
pnpm install
```

### 2. Environment Setup
Configure `packages/api/.env`:
```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: If `GEMINI_API_KEY` is not provided, the system seamlessly runs in Smart Fallback mode with realistic AI responses!)*

### 3. Run Development Servers
```bash
# Run both API (port 3000) and Web (port 5173) concurrently
pnpm dev
```
- Customer Web App: [http://localhost:5173](http://localhost:5173)
- Kitchen Portal & KDS: [http://localhost:5173/staff/orders](http://localhost:5173/staff/orders)
- Taste Analytics Dashboard: [http://localhost:5173/staff/analytics](http://localhost:5173/staff/analytics)
- Backend API Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 🧪 Automated Verification Suite

Run the full end-to-end verification script:
```bash
pnpm run verify
```
Verifies **56/56 automated checks (100% PASS)** covering:
- Route resolution & 404 fallbacks
- Staff RBAC authorization & navbar guard logic
- i18n translations & multi-currency math
- Real-time SSE broker broadcasting & customer filtering
- Web Audio API notification execution
- Taste Analytics Radar Chart & CSV report generation
- Gemini AI endpoints (`/api/ai/concierge`, `/api/ai/dish-story`, `/api/ai/kitchen-briefing`)
- AI Concierge 1-click customized cart insertion
- Offline resilience & graceful degradation

---

## 📚 Documentation Index

- [Architecture & Order Model](docs/architecture/order-model.md)
- [API Contract & Specifications](docs/api/api-contract.md)
- [Data Model & Entities](docs/data-model.md)
- [Product User Flows](docs/product/user-flows.md)
- [Sitemap](docs/product/sitemap.md)

---

## 📄 License
MIT © 2026 Vietnamese Food - To Taste Team.
