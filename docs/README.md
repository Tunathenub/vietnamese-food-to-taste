# Project Documentation

This directory maintains product rules, architectural decisions, API contracts, and user flow specifications for the **Vietnamese Food - To Taste** platform.

---

## 📑 Core Documentation Structure

| Area | Document | Description |
| --- | --- | --- |
| **API Contract** | [api/api-contract.md](api/api-contract.md) | Full HTTP & SSE specifications including dishes, taste profiles, checkout, KDS real-time events, analytics, and AI endpoints. |
| **Architecture** | [architecture/order-model.md](architecture/order-model.md) | In-depth order state machine, kitchen instruction rendering logic, and customization architecture. |
| **Data Model** | [data-model.md](data-model.md) | Schema design, 6-axis taste dimensions, ingredient omission, and dietary substitution relationships. |
| **Product Flows** | [product/user-flows.md](product/user-flows.md) | Step-by-step user journeys for international tourists, hotel delivery, and restaurant staff. |
| **Sitemap** | [product/sitemap.md](product/sitemap.md) | Full route structure covering customer-facing screens, KDS portal, and analytics dashboard. |
| **Roadmap** | [roadmap.md](roadmap.md) | Milestones from MVP foundation to real-time KDS, analytics, and AI concierge features. |

---

## 💡 Key Architectural Pillars

### 1. Tourist-Centric Delivery Infrastructure
- **Smart Dial Code Inference**: Automatically matches calling code based on selected nationality (e.g. +82 for Korea, +1 for US/Canada, +81 for Japan).
- **Zero-Friction Cross-Border Channels**: Direct WhatsApp (`wa.me/<number>`) and Zalo dispatching links eliminate international roaming charges for travelers.
- **Prepaid Hotel Reception Drop-off**: Structured room notes enable safe front-desk drop-off for tourists on data-only eSIMs.

### 2. Real-Time Kitchen Display System (SSE)
- High-performance event streaming over HTTP via `Server-Sent Events` (`/api/events/orders`).
- Web Audio API notification chime alerting kitchen staff instantly upon new order arrival.
- Atomic state transitions: `PENDING` -> `CONFIRMED` -> `PREPARING` -> `READY` -> `COMPLETED`.

### 3. Taste Analytics & Radar Intelligence
- 6-axis taste vector aggregation comparing authentic Vietnamese baseline with tourist nationalities (reads live PostgreSQL orders with `demoOrderStore` fallback).
- Interactive SVG Radar chart and ingredient aversion tracking (e.g. coriander/cilantro avoidance).
- Authenticated multi-section CSV report export for operational BI.

### 4. DB-First Resilience & Backend RBAC
- **DB-First, Fallback-Safe**: Uses live PostgreSQL via Prisma when reachable (`docker compose up -d`) with automatic fast fallback when offline.
- **Role-Based Access Control**: Enforces `STAFF` / `ADMIN` JWT cookie or Bearer token verification across `/api/staff/*`, `/api/analytics/*`, `/api/events/orders`, and `/api/ai/kitchen-briefing`.

### 5. Full-Stack AI Integration (Gemini 2.5 Flash)
- **Cultural Storyteller**: Dynamic historical dish narratives and step-by-step dining etiquette with in-memory caching.
- **Kitchen Briefing**: Real-time order analysis generating chef shift briefings, line-cook directives, and prep advice.
- **Taste Concierge**: Global floating AI assistant with natural language understanding and 1-click customized cart insertion.
- **Zero-Failure Architecture**: Automatic graceful degradation guaranteeing 100% uptime with structured data fallback.
