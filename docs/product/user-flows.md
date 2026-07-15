# User Flows

## 1. Purpose

This document defines the main user flows for the Vietnamese Food Taste App MVP.

The flows cover guest users, personalized taste recommendations, dish customization, cart management, checkout, and basic order management.

---

## 2. Main Navigation Flow

```text
Landing Page
    -> Taste Profile Selection
    -> Personalized Menu
    -> Dish Detail and Customization
    -> Cart
    -> Checkout
    -> Order Success
    -> Order Details
```

Country or taste profile selection is optional. If the user skips it, dish base values are used as the recommendation fallback.

---

## 3. Flow 1: Select a Taste Profile

### Goal

Allow the user to choose a suggested taste profile before viewing the menu.

### Happy Path

```text
1. User opens the application.
2. User selects "Explore Menu".
3. System displays available taste profiles.
4. User selects one profile.
5. System displays the profile's suggested taste values.
6. User may adjust personal taste values.
7. User confirms the selection.
8. System stores the preferences.
9. System opens the personalized menu.
```

### Storage Rules

- Guest preferences are stored in browser storage.
- Authenticated preferences may be stored in the database.
- Personal values override profile defaults.
- Profile defaults override dish base values.
- Skipping profile selection is allowed.

### Alternative Flow: Skip Selection

```text
1. User opens taste profile selection.
2. User selects "Skip for now".
3. System does not apply a profile.
4. Dish base values are used as recommendation defaults.
5. System opens the menu.
```

### Error and Empty States

- No profiles available.
- Preferences cannot be saved.
- Browser storage is unavailable.
- Profile data cannot be loaded.

---

## 4. Flow 2: Browse the Menu

### Goal

Allow users to browse dishes and find a suitable option.

### Happy Path

```text
1. User opens the menu.
2. System loads active dishes.
3. System displays dish cards.
4. User may filter dishes.
5. User selects a dish.
6. System opens the dish detail page.
```

### Supported MVP Filters

- Category.
- Vegetarian option available.
- Allergen warning.
- Price range.
- Search by dish name.

### Dish Card Content

- Image.
- Name.
- Short description.
- Base price.
- Preparation time.
- Dietary labels.
- Main allergen warnings.
- Personalized recommendation summary, when available.
- Availability status.

### Empty and Error States

- No dishes match filters.
- Menu cannot be loaded.
- Dish became unavailable.
- Image cannot be loaded.

---

## 5. Flow 3: View and Customize a Dish

### Goal

Allow the user to understand the dish and create a valid customized configuration.

### Happy Path

```text
1. User opens a dish.
2. System loads dish information.
3. System loads supported taste attributes.
4. System calculates recommended values.
5. System clamps recommendations to dish limits.
6. System displays customer-facing taste controls.
7. User changes one or more taste values.
8. User removes, adds, increases, or decreases allowed ingredients.
9. User selects valid substitutions.
10. System updates allergen warnings.
11. System recalculates the displayed price.
12. User adds the configuration to the cart.
```

### Recommendation Priority

```text
1. Personal preference
2. Selected taste profile
3. Dish base value
```

### Clamp Rule

```text
appliedValue = min(max(sourceValue, minValue), maxValue)
```

When a recommendation is clamped, the interface should explain that the dish supports a smaller range.

### Ingredient Actions

Only actions explicitly supported by the dish are displayed:

- Remove.
- Add.
- Increase.
- Decrease.
- Substitute.

Required ingredients cannot be removed.

### Validation Before Adding to Cart

The client validates basic form rules. The server remains authoritative and must validate the complete configuration during checkout.

### Error States

- Dish unavailable.
- Unsupported taste attribute.
- Taste value outside the allowed range.
- Ingredient unavailable.
- Ingredient quantity outside the allowed range.
- Invalid substitution.
- Recommendation service unavailable.

---

## 6. Flow 4: Add an Item to the Cart

### Happy Path

```text
1. User selects "Add to Cart".
2. System creates a cart configuration key.
3. System checks whether an identical configuration exists.
4. If identical, system increases cart quantity.
5. If different, system creates a new cart item.
6. System displays cart confirmation.
```

### Cart Item Identity

Two cart items are identical only when all of these values match:

- Dish ID.
- Taste values.
- Ingredient quantities.
- Removed ingredients.
- Added ingredients.
- Substitutions.
- Special notes.

Two versions of the same dish with different customizations must remain separate cart items.

---

## 7. Flow 5: Manage the Cart

### Happy Path

```text
1. User opens the cart.
2. System displays all configured items.
3. User reviews customization summaries.
4. User may change item quantity.
5. User may edit a configuration.
6. User may remove an item.
7. System updates displayed totals.
8. User proceeds to checkout.
```

### Rules

- Cart quantity changes the number of identical configured dishes.
- Ingredient quantity is part of the dish configuration.
- Editing a cart item may create a separate configuration.
- Cart values are temporary and not authoritative.
- The backend recalculates all prices at checkout.

### Empty and Error States

- Empty cart.
- Dish no longer available.
- Ingredient no longer available.
- Displayed price changed.
- Cart data is corrupted.

---

## 8. Flow 6: Guest Checkout

### Goal

Allow an order to be placed without requiring account creation.

### Required Customer Information

- Customer name.
- Customer phone.
- Fulfillment type.
- Delivery address when fulfillment type is delivery.

Email is optional for the MVP.

### Happy Path

```text
1. User opens checkout.
2. System displays an order summary.
3. User enters customer information.
4. User selects delivery or pickup.
5. User selects a compatible payment method.
6. User submits the order with an idempotency key.
7. Backend validates the customer data.
8. Backend reloads all dishes and customization rules.
9. Backend validates availability and ranges.
10. Backend recalculates prices and checks any configuration hashes.
11. Backend creates the order in a transaction.
12. System returns an order number.
13. Client clears the cart only after a successful response.
14. System displays the order success page.
```

### Payment Methods for MVP

- Cash on delivery.
- Cash on pickup.
- Mock payment.

### Checkout Error States

- Empty cart.
- Invalid customer information.
- Dish became unavailable.
- Ingredient became unavailable.
- Substitution became invalid.
- Price changed.
- Database transaction failed.
- Duplicate submission.
- Idempotency-key reuse with different checkout data.

When the price changes, the user should see the updated amount and confirm before resubmitting.

---

## 9. Flow 7: View Order Details

### Guest Order Lookup

```text
1. User enters order number.
2. User enters the phone number used during checkout.
3. System validates the lookup information.
4. System displays order status and item snapshots.
```

### Information Displayed

- Order number.
- Current status.
- Customer information.
- Ordered items.
- Taste selections.
- Ingredient changes.
- Kitchen-facing labels converted to customer-facing summaries.
- Price breakdown.
- Creation time.

Kitchen instructions must not be exposed unless they are safe and useful for the customer.

---

## 10. Flow 8: Restaurant Order Management

### Happy Path

```text
1. Staff views pending orders.
2. Staff opens an order.
3. System displays item snapshots and kitchen instructions.
4. Staff confirms the order.
5. Staff starts preparation.
6. Staff marks the order as ready.
7. Staff marks the order as completed.
```

### Valid Status Progression

```text
PENDING
    -> CONFIRMED
    -> PREPARING
    -> READY
    -> COMPLETED
```

Cancellation may occur from:

```text
PENDING -> CANCELLED
CONFIRMED -> CANCELLED
```

Direct status changes that skip required stages should be rejected unless an administrator override is introduced later.

---

## 11. Important UX States

Every main screen should account for:

- Loading.
- Empty.
- Error.
- Disabled.
- Success.
- Unavailable.
- Validation warning.
- Price change.
- Recommendation clamped.

---

## 12. MVP Exclusions

The initial flows do not include:

- Real-time delivery tracking.
- Online payment gateway integration.
- Coupons.
- Reviews.
- Loyalty points.
- Multi-restaurant marketplace.
- Real-time inventory management.
- Advanced account management.
