# Project Documentation

This directory keeps product rules, architecture decisions, seed-data sources, and document reviews separate so each artifact has a clear owner and lifecycle.

## Source Documents

| Area | Document | Purpose |
| --- | --- | --- |
| Business rules | [Business Rules for Vietnamese Food Taste App](business-rules/Business%20Rules%20for%20Vietnamese%20Food%20Taste%20App.docx) | Product behavior, validation, pricing, checkout, and order rules |
| Architecture source | [Original Order Data Model](architecture/Order%20Data%20Model.docx) | Original Word source retained for traceability |
| Seed data | [Initial Dish and Ingredient Dataset](data/Initial%20Dish%20and%20Ingredient%20Dataset.docx) | Initial dishes, ingredients, taste ranges, and substitutions |

## Working Documents

- [Core data model](data-model.md)
- [Order data model](architecture/order-model.md)
- [API contract](api/api-contract.md)
- [User flows](product/user-flows.md)
- [Sitemap](product/sitemap.md)
- [Roadmap](roadmap.md)
- [Source document assessment](reviews/source-documents-assessment.md)

## Key Product Decisions (International Tourist Delivery)

- **Smart Country & Dial Code Inference**: Selecting a country or taste profile links a standard country calling code (`dial_code`), automatically pre-filling the phone input at Checkout.
- **Cross-Border Messaging Channels**: Orders support WhatsApp and Zalo flags; the kitchen/staff portal provides one-click `wa.me/<phone>` links to message tourists without roaming costs or saving numbers.
- **Prepaid Hotel Drop-off**: For tourists using data-only eSIMs, prepaid orders allow safe drop-off at hotel reception/lobby desks with structured room notes if voice contact fails.
