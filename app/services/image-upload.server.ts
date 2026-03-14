import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

interface StagedTarget {
  url: string;
  resourceUrl: string;
  parameters: { name: string; value: string }[];
}

interface UploadedImage {
  resourceUrl: string;
  originalUrl: string;
}

export async function createStagedUploads(
  admin: AdminApiContext,
  imageUrls: string[],
): Promise<StagedTarget[]> {
  if (imageUrls.length === 0) return [];

  const input = imageUrls.map((url) => {
    const filename = url.split("/").pop() || "image.jpg";
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "image/jpeg";

    return {
      filename,
      mimeType,
      resource: "IMAGE" as const,
      httpMethod: "PUT" as const,
    };
  });

  const response = await admin.graphql(
    `#graphql
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { input } },
  );

  const json = await response.json();
  const data = json.data?.stagedUploadsCreate;

  if (data?.userErrors?.length) {
    throw new Error(
      `stagedUploadsCreate errors: ${data.userErrors.map((e: { message: string }) => e.message).join(", ")}`,
    );
  }

  return data?.stagedTargets || [];
}

export async function uploadImageToStaged(
  sourceUrl: string,
  stagedTarget: StagedTarget,
): Promise<string> {
  const imageResponse = await fetch(sourceUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${sourceUrl} (${imageResponse.status})`);
  }
  const imageBuffer = await imageResponse.arrayBuffer();

  const uploadResponse = await fetch(stagedTarget.url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload to staged target: ${uploadResponse.status}`,
    );
  }

  return stagedTarget.resourceUrl;
}

export async function uploadImages(
  admin: AdminApiContext,
  imageUrls: string[],
): Promise<{ uploaded: UploadedImage[]; failed: string[] }> {
  if (imageUrls.length === 0) return { uploaded: [], failed: [] };

  const stagedTargets = await createStagedUploads(admin, imageUrls);
  const uploaded: UploadedImage[] = [];
  const failed: string[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const resourceUrl = await uploadImageToStaged(
        imageUrls[i],
        stagedTargets[i],
      );
      uploaded.push({ resourceUrl, originalUrl: imageUrls[i] });
    } catch {
      failed.push(imageUrls[i]);
    }
  }

  return { uploaded, failed };
}

export async function createProductMedia(
  admin: AdminApiContext,
  productId: string,
  resourceUrls: string[],
): Promise<void> {
  if (resourceUrls.length === 0) return;

  const media = resourceUrls.map((url) => ({
    originalSource: url,
    mediaContentType: "IMAGE" as const,
  }));

  const response = await admin.graphql(
    `#graphql
    mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media {
          ... on MediaImage {
            id
            image {
              url
            }
          }
        }
        mediaUserErrors {
          field
          message
        }
      }
    }`,
    { variables: { productId, media } },
  );

  const json = await response.json();
  const errors = json.data?.productCreateMedia?.mediaUserErrors;
  if (errors?.length) {
    throw new Error(
      `productCreateMedia errors: ${errors.map((e: { message: string }) => e.message).join(", ")}`,
    );
  }
}
