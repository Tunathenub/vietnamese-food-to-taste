# Data Model

The main design principle is to model taste as reusable attributes. Countries define recommended defaults for those attributes, while dishes define their own base values and allowed adjustment ranges.

## Tables

### `USERS`

```text
id                       uuid PK
email                    string
preferred_country_code   string FK -> COUNTRY_PROFILES
dietary_tags             string
```

### `COUNTRY_PROFILES`

```text
country_code   string PK
country_name   string
```

### `TASTE_ATTRIBUTES`

```text
id          uuid PK
code        string
name        string
min_value   int
max_value   int
```

### `COUNTRY_TASTE_DEFAULTS`

```text
country_code    string FK -> COUNTRY_PROFILES
attribute_id    uuid FK -> TASTE_ATTRIBUTES
default_value   int
```

### `DISHES`

```text
id           uuid PK
name         string
category     string
base_price   decimal
```

### `INGREDIENTS`

```text
id              uuid PK
name            string
category        string
allergen_tags   string
dietary_tags    string
```

### `DISH_INGREDIENTS`

```text
dish_id         uuid FK -> DISHES
ingredient_id   uuid FK -> INGREDIENTS
is_core         boolean
is_optional     boolean
```

### `DISH_TASTE_PROFILES`

```text
dish_id       uuid FK -> DISHES
attribute_id  uuid FK -> TASTE_ATTRIBUTES
base_value    int
min_adjust    int
max_adjust    int
```

### `INGREDIENT_SUBSTITUTIONS`

```text
id                         uuid PK
original_ingredient_id     uuid FK -> INGREDIENTS
substitute_ingredient_id   uuid FK -> INGREDIENTS
reason                     string
```

## Order Layer

A detailed draft is available in [Order Data Model](architecture/Order%20Data%20Model.docx). The following is the compact conceptual view; the detailed draft remains subject to the decisions recorded in the [source document assessment](reviews/source-documents-assessment.md).

```text
ORDERS
  id, user_id, status, created_at

ORDER_ITEMS
  id, order_id, dish_id, quantity, unit_price

ORDER_ITEM_CUSTOMIZATIONS
  order_item_id, attribute_id, chosen_value
  order_item_id, ingredient_id, substitution_id
```

Order item customizations should store a snapshot at purchase time so historical orders are not affected when dish recipes or substitution rules change later.

## Runtime Taste Logic

```text
1. User chooses a country_code, or the app detects it from locale.
2. Load COUNTRY_TASTE_DEFAULTS for the country.
3. For each dish taste attribute:
   a. Get the country's suggested value.
   b. Clamp it to the dish's [min_adjust, max_adjust] range.
   c. Display the clamped value to the user.
4. User can fine-tune values inside the allowed range.
5. Apply ingredient substitutions when relevant.
```

