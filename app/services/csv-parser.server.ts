import Papa from "papaparse";

export interface CsvRow {
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  variant_option1_name: string;
  variant_option1_value: string;
  variant_option2_name: string;
  variant_option2_value: string;
  variant_price: string;
  variant_sku: string;
  variant_inventory_quantity: string;
  variant_image_url: string;
  product_images: string;
}

export interface VariantData {
  option1Name: string;
  option1Value: string;
  option2Name: string;
  option2Value: string;
  price: number;
  sku: string;
  inventoryQuantity: number | null;
  imageUrl: string;
  rowNumber: number;
}

export interface ProductData {
  title: string;
  bodyHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  variants: VariantData[];
  productImages: string[];
  rowNumber: number;
}

export interface ValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ParseResult {
  products: ProductData[];
  errors: ValidationError[];
  totalRows: number;
}

const URL_PATTERN = /^https?:\/\/.+/i;

function isValidUrl(url: string): boolean {
  return URL_PATTERN.test(url.trim());
}

function extractSortNumber(url: string): number {
  const match = url.match(/(\d+)\.[^.]+$/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseProductImages(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u.length > 0)
    .sort((a, b) => extractSortNumber(a) - extractSortNumber(b));
}

function validateRow(
  row: CsvRow,
  rowNumber: number,
  isParentRow: boolean,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (isParentRow) {
    if (!row.title || !row.title.trim()) {
      errors.push({ rowNumber, field: "title", message: "titleは必須です" });
    } else if (row.title.length > 256) {
      errors.push({
        rowNumber,
        field: "title",
        message: "titleは256文字以内にしてください",
      });
    }
  }

  if (!row.variant_price || !row.variant_price.trim()) {
    errors.push({
      rowNumber,
      field: "variant_price",
      message: "variant_priceは必須です",
    });
  } else {
    const price = parseFloat(row.variant_price);
    if (isNaN(price) || price < 0) {
      errors.push({
        rowNumber,
        field: "variant_price",
        message: "variant_priceは0以上の数値にしてください",
      });
    }
  }

  if (row.variant_sku && row.variant_sku.length > 64) {
    errors.push({
      rowNumber,
      field: "variant_sku",
      message: "variant_skuは64文字以内にしてください",
    });
  }

  if (row.variant_inventory_quantity && row.variant_inventory_quantity.trim()) {
    const qty = parseInt(row.variant_inventory_quantity, 10);
    if (isNaN(qty)) {
      errors.push({
        rowNumber,
        field: "variant_inventory_quantity",
        message: "variant_inventory_quantityは整数にしてください",
      });
    }
  }

  if (row.variant_image_url && row.variant_image_url.trim()) {
    if (!isValidUrl(row.variant_image_url)) {
      errors.push({
        rowNumber,
        field: "variant_image_url",
        message: "variant_image_urlのURL形式が不正です",
      });
    }
  }

  if (row.product_images && row.product_images.trim()) {
    const urls = row.product_images.split(",").map((u) => u.trim());
    for (const url of urls) {
      if (url && !isValidUrl(url)) {
        errors.push({
          rowNumber,
          field: "product_images",
          message: `product_imagesに不正なURLがあります: ${url}`,
        });
      }
    }
  }

  return errors;
}

export function parseCsv(csvText: string): ParseResult {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const products: ProductData[] = [];
  const errors: ValidationError[] = [];
  let currentProduct: ProductData | null = null;

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNumber = i + 2; // 1-indexed, +1 for header row
    const isParentRow = !!(row.title && row.title.trim());

    const rowErrors = validateRow(row, rowNumber, isParentRow);
    errors.push(...rowErrors);

    if (rowErrors.length > 0) continue;

    const variant: VariantData = {
      option1Name: row.variant_option1_name?.trim() || "",
      option1Value: row.variant_option1_value?.trim() || "",
      option2Name: row.variant_option2_name?.trim() || "",
      option2Value: row.variant_option2_value?.trim() || "",
      price: parseFloat(row.variant_price),
      sku: row.variant_sku?.trim() || "",
      inventoryQuantity: row.variant_inventory_quantity?.trim()
        ? parseInt(row.variant_inventory_quantity, 10)
        : null,
      imageUrl: row.variant_image_url?.trim() || "",
      rowNumber,
    };

    if (isParentRow) {
      currentProduct = {
        title: row.title.trim(),
        bodyHtml: row.body_html?.trim() || "",
        vendor: row.vendor?.trim() || "",
        productType: row.product_type?.trim() || "",
        tags: row.tags
          ? row.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        variants: [variant],
        productImages: parseProductImages(row.product_images || ""),
        rowNumber,
      };
      products.push(currentProduct);
    } else {
      if (currentProduct) {
        currentProduct.variants.push(variant);
      } else {
        errors.push({
          rowNumber,
          field: "title",
          message:
            "バリアント行の前に親行（titleあり）が必要です",
        });
      }
    }
  }

  return {
    products,
    errors,
    totalRows: parsed.data.length,
  };
}
