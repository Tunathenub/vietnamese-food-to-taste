# Vietnamese Food Taste App

Full-stack web app for selling Vietnamese food to international customers, with taste customization by country or region.

## Core Idea

The app lets customers choose a country or taste preference, then adjusts Vietnamese dishes through shared taste attributes instead of duplicating each dish per country.

For example:

- Korean preference can increase `spice_level`
- Middle Eastern preference can reduce `fish_sauce_intensity`
- Each dish still controls its own allowed adjustment range

This keeps the data model flexible and avoids creating many country-specific dish variants.

## MVP Scope

1. Browse Vietnamese dishes
2. Choose preferred country or taste profile
3. Show recommended dish variations based on the selected profile
4. Fine-tune taste attributes for each dish
5. Add items to cart and place a basic order

## User Flow

```text
Open app
  -> Choose country / taste preference
  -> View menu adjusted to preference
  -> Fine-tune individual dishes
  -> Add to cart
  -> Checkout
```

## Taste Attributes

| Code | Description | Range |
| --- | --- | --- |
| `spice_level` | Spiciness | 0-5 |
| `sweetness` | Sweetness | 0-5 |
| `sourness` | Sourness | 0-5 |
| `fish_sauce_intensity` | Fish sauce intensity | 0-5 |
| `herb_intensity` | Herb intensity | 0-5 |
| `oil_richness` | Oil/fat richness | 0-5 |

## Recommended Stack

| Layer | Choice |
| --- | --- |
| Full-stack framework | Next.js |
| UI | React |
| ORM | Prisma |
| Database | PostgreSQL |

## Documentation

- [Documentation index](docs/README.md)
- [Business rules](docs/business-rules/Business%20Rules%20for%20Vietnamese%20Food%20Taste%20App.docx)
- [Order data model](docs/architecture/order-model.md)
- [API contract](docs/api/api-contract.md)
- [User flows](docs/product/user-flows.md)
- [Sitemap](docs/product/sitemap.md)
- [Initial dish and ingredient dataset](docs/data/Initial%20Dish%20and%20Ingredient%20Dataset.docx)
- [Source document assessment](docs/reviews/source-documents-assessment.md)

## Current Status

- [x] Define MVP features
- [x] Design core data model
- [x] Draft order layer
- [x] Resolve core order-model decisions
- [x] Define user flows and sitemap
- [x] Draft API contract
- [ ] Convert schema to Prisma
- [ ] Choose final tech stack
- [ ] Design wireframes
- [ ] Design backend APIs
- [ ] Build frontend

