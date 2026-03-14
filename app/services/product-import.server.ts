import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import type { ProductData } from "./csv-parser.server";
import { uploadImages, createProductMedia } from "./image-upload.server";
import prisma from "../db.server";

interface ImportProductResult {
  productId: string | null;
  variantCount: number;
  imageCount: number;
  status: "success" | "partial" | "error";
  errorMsg: string | null;
}

interface ImportProgress {
  phase: "products" | "images";
  current: number;
  total: number;
}

export type ProgressCallback = (progress: ImportProgress) => void;

async function createProduct(
  admin: AdminApiContext,
  product: ProductData,
): Promise<{ productId: string; variantIds: string[] }> {
  const options: string[] = [];
  const firstVariant = product.variants[0];
  if (firstVariant.option1Name) options.push(firstVariant.option1Name);
  if (firstVariant.option2Name) options.push(firstVariant.option2Name);

  const variants = product.variants.map((v) => {
    const optionValues: string[] = [];
    if (v.option1Value) optionValues.push(v.option1Value);
    if (v.option2Value) optionValues.push(v.option2Value);

    return {
      price: v.price.toFixed(2),
      sku: v.sku || undefined,
      optionValues: optionValues.map((value, idx) => ({
        name: options[idx],
        value,
      })),
      inventoryQuantities: v.inventoryQuantity !== null
        ? [{ availableQuantity: v.inventoryQuantity, locationId: "" }]
        : undefined,
    };
  });

  // Remove inventoryQuantities if locationId is empty (will set later if needed)
  const cleanVariants = variants.map(({ inventoryQuantities: _inv, ...rest }) => rest);

  const productInput: Record<string, unknown> = {
    title: product.title,
    descriptionHtml: product.bodyHtml || undefined,
    vendor: product.vendor || undefined,
    productType: product.productType || undefined,
    tags: product.tags.length > 0 ? product.tags : undefined,
  };

  // Only add productOptions if there are actual options
  if (options.length > 0) {
    productInput.productOptions = options.map((name) => ({
      name,
      values: [...new Set(
        product.variants
          .map((v) => {
            const idx = options.indexOf(name);
            return idx === 0 ? v.option1Value : v.option2Value;
          })
          .filter(Boolean),
      )].map((value) => ({ name: value })),
    }));
  }

  const response = await admin.graphql(
    `#graphql
    mutation productCreate($product: ProductCreateInput!, $variants: [ProductVariantsBulkInput!]!) {
      productCreate(product: $product, variants: $variants) {
        product {
          id
          variants(first: 100) {
            edges {
              node {
                id
                title
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        product: productInput,
        variants: cleanVariants,
      },
    },
  );

  const json = await response.json();
  const data = json.data?.productCreate;

  if (data?.userErrors?.length) {
    throw new Error(
      data.userErrors.map((e: { message: string }) => e.message).join(", "),
    );
  }

  const createdProduct = data?.product;
  if (!createdProduct) {
    throw new Error("productCreate returned no product");
  }

  const variantIds = createdProduct.variants.edges.map(
    (edge: { node: { id: string } }) => edge.node.id,
  );

  return { productId: createdProduct.id, variantIds };
}

async function assignVariantImage(
  admin: AdminApiContext,
  variantId: string,
  imageResourceUrl: string,
): Promise<void> {
  // First, get the media image ID by creating it if needed
  const response = await admin.graphql(
    `#graphql
    mutation productVariantUpdate($input: ProductVariantInput!) {
      productVariantUpdate(input: $input) {
        productVariant {
          id
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        input: {
          id: variantId,
          imageUrl: imageResourceUrl,
        },
      },
    },
  );

  const json = await response.json();
  const errors = json.data?.productVariantUpdate?.userErrors;
  if (errors?.length) {
    throw new Error(
      `variant image assign error: ${errors.map((e: { message: string }) => e.message).join(", ")}`,
    );
  }
}

async function importSingleProduct(
  admin: AdminApiContext,
  product: ProductData,
): Promise<ImportProductResult> {
  try {
    const { productId, variantIds } = await createProduct(admin, product);

    let imageCount = 0;
    let imageFailed = 0;

    // Upload product images
    if (product.productImages.length > 0) {
      const { uploaded, failed } = await uploadImages(
        admin,
        product.productImages,
      );
      if (uploaded.length > 0) {
        await createProductMedia(
          admin,
          productId,
          uploaded.map((u) => u.resourceUrl),
        );
        imageCount += uploaded.length;
      }
      imageFailed += failed.length;
    }

    // Upload variant-specific images
    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];
      if (variant.imageUrl && variantIds[i]) {
        try {
          const { uploaded, failed } = await uploadImages(admin, [
            variant.imageUrl,
          ]);
          if (uploaded.length > 0) {
            await assignVariantImage(
              admin,
              variantIds[i],
              uploaded[0].resourceUrl,
            );
            imageCount++;
          }
          imageFailed += failed.length;
        } catch {
          imageFailed++;
        }
      }
    }

    return {
      productId,
      variantCount: variantIds.length,
      imageCount,
      status: imageFailed > 0 ? "partial" : "success",
      errorMsg:
        imageFailed > 0 ? `${imageFailed}枚の画像アップロードに失敗` : null,
    };
  } catch (error) {
    return {
      productId: null,
      variantCount: 0,
      imageCount: 0,
      status: "error",
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function importProducts(
  admin: AdminApiContext,
  shop: string,
  fileName: string,
  products: ProductData[],
): Promise<string> {
  const totalVariants = products.reduce(
    (sum, p) => sum + p.variants.length,
    0,
  );
  const totalImages = products.reduce(
    (sum, p) =>
      sum +
      p.productImages.length +
      p.variants.filter((v) => v.imageUrl).length,
    0,
  );
  const totalRows = products.reduce((sum, p) => sum + p.variants.length, 0);

  const job = await prisma.importJob.create({
    data: {
      shop,
      fileName,
      totalRows,
      totalProducts: products.length,
      totalVariants,
      totalImages,
      status: "processing",
    },
  });

  let successCount = 0;
  let failCount = 0;
  let imageFailCount = 0;

  for (const product of products) {
    const result = await importSingleProduct(admin, product);

    await prisma.importRecord.create({
      data: {
        jobId: job.id,
        rowNumber: product.rowNumber,
        productTitle: product.title,
        productId: result.productId,
        variantCount: result.variantCount,
        imageCount: result.imageCount,
        status: result.status,
        errorMsg: result.errorMsg,
      },
    });

    if (result.status === "error") {
      failCount++;
    } else {
      successCount++;
      if (result.status === "partial") {
        imageFailCount++;
      }
    }
  }

  const finalStatus =
    failCount === products.length
      ? "failed"
      : failCount > 0 || imageFailCount > 0
        ? "completed"
        : "completed";

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: finalStatus,
      successCount,
      failCount,
      imageFailCount,
    },
  });

  return job.id;
}
