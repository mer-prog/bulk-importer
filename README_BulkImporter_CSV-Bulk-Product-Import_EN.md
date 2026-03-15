# BulkImporter — Bulk Product Import for Shopify via CSV

> **What:** A Shopify Embedded App that lets merchants bulk-import products — including variants and images — by simply uploading a CSV file
> **Who:** Small-to-mid-size merchants and cross-border e-commerce stores managing large catalogs
> **Tech:** Remix · TypeScript · Prisma + SQLite · Polaris React · Shopify GraphQL Admin API · PapaParse

Source Code: [GitHub](https://github.com/mer-prog/bulk-importer)

---

## Skills Demonstrated

| Skill | Implementation |
|-------|---------------|
| Shopify Embedded App Development | Full App Bridge + Polaris UI integration with Shopify Admin, OAuth authentication, and webhook handling |
| GraphQL API Integration | Orchestrates 4 mutations: `productCreate`, `stagedUploadsCreate`, `productCreateMedia`, and `productVariantUpdate` |
| CSV Parsing & Validation | PapaParse-based header-aware CSV parsing with row-level validation and automatic variant row grouping |
| Image Upload Pipeline | Three-stage pipeline: URL fetch → staged upload → product media attachment, with per-variant image assignment |
| Database Design & ORM | Prisma + SQLite for job and record management with three-tier status tracking (success / partial / error) |
| Internationalization (i18n) | Custom React Context-based i18n with JSON dictionary files, EN/JA toggle, parameter interpolation, and locale fallback |
| Full-Stack Remix Architecture | Server-side action/loader pattern, client-side fetcher state management, and service layer separation |

## Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | Remix | ^2.16.1 | SSR framework based on Shopify App Template |
| Language | TypeScript | ^5.2.2 | Type-safe development with strict mode |
| Build Tool | Vite | ^6.2.2 | Fast HMR and production builds |
| UI Framework | Polaris React | ^12.0.0 | Native Shopify Admin UI components |
| App Integration | Shopify App Bridge React | ^4.1.6 | Embedded App integration with Shopify Admin |
| App SDK | shopify-app-remix | ^4.1.0 | Authentication, session management, webhook handling |
| ORM | Prisma Client | ^6.2.1 | Type-safe database abstraction |
| Database | SQLite | - | Lightweight embedded database (Prisma provider) |
| Session Storage | shopify-app-session-storage-prisma | ^8.0.0 | Session persistence via Prisma |
| CSV Parsing | PapaParse | ^5.5.3 | High-performance CSV parsing |
| Runtime | Node.js | >=20.19 | Server execution environment |
| Linter | ESLint | ^8.42.0 | Code quality enforcement |
| Formatter | Prettier | ^3.2.4 | Consistent code formatting |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Shopify Admin                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               App Bridge (Embedded)                   │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐  │  │
│  │  │ CsvDropzone  │ │ PreviewTable │ │ImportProgress │  │  │
│  │  │ Drag & Drop  │ │ Product      │ │ Progress Bar  │  │  │
│  │  │ Upload       │ │ Preview      │ │ Result Display│  │  │
│  │  └──────┬───────┘ └──────┬───────┘ └───────┬───────┘  │  │
│  │         │ CSV Text       │ Confirm          │ Done     │  │
│  └─────────┼───────────────┼──────────────────┼──────────┘  │
│            ▼               ▼                  ▲              │
│  ┌─────────────────────────────────────────────┐            │
│  │           Remix Action / Loader              │            │
│  │  ┌───────────────┐  ┌─────────────────────┐ │            │
│  │  │ intent="parse" │  │ intent="import"     │ │            │
│  │  └───────┬────────┘  └──────────┬──────────┘ │            │
│  └──────────┼──────────────────────┼────────────┘            │
│             ▼                      ▼                         │
│  ┌─────────────────┐  ┌──────────────────────┐               │
│  │ csv-parser       │  │ product-import       │               │
│  │ .server.ts       │  │ .server.ts           │               │
│  │                  │  │  ┌────────────────┐  │               │
│  │ PapaParse Parse  │  │  │ image-upload   │  │               │
│  │ Validation       │  │  │ .server.ts     │  │               │
│  │ Grouping         │  │  └────────┬───────┘  │               │
│  └─────────────────┘  └──────────┼───────────┘               │
│                                  ▼                           │
│                       ┌──────────────────┐                   │
│                       │ Shopify GraphQL   │                   │
│                       │ Admin API         │                   │
│                       │                  │                   │
│                       │ productCreate    │                   │
│                       │ stagedUploads    │                   │
│                       │ productCreate    │                   │
│                       │   Media          │                   │
│                       │ productVariant   │                   │
│                       │   Update         │                   │
│                       └──────────────────┘                   │
│                                                              │
│  ┌─────────────────┐                                        │
│  │ Prisma + SQLite  │  ImportJob / ImportRecord              │
│  │ Session Storage  │  Session                               │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. CSV Drag & Drop Upload
The `CsvDropzone` component wraps Polaris `DropZone`, accepting only `.csv` files. The file is read as text via `FileReader` and submitted to the server-side parse action.

### 2. CSV Parsing with Variant Row Grouping
`csv-parser.server.ts` uses PapaParse to parse header-aware CSV data. Rows with a `title` value are treated as parent product rows; subsequent rows with an empty `title` are automatically grouped as variants of the preceding product. Supports up to 2 option axes.

### 3. Row-Level Validation
Each row is validated against the following rules:
- `title`: Required for parent rows, max 256 characters
- `variant_price`: Required, numeric, >= 0
- `variant_sku`: Max 64 characters
- `variant_inventory_quantity`: Must be an integer
- `product_images` / `variant_image_url`: URL format check

Invalid rows are skipped and validation errors are displayed in a list (up to 10 shown, with a count of remaining errors).

### 4. Preview Table
The `PreviewTable` component renders parsed results in a Polaris `IndexTable`, showing row number, product name, vendor, product type, variant count, image count, and tags for each product. A summary displays total products, variants, and images.

### 5. Bulk Product Creation (GraphQL)
`product-import.server.ts` sequentially executes `productCreate` mutations for each product. Option axes and variant data are formatted into the GraphQL input structure.

### 6. Image Upload Pipeline
`image-upload.server.ts` implements a three-stage pipeline:
1. `stagedUploadsCreate` mutation to obtain upload target URLs
2. Fetch images from external URLs and PUT to Shopify's staged URLs
3. `productCreateMedia` mutation to attach media to the product

Product-level images are sorted by trailing numbers in filenames. Variant-specific images are assigned via `productVariantUpdate`. Image 404 errors are skipped, and product creation continues.

### 7. Three-Tier Status Tracking
Each product import result is recorded with one of three statuses:
- **success**: Product, variants, and all images imported successfully
- **partial**: Product and variants succeeded, but some images failed
- **error**: Product creation itself failed

### 8. Import History
`app.history.tsx` displays the 50 most recent import jobs in an `IndexTable`, showing date/time, file name, product count, variant count, image count, successes, failures, and status.

### 9. Import Detail View
`app.history.$id.tsx` shows job details with a summary card (status, counts) and a per-product result table (row number, product name, product ID, variant count, image count, status, error message).

### 10. Internationalization (EN / JA)
Custom React Context-based i18n implementation. `I18nProvider` loads JSON dictionary files (`en.json` / `ja.json`) and exposes a `t()` translation function via the `useTranslation` hook. Supports parameter interpolation (`{count}` syntax). Defaults to Japanese. Togglable via `LanguageToggle` button in the top-right corner. Includes fallback to the other locale.

## Screen Specifications

### Main Screen (CSV Bulk Import)
**Route:** `/app`

| Element | Description |
|---------|-------------|
| CSV Upload Area | Drag & drop or click to select a `.csv` file |
| Preview Table | Displays parsed results grouped by product |
| Validation Errors | Lists error rows (up to 10 + remaining count) |
| Summary | Shows product, variant, and image counts |
| Reset Button | Clears the upload state and returns to initial view |
| Start Import Button | Begins the product creation process |
| Progress Bar | Displays real-time import progress |
| Result Display | Shows success/failure counts with a link to the detail view |

### Import History Screen
**Route:** `/app/history`

Displays the 50 most recent import jobs in an `IndexTable`. Clicking a row navigates to the detail view. Shows an `EmptyState` when no history exists.

### Import Detail Screen
**Route:** `/app/history/:id`

Composed of a job summary card and a per-product result table. Includes a back button to return to the history list.

## Project Structure

```
bulk-importer/
├── app/
│   ├── components/
│   │   ├── AppContent.tsx              (24 lines)  Navigation + language toggle + Outlet
│   │   ├── CsvDropzone.tsx             (76 lines)  CSV drag & drop upload UI
│   │   ├── ImportProgress.tsx          (64 lines)  Import progress bar and result display
│   │   ├── LanguageToggle.tsx          (25 lines)  EN/JA toggle button
│   │   └── PreviewTable.tsx           (111 lines)  Parsed result preview table
│   ├── i18n/
│   │   ├── i18nContext.tsx             (83 lines)  i18n Provider and useTranslation hook
│   │   ├── en.json                    (101 lines)  English translation dictionary
│   │   └── ja.json                    (101 lines)  Japanese translation dictionary
│   ├── routes/
│   │   ├── app.tsx                     (39 lines)  App layout (AppProvider + I18nProvider)
│   │   ├── app._index.tsx             (271 lines)  Main screen (CSV upload, parse, import)
│   │   ├── app.history.tsx            (146 lines)  Import history list
│   │   ├── app.history.$id.tsx        (235 lines)  Import detail view
│   │   ├── auth.$.tsx                   (8 lines)  Auth catch-all route
│   │   ├── auth.login/route.tsx        (58 lines)  Login page
│   │   ├── webhooks.app.uninstalled.tsx(17 lines)  Uninstall webhook handler
│   │   └── webhooks.app.scopes_update.tsx          Scopes update webhook handler
│   ├── services/
│   │   ├── csv-parser.server.ts       (227 lines)  CSV parsing, validation, and grouping
│   │   ├── product-import.server.ts   (315 lines)  Bulk product creation logic
│   │   └── image-upload.server.ts     (165 lines)  Image upload pipeline
│   ├── db.server.ts                    (15 lines)  Prisma Client singleton
│   ├── shopify.server.ts               (35 lines)  Shopify app config and auth exports
│   ├── root.tsx                        (30 lines)  Root layout
│   ├── entry.server.tsx                (59 lines)  SSR entry point
│   └── routes.ts                        (3 lines)  Routing configuration
├── prisma/
│   ├── schema.prisma                   (64 lines)  Database schema definition
│   └── migrations/                                 Migration files
├── .github/workflows/
│   └── ci.yml                                      CI config (Node 20/22/24 matrix)
├── shopify.app.toml                                Shopify app configuration
├── vite.config.ts                      (73 lines)  Vite build configuration
├── tsconfig.json                                   TypeScript config (strict mode)
└── package.json                                    Dependencies and scripts
```

## Database Design

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│         ImportJob            │      │        ImportRecord          │
├──────────────────────────────┤      ├──────────────────────────────┤
│ id          TEXT PK (cuid)   │      │ id           TEXT PK (cuid)  │
│ shop        TEXT             │◄────┐│ jobId        TEXT FK         │
│ fileName    TEXT             │     ││ rowNumber    INT             │
│ totalRows   INT              │     ││ productTitle TEXT            │
│ totalProducts INT DEFAULT 0  │     ││ productId    TEXT?           │
│ totalVariants INT DEFAULT 0  │     ││ variantCount INT DEFAULT 0   │
│ totalImages  INT DEFAULT 0   │     ││ imageCount   INT DEFAULT 0   │
│ successCount INT DEFAULT 0   │     ││ status       TEXT            │
│ failCount    INT DEFAULT 0   │     ││              (success|       │
│ imageFailCount INT DEFAULT 0 │     ││               partial|error) │
│ status       TEXT            │     ││ errorMsg     TEXT?           │
│              (pending|       │     ││ createdAt    DATETIME        │
│               processing|    │     │└──────────────────────────────┘
│               completed|     │     │
│               failed)        │     │  1:N
│ createdAt    DATETIME        │─────┘
└──────────────────────────────┘

┌──────────────────────────────┐
│          Session             │
├──────────────────────────────┤
│ id          TEXT PK          │
│ shop        TEXT             │
│ state       TEXT             │
│ isOnline    BOOLEAN          │
│ scope       TEXT?            │
│ expires     DATETIME?        │
│ accessToken TEXT             │
│ userId      BIGINT?          │
│ firstName   TEXT?            │
│ lastName    TEXT?            │
│ email       TEXT?            │
│ accountOwner BOOLEAN         │
│ locale      TEXT?            │
│ collaborator BOOLEAN?        │
│ emailVerified BOOLEAN?       │
│ refreshToken TEXT?           │
│ refreshTokenExpires DATETIME?│
└──────────────────────────────┘
```

## CSV Format Specification

| Column | Required | Description | Validation |
|--------|----------|-------------|-----------|
| `title` | Parent row only | Product title. Leave empty for variant rows | Max 256 characters |
| `body_html` | No | Product description (HTML allowed) | - |
| `vendor` | No | Vendor name | - |
| `product_type` | No | Product type | - |
| `tags` | No | Comma-separated tags | - |
| `variant_option1_name` | No | First option axis name (e.g., "Size") | - |
| `variant_option1_value` | No | First option axis value (e.g., "M") | - |
| `variant_option2_name` | No | Second option axis name (e.g., "Color") | - |
| `variant_option2_value` | No | Second option axis value (e.g., "Red") | - |
| `variant_price` | Yes | Variant price | Numeric, >= 0 |
| `variant_sku` | No | SKU | Max 64 characters |
| `variant_inventory_quantity` | No | Inventory quantity | Integer |
| `variant_image_url` | No | Image URL specific to this variant (1 image) | Valid URL format |
| `product_images` | No | Product image URLs (comma-separated for multiple) | Valid URL format |

**CSV Structure Rules:**
- Rows with a `title` value → Parent row (product info + first variant)
- Rows with an empty `title` → Additional variant rows for the preceding product
- `product_images` URLs are sorted by the trailing number in the filename

## Setup

### Prerequisites
- Node.js 20.19 or higher
- Shopify CLI
- A Shopify development store

### Installation

```bash
# Clone the repository
git clone https://github.com/mer-prog/bulk-importer.git
cd bulk-importer

# Install dependencies
npm install

# Set up the database
npx prisma migrate dev

# Start the development server
shopify app dev
```

### Deployment

```bash
shopify app deploy
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SHOPIFY_API_KEY` | Shopify app API key | Yes |
| `SHOPIFY_API_SECRET` | Shopify app API secret | Yes |
| `SHOPIFY_APP_URL` | Application URL | Yes |
| `SCOPES` | API scopes (`write_products,read_products,write_files,read_files`) | Yes |
| `SHOP_CUSTOM_DOMAIN` | Custom shop domain | No |
| `PORT` | Server port (default: 3000) | No |
| `FRONTEND_PORT` | Frontend port (for external hosts) | No |

## API Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/app` | GET | Main screen (authentication check) |
| `/app` | POST (`intent=parse`) | Parse and validate CSV text |
| `/app` | POST (`intent=import`) | Execute bulk product import |
| `/app/history` | GET | Retrieve import history list (latest 50) |
| `/app/history/:id` | GET | Retrieve import job details |
| `/auth/login` | GET/POST | Shopify OAuth authentication |
| `/auth/*` | GET | Authentication callback |
| `/webhooks/app/uninstalled` | POST | Delete sessions on app uninstall |
| `/webhooks/app/scopes_update` | POST | Handle scopes update webhook |

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| SQLite as the database | Default in the Shopify App Template. Enables simple deployment as an Embedded App. Sufficient for persisting import history |
| Server-side CSV parsing (not client-side) | Centralizes validation and grouping logic on the server, reducing client-side load. Enables type-safe processing in the service layer |
| Sequential product creation (not parallel) | Avoids Shopify GraphQL API rate limits. Sequential processing is appropriate since each product's result is individually recorded in the database |
| Custom i18n (no external library) | Only two languages (EN/JA) are supported, making a lightweight React Context-based implementation sufficient. Avoids adding unnecessary dependencies |
| Image upload via `stagedUploadsCreate` | Follows Shopify's recommended upload flow. Safely uploads images to Shopify's storage rather than importing directly from external URLs |
| Three-tier status (success / partial / error) | Accurately records partial image upload failures. Distinguishes cases where the product was created but some images failed |
| Variant grouping based on `title` column presence | Mirrors the approach used by Shopify's official CSV format. Intuitive and easy for users to understand |

## CI/CD Pipeline

Continuous integration via GitHub Actions:

| Job | Trigger | Node.js Versions |
|-----|---------|-----------------|
| CI | push, pull_request | 20.19.0, 22, 24 (matrix build) |

## Running Costs

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Shopify App Hosting | Provided by Shopify | Free |
| SQLite | Embedded | Free |
| PapaParse | Open Source | Free |
| GitHub | Free | Free |

**Total: Free**

## Author

[@mer-prog](https://github.com/mer-prog)
