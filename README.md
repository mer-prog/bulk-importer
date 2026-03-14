# BulkImporter

**CSV-powered bulk product import for Shopify — variants, images, and all.**

![BulkImporter Screenshot](docs/screenshots/bulk-importer-preview.png)

## Features

- **Drag & Drop CSV Upload** — Simple file upload with instant parsing and validation
- **Multi-Row Variants** — Group variant rows under a parent product automatically (up to 2 option axes)
- **Image Support** — Upload product images from URLs with automatic filename-based ordering
- **Per-Variant Images** — Assign specific images to individual variants
- **Live Preview** — Review parsed products, variants, and images in a table before importing
- **Row-Level Validation** — Highlights errors per row; invalid rows are skipped without blocking the rest
- **Two-Phase Progress** — Visual progress bar for product creation and image upload stages
- **Import History** — Browse past imports with per-product status (success / partial / error) and error details

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Remix (Shopify App Template) |
| Language | TypeScript |
| Database | Prisma + SQLite |
| UI | Polaris React |
| API | Shopify GraphQL Admin API |
| CSV Parsing | PapaParse |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- A Shopify development store

### Setup

```bash
# Install dependencies
npm install

# Set up the database
npx prisma migrate dev

# Start development server
shopify app dev
```

### Deployment

```bash
shopify app deploy
```

### CSV Format

| Column | Description |
|--------|------------|
| `title` | Product title (required for parent row, empty for variant rows) |
| `body_html` | Product description |
| `vendor` | Product vendor |
| `product_type` | Product type |
| `tags` | Comma-separated tags |
| `variant_option1_name` | First option name (e.g., "Size") |
| `variant_option1_value` | First option value (e.g., "M") |
| `variant_option2_name` | Second option name (e.g., "Color") |
| `variant_option2_value` | Second option value (e.g., "Red") |
| `variant_price` | Variant price (required) |
| `variant_sku` | Variant SKU |
| `variant_inventory_quantity` | Initial inventory |
| `variant_image_url` | Image URL specific to this variant |
| `product_images` | Comma-separated image URLs for the product |

## Architecture

```
bulk-importer/
├── app/
│   ├── routes/          # CSV upload, import history, job details
│   ├── services/        # CSV parser & validator, product importer, image uploader
│   └── components/      # Dropzone, preview table, progress bar
├── prisma/              # Database schema (ImportJob, ImportRecord)
└── shopify.app.toml     # Shopify app configuration
```

CSV files are parsed with PapaParse and variant rows are grouped by the presence/absence of a title. After validation and user confirmation, products are created sequentially via `productCreate`, followed by image uploads through `stagedUploadsCreate` and `productCreateMedia`. Results are persisted with three-tier status tracking: success, partial (images failed), and error.

## License

MIT
