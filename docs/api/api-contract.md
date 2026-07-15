# API Contract

## 1. Purpose

This document defines the initial HTTP API contract for the Vietnamese Food Taste App MVP.

The contract supports:

- Taste profile discovery.
- Menu browsing.
- Dish customization.
- Customization validation.
- Guest checkout.
- Guest order lookup.
- Basic restaurant order management.

Base path:

```text
/api
```

Content type:

```text
application/json
```

---

## 2. General Response Format

### Success

```json
{
  "data": {},
  "error": null
}
```

### Error

```json
{
  "data": null,
  "error": {
    "code": "INVALID_TASTE_VALUE",
    "message": "Spice level must be between 0 and 3.",
    "field": "items[0].tasteValues.spice_level",
    "details": {}
  }
}
```

---

## 3. HTTP Status Codes

| Status | Meaning |
|---:|---|
| 200 | Successful read or update |
| 201 | Resource created |
| 400 | Invalid request structure |
| 401 | Authentication required |
| 403 | Insufficient permission |
| 404 | Resource not found |
| 409 | Current state conflicts with the request |
| 422 | Business validation failed |
| 500 | Unexpected server error |

Examples:

- Missing required JSON property: `400`.
- Dish not found: `404`.
- Dish became unavailable during checkout: `409`.
- Taste value outside allowed range: `422`.
- Order created: `201`.

---

## 4. Money Format

All amounts are represented as integer minor units. For VND, one unit is one Ä‘á»“ng. Database and API calculations must not use floating-point arithmetic.

```json
{
  "basePrice": 65000,
  "currency": "VND"
}
```

The frontend may display prices but must never be treated as authoritative.

---

## 5. Taste Profile Endpoints

### 5.1 List Taste Profiles

```http
GET /api/taste-profiles
```

#### Response

```json
{
  "data": {
    "items": [
      {
        "id": "profile-id",
        "code": "KR_INSPIRED",
        "name": "Korean-inspired",
        "type": "COUNTRY",
        "countryCode": "KR",
        "description": "A suggested starting point that can be changed.",
        "attributes": {
          "spice_level": 4,
          "sweetness": 2,
          "sourness": 3,
          "fish_sauce_intensity": 2,
          "herb_intensity": 3,
          "oil_richness": 3
        }
      }
    ]
  },
  "error": null
}
```

---

### 5.2 Get One Taste Profile

```http
GET /api/taste-profiles/:code
```

#### Errors

- `404 TASTE_PROFILE_NOT_FOUND`

---

## 6. Dish Endpoints

### 6.1 List Dishes

```http
GET /api/dishes
```

#### Query Parameters

| Parameter | Type | Required | Example |
|---|---|---|---|
| `page` | integer | No | `1` |
| `pageSize` | integer | No | `12` |
| `search` | string | No | `pho` |
| `category` | string | No | `noodle-soup` |
| `dietary` | string | No | `vegetarian-option` |
| `excludeAllergen` | string | No | `peanut` |
| `available` | boolean | No | `true` |

`page` must be at least `1`. `pageSize` defaults to `12` and is capped at `100`. `excludeAllergen` excludes dishes whose selected/default configuration contains the supplied allergen code.

#### Response

```json
{
  "data": {
    "items": [
      {
        "id": "dish-id",
        "slug": "pho-bo",
        "name": "Phá»Ÿ bĂ²",
        "shortDescription": "Vietnamese beef noodle soup.",
        "imageUrl": "/images/pho-bo.jpg",
        "basePrice": 65000,
        "currency": "VND",
        "preparationTimeMinutes": 15,
        "category": {
          "code": "NOODLE_SOUP",
          "name": "Noodle Soup"
        },
        "dietaryTags": [],
        "allergens": [],
        "isAvailable": true
      }
    ],
    "page": 1,
    "pageSize": 12,
    "total": 8
  },
  "error": null
}
```

---

### 6.2 Get Dish Detail

```http
GET /api/dishes/:slug
```

#### Response

```json
{
  "data": {
    "id": "dish-id",
    "slug": "pho-bo",
    "name": "Phá»Ÿ bĂ²",
    "description": "A Vietnamese beef noodle soup.",
    "imageUrl": "/images/pho-bo.jpg",
    "basePrice": 65000,
    "currency": "VND",
    "preparationTimeMinutes": 15,
    "isAvailable": true,
    "tasteConfigurations": [
      {
        "attributeId": "attribute-id",
        "code": "spice_level",
        "name": "Spiciness",
        "baseValue": 1,
        "minValue": 0,
        "maxValue": 5,
        "isAdjustable": true,
        "options": [
          {
            "value": 0,
            "customerLabel": "No spice",
            "customerDescription": "No chili added.",
            "priceDelta": 0
          }
        ]
      }
    ],
    "ingredients": [
      {
        "dishIngredientId": "dish-ingredient-id",
        "ingredientId": "ingredient-id",
        "name": "Fresh chili",
        "role": "OPTIONAL",
        "defaultQuantity": 0,
        "minQuantity": 0,
        "maxQuantity": 3,
        "unit": "portion",
        "isQuantityAdjustable": true,
        "priceDeltaPerStep": 0,
        "isAvailable": true,
        "allergens": []
      }
    ],
    "substitutions": [
      {
        "id": "substitution-id",
        "originalIngredientId": "beef-id",
        "originalIngredientName": "Beef slices",
        "substituteIngredientId": "tofu-id",
        "substituteIngredientName": "Tofu",
        "reason": "Vegetarian alternative",
        "priceDelta": -5000,
        "isAvailable": true
      }
    ],
    "allergens": []
  },
  "error": null
}
```

#### Errors

- `404 DISH_NOT_FOUND`

---

## 7. Recommendation Endpoint

### 7.1 Calculate Dish Recommendation

```http
POST /api/dishes/:dishId/recommendation
```

#### Request

```json
{
  "tasteProfileCode": "KR_INSPIRED",
  "personalPreferences": {
    "spice_level": 5,
    "herb_intensity": 2
  }
}
```

Both fields are optional. If neither supplies a value, the dish base value is used.

#### Response

```json
{
  "data": {
    "dishId": "dish-id",
    "attributes": [
      {
        "code": "spice_level",
        "name": "Spiciness",
        "recommendationSource": "PERSONAL",
        "sourceValue": 5,
        "baseValue": 1,
        "minValue": 0,
        "maxValue": 3,
        "appliedValue": 3,
        "wasClamped": true,
        "customerLabel": "Spicy"
      }
    ]
  },
  "error": null
}
```

#### Recommendation Sources

```text
PERSONAL
TASTE_PROFILE
DISH_DEFAULT
```

#### Errors

- `404 DISH_NOT_FOUND`
- `404 TASTE_PROFILE_NOT_FOUND`
- `422 INVALID_PERSONAL_PREFERENCE`

---

## 8. Customization Validation Endpoint

### 8.1 Validate and Price a Configuration

```http
POST /api/dishes/:dishId/validate-customization
```

This endpoint validates a single configured dish before checkout. Checkout still performs the same validation again.

#### Request

```json
{
  "tasteValues": {
    "spice_level": 3,
    "herb_intensity": 2
  },
  "ingredientQuantities": {
    "fresh-chili-id": 2,
    "thai-basil-id": 0
  },
  "substitutionIds": [],
  "notes": "Serve lime separately."
}
```

#### Response

```json
{
  "data": {
    "valid": true,
    "dishId": "dish-id",
    "basePrice": 65000,
    "customizationPrice": 0,
    "finalUnitPrice": 65000,
    "currency": "VND",
    "configurationHash": "sha256-of-normalized-configuration-and-pricing-rules",
    "warnings": [
      {
        "code": "CONTAINS_FISH_SAUCE",
        "message": "This configuration contains fish sauce."
      }
    ],
    "normalizedConfiguration": {
      "tasteValues": {
        "spice_level": 3,
        "herb_intensity": 2
      },
      "ingredientQuantities": {
        "fresh-chili-id": 2,
        "thai-basil-id": 0
      },
      "substitutionIds": []
    }
  },
  "error": null
}
```

`configurationHash` is optional at checkout. It is not a price and is never authoritative; it allows the server to detect that menu or pricing rules changed after the customer reviewed the configuration.

#### Business Validation Errors

- `DISH_UNAVAILABLE`
- `INVALID_TASTE_ATTRIBUTE`
- `INVALID_TASTE_VALUE`
- `INGREDIENT_NOT_IN_DISH`
- `INGREDIENT_NOT_ADJUSTABLE`
- `INVALID_INGREDIENT_QUANTITY`
- `INGREDIENT_UNAVAILABLE`
- `INVALID_SUBSTITUTION`
- `SUBSTITUTION_UNAVAILABLE`
- `NOTES_TOO_LONG`

---

## 9. Order Endpoints

### 9.1 Create an Order

```http
POST /api/orders
```

An idempotency key is required to prevent duplicate submissions:

```http
Idempotency-Key: client-generated-uuid
```

#### Request

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
      "dishId": "dish-id",
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
      "configurationHash": "sha256-of-normalized-configuration-and-pricing-rules",
      "notes": "Serve lime separately."
    }
  ]
}
```

Authoritative prices must not be accepted from the request.

`customer.deliveryAddress` is required for `DELIVERY` and must be omitted or null for `PICKUP`. Payment method must be compatible with fulfillment type: `CASH_ON_DELIVERY` for delivery, `CASH_ON_PICKUP` for pickup, and `MOCK_PAYMENT` for either during development.

If an item includes `configurationHash`, the backend recalculates the configuration and returns `409 PRICE_CHANGED` when the current hash differs. The error details should contain a customer-safe updated price summary so the user can review and resubmit.

#### Response

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
    "currency": "VND",
    "createdAt": "2026-07-15T16:30:00.000Z"
  },
  "error": null
}
```

#### Errors

- `400 EMPTY_ORDER`
- `400 INVALID_CUSTOMER_DATA`
- `400 MISSING_IDEMPOTENCY_KEY`
- `400 INVALID_PAYMENT_METHOD`
- `409 DISH_UNAVAILABLE`
- `409 INGREDIENT_UNAVAILABLE`
- `409 SUBSTITUTION_UNAVAILABLE`
- `409 PRICE_CHANGED`
- `409 IDEMPOTENCY_KEY_REUSED`
- `422 INVALID_ORDER_ITEM`
- `422 INVALID_TASTE_VALUE`
- `422 INVALID_INGREDIENT_QUANTITY`
- `500 ORDER_CREATION_FAILED`

Order creation must use one database transaction.

Reusing an idempotency key with the same normalized payload returns the original successful response. Reusing it with a different payload returns `409 IDEMPOTENCY_KEY_REUSED`.

---

### 9.2 Guest Order Lookup

```http
POST /api/orders/lookup
```

#### Request

```json
{
  "orderNumber": "VFT-20260715-0042",
  "phone": "0912345678"
}
```

#### Response

```json
{
  "data": {
    "orderNumber": "VFT-20260715-0042",
    "status": "PREPARING",
    "paymentStatus": "UNPAID",
    "fulfillmentType": "DELIVERY",
    "subtotal": 65000,
    "deliveryFee": 15000,
    "total": 80000,
    "currency": "VND",
    "items": [
      {
        "dishName": "Phá»Ÿ bĂ²",
        "quantity": 1,
        "finalUnitPrice": 65000,
        "lineTotal": 65000,
        "tasteSelections": [
          {
            "name": "Spiciness",
            "value": 3,
            "label": "Spicy"
          }
        ],
        "ingredientChanges": [
          {
            "name": "Fresh chili",
            "action": "INCREASED",
            "selectedQuantity": 2,
            "unit": "portion"
          }
        ]
      }
    ],
    "createdAt": "2026-07-15T16:30:00.000Z",
    "updatedAt": "2026-07-15T16:40:00.000Z"
  },
  "error": null
}
```

#### Errors

- `404 ORDER_NOT_FOUND`
- `422 ORDER_LOOKUP_MISMATCH`

A generic error message should be used to avoid exposing whether an order number or phone number exists.

---

## 10. Staff Order Endpoints

These endpoints require staff authentication and authorization.

### 10.1 List Orders

```http
GET /api/staff/orders?status=PENDING
```

### 10.2 Get Staff Order Detail

```http
GET /api/staff/orders/:orderNumber
```

The staff response may include kitchen instruction snapshots.

### 10.3 Change Order Status

```http
PATCH /api/staff/orders/:orderNumber/status
```

#### Request

```json
{
  "status": "CONFIRMED",
  "reason": null
}
```

`reason` is required when changing status to `CANCELLED`. Every successful transition records the authenticated staff actor in `ORDER_STATUS_HISTORY`.

#### Valid Standard Transitions

```text
PENDING -> CONFIRMED
CONFIRMED -> PREPARING
PREPARING -> READY
READY -> COMPLETED
PENDING -> CANCELLED
CONFIRMED -> CANCELLED
```

#### Errors

- `404 ORDER_NOT_FOUND`
- `409 INVALID_STATUS_TRANSITION`
- `403 STAFF_PERMISSION_REQUIRED`

---

## 11. Validation Limits

Recommended MVP limits:

| Field | Limit |
|---|---:|
| Customer name | 100 characters |
| Email | 254 characters |
| Phone | 30 characters |
| Delivery address | 500 characters |
| Customer notes | 500 characters |
| Item notes | 300 characters |
| Item quantity | 1â€“20 |

---

## 12. Security Rules

- Never trust frontend prices.
- Never expose internal database errors.
- Validate every identifier against the selected dish.
- Rate-limit order lookup.
- Normalize the lookup phone number and compare an indexed HMAC rather than scanning plaintext phone snapshots.
- Use generic lookup failure messages.
- Require authorization for staff endpoints.
- Sanitize customer notes before display.
- Use idempotency protection for order creation.
- Avoid exposing kitchen-only instructions through public endpoints.
- Do not log full phone numbers, delivery addresses, customer notes, or idempotency payloads.
- Apply request-size limits and reject unknown properties on checkout and staff mutation requests.
