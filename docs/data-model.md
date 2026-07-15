# Data Model

The main design principle is to model taste as reusable attributes. Taste profiles define recommended defaults, while dishes define their own base values and allowed ranges. The detailed [order data model](architecture/order-model.md) is authoritative for checkout and historical snapshots.

## Tables

### `USERS`

```text
id                           uuid PK
email                        string UNIQUE
role                         enum CUSTOMER | STAFF | ADMIN
preferred_taste_profile_id   uuid nullable FK -> TASTE_PROFILES
```

### `TASTE_PROFILES`

```text
id             uuid PK
code           string UNIQUE
name           string
type           enum COUNTRY | REGION | CUSTOM
country_code   string nullable
description    string nullable
is_active      boolean
```

### `TASTE_ATTRIBUTES`

```text
id          uuid PK
code        string UNIQUE
name        string
min_value   int
max_value   int

CHECK(min_value <= max_value)
```

### `TASTE_PROFILE_DEFAULTS`

```text
taste_profile_id   uuid FK -> TASTE_PROFILES
attribute_id       uuid FK -> TASTE_ATTRIBUTES
default_value      int

UNIQUE(taste_profile_id, attribute_id)
```

### `DISHES`

```text
id                   uuid PK
slug                 string UNIQUE
name                 string
category             string
base_price_minor     bigint
currency             string
is_available         boolean
deleted_at           datetime nullable
```

### `INGREDIENTS`

```text
id             uuid PK
code           string UNIQUE
name           string
category       string
is_available   boolean
deleted_at     datetime nullable
```

### `ALLERGENS` and `INGREDIENT_ALLERGENS`

```text
ALLERGENS
  id, code UNIQUE, name

INGREDIENT_ALLERGENS
  ingredient_id FK -> INGREDIENTS
  allergen_id FK -> ALLERGENS
  UNIQUE(ingredient_id, allergen_id)
```

### `DIETARY_TAGS` and `INGREDIENT_DIETARY_TAGS`

```text
DIETARY_TAGS
  id, code UNIQUE, name

INGREDIENT_DIETARY_TAGS
  ingredient_id FK -> INGREDIENTS
  dietary_tag_id FK -> DIETARY_TAGS
  UNIQUE(ingredient_id, dietary_tag_id)
```

Dish-level dietary labels and allergen warnings are calculated from the selected ingredient configuration. A separate curated dish label may describe that an option is available, but it must not override ingredient-level validation.

### `DISH_INGREDIENTS`

```text
id                         uuid PK
dish_id                    uuid FK -> DISHES
ingredient_id              uuid FK -> INGREDIENTS
role                       enum REQUIRED | REMOVABLE | OPTIONAL
default_quantity           decimal
min_quantity               decimal
max_quantity               decimal
unit                       string
price_delta_per_step       bigint
is_quantity_adjustable     boolean
is_available               boolean

UNIQUE(dish_id, ingredient_id)
```

### `DISH_TASTE_CONFIGURATIONS`

```text
id             uuid PK
dish_id        uuid FK -> DISHES
attribute_id   uuid FK -> TASTE_ATTRIBUTES
base_value     int
min_value      int
max_value      int
is_adjustable  boolean

UNIQUE(dish_id, attribute_id)
CHECK(min_value <= base_value AND base_value <= max_value)
```

### `DISH_TASTE_OPTIONS`

```text
id                     uuid PK
dish_taste_config_id   uuid FK -> DISH_TASTE_CONFIGURATIONS
value                  int
customer_label         string
kitchen_instruction    string
price_delta            bigint

UNIQUE(dish_taste_config_id, value)
```

### `DISH_INGREDIENT_SUBSTITUTIONS`

```text
id                       uuid PK
dish_id                  uuid FK -> DISHES
original_ingredient_id   uuid FK -> INGREDIENTS
substitute_ingredient_id uuid FK -> INGREDIENTS
reason                   string nullable
price_delta              bigint
kitchen_instruction      string
is_available             boolean

UNIQUE(dish_id, original_ingredient_id, substitute_ingredient_id)
```

## Order Layer

A detailed, implementation-oriented model is available in [Order Data Model](architecture/order-model.md). The selected design uses dedicated taste, ingredient, and substitution snapshot tables.

```text
ORDERS
  id, order_number, idempotency_key, user_id, status
  fulfillment_type, payment_status, monetary totals
  customer snapshots, lifecycle timestamps

ORDER_STATUS_HISTORY
  order_id, from_status, to_status, actor, reason, created_at

ORDER_ITEMS
  id, order_id, nullable dish_id, dish snapshots
  quantity, base/customization/final prices, line_total

ORDER_ITEM_TASTE_CUSTOMIZATIONS
ORDER_ITEM_INGREDIENT_CUSTOMIZATIONS
ORDER_ITEM_SUBSTITUTIONS
```

All order-item child records store customer-facing and kitchen-facing snapshots so historical orders do not depend on current menu configuration. All monetary values use integer minor units; for VND, one unit is one đồng.

## Runtime Taste Logic

```text
1. User optionally chooses a taste profile and may set personal preferences.
2. Load TASTE_PROFILE_DEFAULTS when a profile is selected.
3. For each dish taste attribute:
   a. Select personal value, profile default, or dish base value in that priority.
   b. Clamp it to the dish's [min_value, max_value] range.
   c. Display the clamped value to the user.
4. User can fine-tune values inside the allowed range.
5. Resolve the selected value to a customer label and kitchen instruction.
6. Validate ingredient quantities and dish-specific substitutions.
```

