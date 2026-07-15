# Source Document Assessment

Date reviewed: 2026-07-15

## Executive Summary

The original three source documents form a strong product-definition package for an MVP. The added user flows, sitemap, API contract, and working order model close the major checkout-design gaps identified in the first review. The dish and ingredient dataset remains valuable product input, but it is not yet a machine-ready seed dataset.

Recommended status: **approved for the first Prisma and API implementation draft; not yet approved as a production seed dataset.**

## Readiness

| Document | Current readiness | Recommended use |
| --- | --- | --- |
| Business Rules | High | Acceptance criteria, API validation, and test-case design |
| Working Order Data Model | High | Authoritative input for the first Prisma schema |
| API Contract | Medium-high | Route and validation contract; refine alongside implementation tests |
| User Flows and Sitemap | High | UX scope, route planning, and acceptance scenarios |
| Initial Dish and Ingredient Dataset | Medium-low | Product seed source to be normalized into CSV, JSON, or database seed code |

## 1. Business Rules

### Strengths

- The 36 numbered rules provide traceable coverage across taste recommendations, ingredients, cart identity, pricing, checkout, order snapshots, and validation.
- Server-authoritative validation and pricing are stated consistently.
- Snapshot requirements protect historical orders from future menu changes.
- Country profiles are explicitly described as recommendations rather than assumptions about individuals.
- Allergen warnings, dietary labels, guest checkout, transactionality, and cancellation boundaries are addressed.

### Gaps and decisions

- Promote the status-transition, integer-money, and idempotency rules from the working architecture documents into numbered business rules during the next business-rule revision.
- Replace or formally define `HALAL_FRIENDLY`; it may imply a guarantee that ingredient-level data alone cannot establish.
- Add rules for idempotent checkout submission to prevent duplicate orders after retries.
- Add privacy and retention rules for customer contact details, addresses, and order notes.
- Turn each `BR-xx` rule into testable acceptance cases, especially price tampering, invalid substitutions, clamping, and transaction rollback.

## 2. Initial Dish and Ingredient Dataset

### Strengths

- Eight dishes cover distinct categories and customization patterns.
- Taste ranges are dish-specific and map to preparation mechanisms.
- Ingredient roles, adjustable quantities, substitutions, and an allergen example align with the business rules.
- The dataset is intentionally small enough for an MVP.

### Blocking gaps before seed implementation

- The five country profiles are named but do not include actual taste values, so recommendation behavior cannot yet be seeded or tested.
- Records lack stable identifiers or slugs and do not define uniqueness or normalization rules.
- The ingredient catalog lacks allergen tags, dietary tags, availability, and kitchen instructions required by the business rules.
- Substitutions lack price deltas, availability, and preparation instructions.
- Taste values provide ranges but not the complete value-to-customer-label and value-to-kitchen-instruction mapping required by `DISH_TASTE_OPTIONS`.
- `Fresh chili` has a default of `0 or 1`; a seed field must contain one deterministic value, with dish-specific defaults stored on the dish-ingredient relationship.
- Prices and preparation times need types and units suitable for import rather than formatted display strings.

### Recommended conversion

Normalize the document into separate seed entities for dishes, ingredients, dish ingredients, taste configurations, taste options, substitutions, country profiles, and country taste defaults. Validate foreign keys, range constraints, unique keys, and allergen/dietary claims during seed loading.

## 3. Order Data Model

### Strengths

- Guest checkout, status, payment placeholders, lifecycle timestamps, and customer-facing order numbers are included.
- Order-item snapshots are comprehensive and preserve dish, taste, ingredient, substitution, price, and kitchen context.
- The checkout process correctly places validation and price calculation before a single database transaction.
- Nullable references plus snapshot fields support soft deletion and durable order history.

### Decisions incorporated into the working model

- Substitutions use a dedicated `ORDER_ITEM_SUBSTITUTIONS` snapshot table and are excluded from ingredient customization actions.
- Monetary values use integer minor units in `bigint` columns; subtotal, customization total, and final total have non-overlapping formulas.
- Quantity, range, uniqueness, total, foreign-key, and deletion rules are documented for the Prisma draft.
- Order numbers require a concurrency-safe allocator.
- Idempotency stores both a unique key and normalized request hash.
- Delivery address is conditional on `fulfillment_type = DELIVERY`.

### Implementation checks still required

- Confirm PostgreSQL constraints and Prisma mappings, especially `bigint` serialization at the API boundary.
- Define the exact transaction/isolation behavior for concurrent menu changes and idempotent retries.
- Add automated tests for every valid and invalid status transition.

## 4. Cross-Document Consistency

The Markdown [order model](../architecture/order-model.md) supersedes the placeholder order section in `data-model.md` and the original Word draft for implementation purposes. The Word document remains a traceable source artifact.

The working documents now standardize `min_value` / `max_value`, `DISH_TASTE_CONFIGURATIONS`, dish-specific substitutions, and the `REQUIRED` / `REMOVABLE` / `OPTIONAL` ingredient role. Legacy names may still appear inside the retained Word sources and should not be copied into the Prisma schema.

## 5. Document Quality Review

- Heading styles, code-style examples, and the dataset tables are structurally consistent.
- All nine dataset tables occur directly after the section they support.
- No tracked insertions, tracked deletions, or actual comments were found.
- The DOCX files do not contain explicit page-size metadata and rely on application defaults.
- Visual page rendering could not be completed in the current environment because LibreOffice is unavailable. Content and OOXML structure were reviewed, but clipping, page breaks, and final pagination should be checked once in Microsoft Word or LibreOffice before treating the files as publication-ready.
- The added Markdown documents require no pagination render; their headings, fenced examples, tables, and internal links were checked structurally.

## Recommended Next Steps

1. Convert the working order model into a Prisma schema with constraints and transaction tests.
2. Normalize the dataset into machine-readable seed files and fill the missing country-profile values.
3. Derive acceptance tests from `BR-01` through `BR-36` and the API error catalog.
4. Confirm the final application stack and implement the first vertical slice: menu -> customization validation -> idempotent checkout.
