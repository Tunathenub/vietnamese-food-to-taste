# Sitemap

## 1. Purpose

This document defines the page structure for the Vietnamese Food Taste App MVP.

The MVP prioritizes the customer ordering flow and a minimal restaurant order-management flow.

---

## 2. Public Customer Pages

```text
/
├── /taste-profiles
├── /menu
│   └── /menu/[dish-slug]
├── /cart
├── /checkout
├── /orders/success
└── /orders/lookup
    └── /orders/[order-number]
```

---

## 3. Page Definitions

### `/` — Landing Page

Purpose:

- Introduce the product.
- Explain personalized Vietnamese food.
- Direct users to taste profile selection or the menu.

Primary actions:

- Explore menu.
- Choose taste profile.

---

### `/taste-profiles` — Taste Profile Selection

Purpose:

- Display available suggested profiles.
- Allow users to adjust personal preferences.
- Allow users to skip.

Main components:

- Taste profile cards.
- Taste attribute controls.
- Continue button.
- Skip button.
- Recommendation disclaimer.

---

### `/menu` — Menu

Purpose:

- Display active dishes.
- Allow filtering and searching.
- Show personalized recommendation summaries.

Main components:

- Header.
- Search input.
- Filter controls.
- Dish grid.
- Active profile indicator.
- Cart indicator.

---

### `/menu/[dish-slug]` — Dish Detail and Customizer

Purpose:

- Explain the dish.
- Display ingredients and allergens.
- Apply recommendations.
- Allow valid customization.
- Add a configured item to the cart.

Main components:

- Dish image and description.
- Price.
- Preparation time.
- Taste controls.
- Ingredient controls.
- Substitution controls.
- Allergen warning.
- Price summary.
- Add-to-cart button.

---

### `/cart` — Cart

Purpose:

- Review configured dishes.
- Edit quantity.
- Edit or remove a configuration.
- Continue to checkout.

Main components:

- Cart item list.
- Customization summary.
- Quantity controls.
- Price breakdown.
- Empty-cart state.
- Checkout action.

---

### `/checkout` — Checkout

Purpose:

- Collect customer information.
- Review the order.
- Select payment method.
- Submit the order.

Main components:

- Customer form.
- Delivery or pickup selector.
- Conditional delivery address.
- Payment method.
- Order summary.
- Validation messages.
- Submit button.

---

### `/orders/success` — Order Success

Purpose:

- Confirm order creation.
- Display the order number.
- Explain the next step.

Main components:

- Success state.
- Order number.
- Order total.
- Order status.
- Link to order details.

---

### `/orders/lookup` — Guest Order Lookup

Purpose:

- Allow a guest to find an order using order number and phone number.

Main components:

- Order number input.
- Phone number input.
- Lookup action.
- Error state.

---

### `/orders/[order-number]` — Order Details

Purpose:

- Display the current order status.
- Display historical item snapshots.

Main components:

- Status timeline.
- Item list.
- Customer-facing customization summary.
- Price breakdown.
- Customer details.

---

## 4. Optional Authentication Pages

Authentication is not required for the first guest-checkout release.

These pages may be added later:

```text
/auth/login
/auth/register
/account
/account/preferences
/account/orders
/account/orders/[order-number]
```

---

## 5. Restaurant Pages

A minimal internal interface may use:

```text
/staff/orders
/staff/orders/[order-number]
```

### `/staff/orders`

Purpose:

- List current orders.
- Filter by status.
- Highlight new pending orders.

### `/staff/orders/[order-number]`

Purpose:

- Display kitchen instructions.
- Change order status.
- Display customer notes.

Authentication and authorization are required before staff pages are implemented.

---

## 6. Navigation Structure

### Customer Header

- Home.
- Menu.
- Taste profile.
- Cart.

### Customer Mobile Navigation

- Home.
- Menu.
- Preferences.
- Cart.

### Staff Navigation

- Orders.
- Active preparation.
- Completed orders.

---

## 7. Figma Frame Priority

Create low-fidelity frames in this order:

1. Mobile menu.
2. Mobile dish customizer.
3. Mobile cart.
4. Mobile checkout.
5. Taste profile selection.
6. Order success.
7. Desktop menu.
8. Desktop dish customizer.
9. Staff order list.
10. Staff order detail.

The dish customizer is the highest-priority screen because it represents the product's main differentiating feature.
