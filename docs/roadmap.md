# Roadmap

## Phase 1: Product Foundation
- [x] Finalize MVP scope
- [x] Define user flows and sitemap
- [x] Finalize the order-model decisions needed for the first Prisma draft
- [x] Draft the HTTP API contract
- [x] Establish pnpm monorepo architecture (Express + React 18 + Shared Schemas)
- [x] Write Prisma schema and database entities
- [x] Convert source dataset into validated seed files

## Phase 2: Menu and Taste Engine
- [x] Seed Vietnamese dishes (Phở Bò Hà Nội, Bún Chả Hà Nội, Bánh Mì Kẹp Đặc Biệt)
- [x] Seed 6 core taste dimensions (spice, sweetness, sourness, fish sauce, herbs, oil richness)
- [x] Seed country taste profiles (Authentic VN, Korea, US/Europe, Japan, China, India)
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
- [x] Comprehensive automated verification test suite: 56/56 checks passing (100%)
