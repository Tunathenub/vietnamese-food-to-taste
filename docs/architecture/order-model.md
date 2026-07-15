# Order Data Model

## 1. Design Goals

The order model must:

- Support guest and authenticated checkout.
- Support delivery and pickup.
- Store customized dishes.
- Preserve historical order details.
- Allow different configurations of the same dish.
- Prevent current menu changes from modifying old orders.
- Store customer-facing labels and kitchen instructions as snapshots.
- Support server-side validation and price calculation.
- Prevent duplicate order creation.
- Allow future payment features without requiring a real payment gateway in the MVP.

---

## 2. Core Enums

### Order Status

```text
PENDING
CONFIRMED
PREPARING
READY
COMPLETED
CANCELLED
```

### Payment Status

```text
UNPAID
PAID
FAILED
REFUNDED
```

The MVP may initially use only `UNPAID` and `PAID`.

### Payment Method

```text
CASH_ON_DELIVERY
CASH_ON_PICKUP
MOCK_PAYMENT
```

### Fulfillment Type

```text
DELIVERY
PICKUP
```

### Recommendation Source

```text
PERSONAL
TASTE_PROFILE
DISH_DEFAULT
MANUAL
```

### Ingredient Customization Action

```text
UNCHANGED
REMOVED
ADDED
INCREASED
DECREASED
```

Substitutions are deliberately stored in `ORDER_ITEM_SUBSTITUTIONS` and are not represented by an ingredient-customization action. This avoids duplicate snapshots and price deltas.

---

## 3. Status Transition Rules

Standard transitions:

```text
PENDING -> CONFIRMED
CONFIRMED -> PREPARING
PREPARING -> READY
READY -> COMPLETED
PENDING -> CANCELLED
CONFIRMED -> CANCELLED
```

The backend must reject unsupported status transitions.

Once preparation begins, customer cancellation should be disabled.

Every status change is appended in the same transaction to:

```text
ORDER_STATUS_HISTORY
- id               uuid PK
- order_id         uuid FK -> ORDERS
- from_status      OrderStatus nullable
- to_status        OrderStatus
- actor_type       enum CUSTOMER | STAFF | SYSTEM
- actor_user_id    uuid nullable FK -> USERS
- reason           string nullable
- created_at       datetime
```

The initial `PENDING` event uses `from_status = null`. Staff identity is required for staff-triggered changes; automated changes use `SYSTEM`.

---

## 4. ORDERS

```text
ORDERS
- id                       uuid PK
- order_number             string UNIQUE
- idempotency_key          string UNIQUE
- idempotency_request_hash string
- user_id                  uuid nullable FK -> USERS
- status                   OrderStatus
- payment_status           PaymentStatus
- payment_method           PaymentMethod
- fulfillment_type         FulfillmentType
- currency                 string
- subtotal                 bigint
- customization_total      bigint
- delivery_fee             bigint
- discount_total           bigint
- total                    bigint
- customer_name            string
- customer_email           string nullable
- customer_phone           string
- customer_phone_lookup_hmac string INDEX
- delivery_address         string nullable
- customer_notes           string nullable
- cancellation_reason      string nullable
- confirmed_at             datetime nullable
- preparation_started_at   datetime nullable
- ready_at                 datetime nullable
- completed_at             datetime nullable
- cancelled_at             datetime nullable
- created_at               datetime
- updated_at               datetime
```

### Rules

- `user_id` is nullable to support guest checkout.
- `delivery_address` is required when `fulfillment_type = DELIVERY`.
- `delivery_address` may be null when `fulfillment_type = PICKUP`.
- `customer_phone_lookup_hmac` is derived from the normalized phone number with a server-side secret for indexed guest lookup; staff still use the protected phone snapshot when operationally required.
- Monetary values are calculated by the backend.
- Every monetary column stores integer minor units. For VND, one stored unit is one đồng.
- `idempotency_key` prevents accidental duplicate order submissions; `idempotency_request_hash` detects reuse with a different normalized payload.
- `order_number` must be human-readable and generated with a database sequence or another concurrency-safe allocator.

Example:

```text
VFT-20260715-0042
```

### Recommended Constraints

```text
subtotal >= 0
delivery_fee >= 0
discount_total >= 0
total >= 0
total = subtotal + customization_total + delivery_fee - discount_total
```

---

## 5. ORDER_ITEMS

```text
ORDER_ITEMS
- id                          uuid PK
- order_id                    uuid FK -> ORDERS
- dish_id                     uuid nullable FK -> DISHES
- dish_name_snapshot          string
- dish_slug_snapshot          string nullable
- dish_image_snapshot         string nullable
- quantity                    int
- base_unit_price             bigint
- customization_unit_price    bigint
- final_unit_price            bigint
- line_total                  bigint
- special_notes               string nullable
- created_at                  datetime
```

### Calculation

```text
final_unit_price =
    base_unit_price + customization_unit_price

line_total =
    final_unit_price * quantity
```

### Rules

- `quantity` must be at least 1.
- `final_unit_price = base_unit_price + customization_unit_price`.
- `line_total = final_unit_price * quantity`.
- `base_unit_price`, `final_unit_price`, and `line_total` must be non-negative; `customization_unit_price` may be negative for a discounting substitution.
- One order item represents one complete customization configuration.
- Different configurations of the same dish must be separate order items.
- Snapshot values never change after order creation.
- `dish_id` may become null if hard deletion is ever allowed, although soft deletion is preferred.

---

## 6. ORDER_ITEM_TASTE_CUSTOMIZATIONS

```text
ORDER_ITEM_TASTE_CUSTOMIZATIONS
- id                            uuid PK
- order_item_id                 uuid FK -> ORDER_ITEMS
- taste_attribute_id            uuid nullable FK -> TASTE_ATTRIBUTES
- attribute_code_snapshot       string
- attribute_name_snapshot       string
- recommendation_source         RecommendationSource
- source_value                  int
- base_value                    int
- min_value                     int
- max_value                     int
- chosen_value                  int
- customer_label_snapshot       string
- kitchen_instruction_snapshot  string
- price_delta                   bigint
```

### Example

```text
attribute_code_snapshot: spice_level
recommendation_source: PERSONAL
source_value: 5
base_value: 1
min_value: 0
max_value: 3
chosen_value: 3
customer_label_snapshot: Spicy
kitchen_instruction_snapshot: Add one portion of chili oil
price_delta: 0
```

### Rules

- `chosen_value` must be inside the snapshotted range.
- `UNIQUE(order_item_id, attribute_code_snapshot)` prevents duplicate taste snapshots for the same item.
- Kitchen instructions are resolved before order creation.
- Public order endpoints should expose customer labels, not kitchen instructions.

---

## 7. ORDER_ITEM_INGREDIENT_CUSTOMIZATIONS

```text
ORDER_ITEM_INGREDIENT_CUSTOMIZATIONS
- id                            uuid PK
- order_item_id                 uuid FK -> ORDER_ITEMS
- ingredient_id                 uuid nullable FK -> INGREDIENTS
- ingredient_name_snapshot      string
- action                        IngredientCustomizationAction
- original_quantity             decimal
- selected_quantity             decimal
- unit_snapshot                 string
- unit_price_delta              bigint
- total_price_delta             bigint
- kitchen_instruction_snapshot  string
```

### Price Calculation

```text
quantity_difference =
    selected_quantity - original_quantity

total_price_delta =
    calculated according to the dish ingredient pricing rule
```

A negative quantity difference does not automatically create a refund. Price behavior must be explicitly defined by the dish ingredient rule.

### Example

```text
ingredient_name_snapshot: Fresh chili
action: INCREASED
original_quantity: 1
selected_quantity: 3
unit_snapshot: portion
unit_price_delta: 0
total_price_delta: 0
kitchen_instruction_snapshot: Add three portions of fresh chili
```

---

## 8. ORDER_ITEM_SUBSTITUTIONS

Substitutions are stored separately from ingredient quantity changes. This is the selected project approach.

```text
ORDER_ITEM_SUBSTITUTIONS
- id                               uuid PK
- order_item_id                    uuid FK -> ORDER_ITEMS
- substitution_rule_id             uuid nullable FK
- original_ingredient_id           uuid nullable FK
- substitute_ingredient_id         uuid nullable FK
- original_ingredient_snapshot     string
- substitute_ingredient_snapshot   string
- reason_snapshot                  string nullable
- price_delta                      bigint
- kitchen_instruction_snapshot     string
```

### Example

```text
original_ingredient_snapshot: Grilled pork
substitute_ingredient_snapshot: Grilled tofu
price_delta: -5000
kitchen_instruction_snapshot: Replace grilled pork with one portion of grilled tofu
```

Recommended constraint:

```text
UNIQUE(order_item_id, original_ingredient_id)
```

One original ingredient may have at most one selected substitute in an order-item configuration.

---

## 9. Supporting Dish Configuration Tables

### DISH_INGREDIENTS

```text
DISH_INGREDIENTS
- id                       uuid PK
- dish_id                  uuid FK -> DISHES
- ingredient_id            uuid FK -> INGREDIENTS
- role                     IngredientRole
- default_quantity         decimal
- min_quantity             decimal
- max_quantity             decimal
- unit                     string
- price_delta_per_step     bigint
- is_quantity_adjustable   boolean
- display_order            int
- kitchen_note             string nullable
- is_available             boolean
```

Ingredient roles:

```text
REQUIRED
REMOVABLE
OPTIONAL
```

Recommended constraint:

```text
UNIQUE(dish_id, ingredient_id)
```

Rules:

- Required ingredients cannot be removed.
- Selected quantity must be between minimum and maximum.
- Quantity controls are shown only when `is_quantity_adjustable = true`.

---

### DISH_TASTE_CONFIGURATIONS

```text
DISH_TASTE_CONFIGURATIONS
- id                     uuid PK
- dish_id                uuid FK -> DISHES
- attribute_id           uuid FK -> TASTE_ATTRIBUTES
- base_value             int
- min_value              int
- max_value              int
- is_adjustable          boolean
- customer_description   string nullable
- display_order          int
```

Recommended constraint:

```text
UNIQUE(dish_id, attribute_id)
```

Rules:

```text
min_value <= base_value <= max_value
```

---

### DISH_TASTE_OPTIONS

```text
DISH_TASTE_OPTIONS
- id                       uuid PK
- dish_taste_config_id     uuid FK -> DISH_TASTE_CONFIGURATIONS
- value                    int
- customer_label           string
- customer_description     string nullable
- kitchen_instruction      string
- price_delta              bigint
```

Recommended constraint:

```text
UNIQUE(dish_taste_config_id, value)
```

Every accepted value should map to a customer label and kitchen instruction.

---

### DISH_INGREDIENT_SUBSTITUTIONS

```text
DISH_INGREDIENT_SUBSTITUTIONS
- id                         uuid PK
- dish_id                    uuid FK -> DISHES
- original_ingredient_id     uuid FK -> INGREDIENTS
- substitute_ingredient_id   uuid FK -> INGREDIENTS
- reason                     string nullable
- price_delta                bigint
- kitchen_instruction        string
- is_available               boolean
```

Recommended constraint:

```text
UNIQUE(
  dish_id,
  original_ingredient_id,
  substitute_ingredient_id
)
```

Substitutions are dish-specific and must be validated against the selected dish.

---

## 10. Integrity and Deletion Rules

### Uniqueness

```text
ORDER_ITEM_TASTE_CUSTOMIZATIONS:
  UNIQUE(order_item_id, attribute_code_snapshot)

ORDER_ITEM_INGREDIENT_CUSTOMIZATIONS:
  UNIQUE(order_item_id, ingredient_id)

ORDER_ITEM_SUBSTITUTIONS:
  UNIQUE(order_item_id, original_ingredient_id)
```

### Foreign-key behavior

- Deleting an order cascades to its order items and all order-item snapshot rows.
- Snapshot references to dishes, ingredients, taste attributes, and substitution rules use `ON DELETE SET NULL`; the snapshot text remains authoritative for history.
- Active menu configuration rows should normally be soft-deleted or marked unavailable.
- Deleting a dish-configuration parent cascades only to its owned configuration children, never to historical order snapshots.

### General constraints

- All timestamps are stored in UTC.
- Currency is an ISO 4217 uppercase code and all monetary fields on one order use the same currency.
- Item quantity is between `1` and `20` for the MVP.
- Taste and ingredient ranges must satisfy minimum <= default/base <= maximum.

---

## 11. Order Price Calculation

### Item Customization Total

```text
item_customization_total =
    sum(taste price deltas)
    + sum(ingredient price deltas)
    + sum(substitution price deltas)
```

### Item Price

```text
final_unit_price =
    dish base price + item customization total
```

### Order Totals

```text
subtotal =
    sum(base unit price * quantity)

customization_total =
    sum(customization unit price * quantity)

total =
    subtotal
    + customization_total
    + delivery_fee
    - discount_total
```

For the MVP:

```text
discount_total = 0
```

The backend is authoritative for all calculations.

---

## 12. Order Creation Transaction

The backend must perform the following steps:

```text
1. Validate request structure.
2. Validate idempotency key.
3. Confirm the cart is not empty.
4. Validate customer information.
5. Load every dish from the database.
6. Validate dish availability.
7. Validate taste values.
8. Resolve taste labels and kitchen instructions.
9. Validate ingredient quantities.
10. Validate substitutions.
11. Recalculate all prices.
12. Create ORDERS.
13. Create ORDER_ITEMS.
14. Create taste customization snapshots.
15. Create ingredient customization snapshots.
16. Create substitution snapshots.
17. Commit the database transaction.
```

If any step fails, the full transaction must roll back.

---

## 13. Duplicate Submission Protection

The order endpoint must accept:

```http
Idempotency-Key: client-generated-uuid
```

When the same key is submitted again:

- Return the already-created order if the original request succeeded.
- Do not create a second order.
- Normalize the validated request and persist its hash in `idempotency_request_hash`.
- Reject reuse of the key when the persisted hash differs from the new normalized request hash.

---

## 14. Checkout Request Example

```json
{
  "customer": {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "0912345678",
    "deliveryAddress": "12 Example Street, Hanoi"
  },
  "fulfillmentType": "DELIVERY",
  "paymentMethod": "CASH_ON_DELIVERY",
  "customerNotes": "Please call when arriving.",
  "items": [
    {
      "dishId": "pho-bo-id",
      "quantity": 1,
      "tasteProfileCode": "KR_INSPIRED",
      "tasteValues": {
        "spice_level": 3,
        "herb_intensity": 2
      },
      "ingredientQuantities": {
        "fresh-chili-id": 2,
        "thai-basil-id": 0
      },
      "substitutionIds": [],
      "notes": "Please serve lime separately."
    }
  ]
}
```

The request must not contain authoritative price fields.

---

## 15. Order Response Example

```json
{
  "data": {
    "id": "order-id",
    "orderNumber": "VFT-20260715-0042",
    "status": "PENDING",
    "paymentStatus": "UNPAID",
    "paymentMethod": "CASH_ON_DELIVERY",
    "fulfillmentType": "DELIVERY",
    "subtotal": 65000,
    "customizationTotal": 0,
    "deliveryFee": 15000,
    "discountTotal": 0,
    "total": 80000,
    "currency": "VND"
  },
  "error": null
}
```

---

## 16. Guest Order Lookup

Guest lookup uses:

- Order number.
- Customer phone number.

The public response may include:

- Current status.
- Customer-facing item summaries.
- Price breakdown.
- Creation and update times.

The public response must not include:

- Kitchen-only instructions.
- Internal staff notes.
- Database identifiers that are not needed by the client.

Order lookup should be rate-limited and return a generic mismatch message.

---

## 17. Recommended MVP Simplifications

- Guest checkout first.
- No real online payment.
- Cash or mock payment only.
- One address string rather than normalized address tables.
- No coupons.
- No refunds workflow.
- No delivery tracking.
- Browser storage for cart.
- Prisma transaction for order creation.
- Soft deletion for dishes and ingredients.
- Use integer VND values in API responses.
- Store all monetary values as integer minor units in `bigint` columns.
