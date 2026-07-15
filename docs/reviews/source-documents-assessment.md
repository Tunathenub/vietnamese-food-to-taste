# Source Document Assessment

Date reviewed: 2026-07-15

## Executive Summary

The three source documents form a strong product-definition package for an MVP. The business rules are the most implementation-ready artifact. The order model is a useful detailed draft, but several schema choices and pricing invariants must be finalized before converting it to Prisma. The dish and ingredient dataset is valuable product input, but it is not yet a machine-ready seed dataset.

Recommended status: **approved as product and architecture source material; not yet approved as an executable schema or production seed dataset.**

## Readiness

| Document | Current readiness | Recommended use |
| --- | --- | --- |
| Business Rules | High | Acceptance criteria, API validation, and test-case design |
| Order Data Model | Medium | Architecture draft to be converted into an ADR and Prisma schema after open decisions are resolved |
| Initial Dish and Ingredient Dataset | Medium-low | Product seed source to be normalized into CSV, JSON, or database seed code |

## 1. Business Rules

### Strengths

- The 36 numbered rules provide traceable coverage across taste recommendations, ingredients, cart identity, pricing, checkout, order snapshots, and validation.
- Server-authoritative validation and pricing are stated consistently.
- Snapshot requirements protect historical orders from future menu changes.
- Country profiles are explicitly described as recommendations rather than assumptions about individuals.
- Allergen warnings, dietary labels, guest checkout, transactionality, and cancellation boundaries are addressed.

### Gaps and decisions

- Define an explicit order-status transition matrix, including who may perform each transition and whether reversal is allowed.
- Define rounding, precision, and storage rules for VND and future currencies. Prefer integer minor units or a documented fixed decimal strategy.
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

### Blocking decisions before Prisma conversion

- Choose one substitution representation: a dedicated `ORDER_ITEM_SUBSTITUTIONS` table or the `SUBSTITUTED` action in `ORDER_ITEM_INGREDIENT_CUSTOMIZATIONS`. Keeping both without a strict boundary risks duplicate records and double-counted price deltas.
- Define monetary invariants. Clarify whether `subtotal` is base-only or already includes customization, and ensure `final_unit_price`, `line_total`, `customization_total`, and `total` cannot count the same delta twice.
- Add database constraints for positive quantity, valid taste ranges, non-negative totals where appropriate, unique order-item taste attributes, and unique customization records.
- Define deletion behavior for every foreign key and make soft deletion the normal path for menu entities.
- Define race-safe generation for `order_number` rather than relying only on a display format.
- Add an idempotency key or equivalent uniqueness rule for order creation retries.
- Decide whether delivery address remains a single required field for pickup orders; the current payment methods include pickup but `delivery_address` is mandatory.

## 4. Cross-Document Consistency

The detailed order model supersedes the placeholder order section in `data-model.md`, but it remains a draft until the decisions above are resolved.

Terms should be standardized before implementation:

- Use either `min_value` / `max_value` or `min_adjust` / `max_adjust` consistently for dish taste bounds.
- Use `DISH_TASTE_CONFIGURATIONS` consistently instead of mixing it with `DISH_TASTE_PROFILES`.
- Use dish-specific substitution rules throughout; the original core model currently implies a global ingredient-to-ingredient substitution.
- Define whether ingredient `role` replaces the earlier `is_core` and `is_optional` flags.

## 5. Document Quality Review

- Heading styles, code-style examples, and the dataset tables are structurally consistent.
- All nine dataset tables occur directly after the section they support.
- No tracked insertions, tracked deletions, or actual comments were found.
- The DOCX files do not contain explicit page-size metadata and rely on application defaults.
- Visual page rendering could not be completed in the current environment because LibreOffice is unavailable. Content and OOXML structure were reviewed, but clipping, page breaks, and final pagination should be checked once in Microsoft Word or LibreOffice before treating the files as publication-ready.

## Recommended Next Steps

1. Resolve the substitution representation and monetary invariants.
2. Standardize model names and field names across all documents.
3. Convert the order draft into a Prisma schema with constraints and transaction tests.
4. Normalize the dataset into machine-readable seed files and fill the missing country-profile values.
5. Derive acceptance tests from `BR-01` through `BR-36`.

