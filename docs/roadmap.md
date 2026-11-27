# Roadmap

## Phase 1: Product Foundation
- [x] Finalize MVP scope
- [x] Define user flows and sitemap
- [x] Finalize the order-model decisions needed for the first Prisma draft
- [x] Draft the HTTP API contract
- [x] Establish pnpm monorepo architecture (Express + React 19 + Shared Schemas)
- [x] Write Prisma schema and database entities
- [x] Convert initial MVP dataset into validated seed files

## Phase 2: Menu and Taste Engine
- [x] Seed Vietnamese dishes (Phở Bò Hà Nội, Bún Chả Hà Nội, Bánh Mì Kẹp Đặc Biệt)
- [x] Seed 6 core taste dimensions (spice, sweetness, sourness, fish sauce, herbs, oil richness)
- [x] Seed 4 country taste profiles (`AUTHENTIC_VN`, `KR_INSPIRED`, `WESTERN_MILD`, `JP_DELICATE`)
- [x] Implement taste clamping logic & allowed ranges
- [x] Implement ingredient omission and dietary substitution rules (e.g., Lemongrass Tofu)

## Phase 3: Ordering & Hotel Delivery
- [x] Cart state management with persistent storage
- [x] Customization validation and dynamic pricing calculation
- [x] Idempotent guest checkout with hotel/apartment drop-off notes
- [x] Order creation transaction and atomic persistence
- [x] Snapshot selected customizations into kitchen instruction cards
- [x] Guest order lookup with HMAC-based phone normalization
- [x] Staff order management and status transitions

## Phase 4: Frontend & International Tourist Experience
- [x] Country / nationality preference selector with dial code prefill
- [x] Menu list with visual taste badges and pricing
- [x] Dish detail customizer with live preview and price calculations
- [x] Cart drawer / page with itemized customization summaries
- [x] Checkout page tailored for tourists (hotel room, front desk drop-off permission)
- [x] Order success, tracking, and lookup pages
- [x] Multilingual support (Tiếng Việt, English, 한국어, 日本語)
- [x] Real-time multi-currency conversions (VND, USD, KRW, JPY)

## Phase 5: Real-Time Kitchen Display System (KDS) & Audio
- [x] High-concurrency event broker using Server-Sent Events (`/api/events/orders`)
- [x] Live kitchen board updates without page refreshes
- [x] Customer targeted order tracking stream (`/api/events/orders/:orderNumber`)
- [x] Web Audio API dual-tone notification chime (C6/G6 bell) upon new order arrival
- [x] WhatsApp (`wa.me/<phone>`) and Zalo direct messaging links for staff

## Phase 6: Taste Analytics & Radar Intelligence
- [x] 6-axis taste vector aggregation engine (`/api/analytics/taste-radar`)
- [x] Interactive SVG Radar chart comparing baseline vs. international tourists
- [x] Ingredient aversion & omission ranking (`/api/analytics/ingredients`)
- [x] Automated multi-section CSV export for BI analysis (`/api/analytics/export`)
- [x] Dark-themed kitchen analytics dashboard at `/staff/analytics`

## Phase 7: Gemini AI Suite & Zero-Failure Resilience
- [x] Google GenAI SDK integration (`@google/genai`) with `gemini-2.5-flash`
- [x] Zero-Failure smart fallback architecture ensuring 100% uptime
- [x] **Feature 1**: AI Cultural Dish Storyteller & Dining Etiquette on Dish Detail
- [x] **Feature 2**: AI Kitchen Operating Briefing on Analytics Dashboard
- [x] **Feature 3**: AI Taste Concierge floating widget with voice input & 1-click customized cart insertion
- [x] Comprehensive automated verification test suite: 60/60 checks passing (100%)

## Phase 8: PostgreSQL Integration & Backend Security Hardening
- [x] Docker PostgreSQL 15 setup, additive Prisma migration (`add_tourist_contact_and_dial_code`), and idempotent seeding (dishes, profiles, 6 demo users, 4 sample orders)
- [x] DB-first + fallback-safe hardening across dishes, taste profiles, orders (`GET /api/orders/:orderNumber`, id/slug resolution, 4xx error preservation), and Prisma-backed Taste Analytics
- [x] Backend RBAC middleware (`requireAuth` / `requireRole('STAFF', 'ADMIN')`) protecting `/api/staff/*`, `/api/analytics/*`, `/api/events/orders`, and `/api/ai/kitchen-briefing`
- [x] Synced 1-click demo login accounts (`customer@demo.com`, `staff@demo.com`), public signup `CUSTOMER`-only role hardening, `.env` auto-loader, and production `JWT_SECRET`/`PHONE_SECRET` guards
- [ ] Expand dataset from 3 MVP dishes to all 8 documented dishes with full allergen & dietary tags
- [ ] Configure real ESLint rules across packages (currently placeholder `echo lint`)
- [ ] Integrate live online payment gateway beyond COD / placeholder methods
