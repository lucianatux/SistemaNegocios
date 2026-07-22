# Tero — Retail Management for Small Shops

A complete point-of-sale and inventory system that runs entirely in the browser. No backend, no build step, no framework, no npm install. Open the HTML file and it works — including offline.

Built for real corner shops in Argentina, where connectivity is unreliable and monthly SaaS fees are not an option.

---<img width="500" height="500" alt="teroappennegocio" src="https://github.com/user-attachments/assets/794b3407-3c83-4a55-bbb6-804e9992871b" />


## Why it's interesting

Most "vanilla JS" projects are small. This one is a full application (~10k lines) that stays maintainable without a framework, by enforcing a strict architecture by hand:

- **Unidirectional data flow** — modules never mutate state directly. Every change goes through `Store.set()`, which persists and emits an event.
- **One writer per concern** — `Storage.js` is the only file that touches `localStorage`; every key string lives there and nowhere else.
- **Pure business logic** — `PriceService` and `ProductService` never touch the DOM. Same inputs, same outputs, trivially testable.
- **Decoupled modules** — 13 feature modules communicate only through a pub/sub `EventBus`. Removing a module breaks nothing else.

Each module is an IIFE with explicit dependency injection, exposing a minimal public API.

```
app/
├── core/       EventBus · Storage · Store · Activation
├── services/   PriceService · ProductService
├── modules/    13 self-contained UI features
└── main.js     Single entry point, explicit init order
```

## Features

| | |
|---|---|
| **Catalog** | CRUD, categories, live search, JSON import/export backups |
| **Pricing** | Margin resolution with 3-level priority (product → category → global), quantity-based tiers, rounding rules matching the shop's own spreadsheet |
| **Sales** | Ticket builder, discounts/surcharges, cash · transfer · split · store-credit payments |
| **Bulk goods** | Weighing modal with reverse calculation — enter an amount in pesos, get the grams, picking the tier most favourable to the customer |
| **Promos** | Bundle builder that computes the maximum discount before losing money, with formatted WhatsApp export |
| **Stock** | Levels, minimum thresholds, low-stock alerts, auto-decrement on each sale |
| **Customers** | Store credit ledger, balances, per-customer history and printable statements |
| **Analytics** | Daily/monthly/yearly breakdowns by payment method and customer |
| **Labels** | Batch barcode label generation and printing (JsBarcode) |
| **UI** | Light/dark themes, dedicated two-column layout for sales and promo modes |

## Stack

Vanilla JavaScript (ES5-compatible syntax) · CSS custom properties · Web Crypto API · `localStorage` · JsBarcode

Zero runtime dependencies beyond a single vendored barcode library.

## Notable implementation details

- **Reverse price calculation with tiers** — solving "how many grams for $X" when the margin itself depends on the quantity requires evaluating each tier independently and selecting among valid solutions.
- **Backwards-compatible data migrations** — stock fields are extracted and separated on import, so backups from earlier versions still load cleanly.
- **Offline-first by design** — the entire state lives in `localStorage`, and JSON export/import is the backup strategy.
- **Licensing** — SHA-256 key validation via Web Crypto (client-side gate, appropriate to the distribution model).

## Running it

```bash
git clone <repo>
# open ABRIR.html in any browser
```

That's the whole setup.

---

*In production use by a real business. Built and maintained by Lu Tux. Luciana Caminos Cano https://lucianatux.github.io/portfolio_LCC/*
