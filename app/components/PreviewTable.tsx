import {
  IndexTable,
  Text,
  Badge,
  Banner,
  BlockStack,
  List,
  Card,
} from "@shopify/polaris";
import type { ProductData, ValidationError } from "../services/csv-parser.server";
import { useTranslation } from "../i18n/i18nContext";

interface PreviewTableProps {
  products: ProductData[];
  errors: ValidationError[];
}

export function PreviewTable({ products, errors }: PreviewTableProps) {
  const { t } = useTranslation();

  const resourceName = {
    singular: t("preview.resourceSingular"),
    plural: t("preview.resourcePlural"),
  };

  return (
    <BlockStack gap="400">
      {errors.length > 0 && (
        <Banner tone="warning" title={t("preview.validationErrorTitle", { count: errors.length })}>
          <List>
            {errors.slice(0, 10).map((error, i) => (
              <List.Item key={i}>
                {t("preview.rowError", { row: error.rowNumber, field: error.field, message: error.message })}
              </List.Item>
            ))}
            {errors.length > 10 && (
              <List.Item>{t("preview.moreErrors", { count: errors.length - 10 })}</List.Item>
            )}
          </List>
        </Banner>
      )}

      {products.length > 0 && (
        <Card padding="0">
          <IndexTable
            resourceName={resourceName}
            itemCount={products.length}
            headings={[
              { title: t("preview.headingRow") },
              { title: t("preview.headingProductName") },
              { title: t("preview.headingVendor") },
              { title: t("preview.headingProductType") },
              { title: t("preview.headingVariantCount") },
              { title: t("preview.headingImageCount") },
              { title: t("preview.headingTags") },
            ]}
            selectable={false}
          >
            {products.map((product, index) => {
              const imageCount =
                product.productImages.length +
                product.variants.filter((v) => v.imageUrl).length;

              return (
                <IndexTable.Row
                  id={`product-${index}`}
                  key={index}
                  position={index}
                >
                  <IndexTable.Cell>
                    <Text as="span" variant="bodyMd">
                      {product.rowNumber}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" variant="bodyMd" fontWeight="bold">
                      {product.title}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" variant="bodyMd">
                      {product.vendor || "-"}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" variant="bodyMd">
                      {product.productType || "-"}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Badge>{String(product.variants.length)}</Badge>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Badge tone={imageCount > 0 ? "info" : undefined}>
                      {String(imageCount)}
                    </Badge>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" variant="bodyMd">
                      {product.tags.join(", ") || "-"}
                    </Text>
                  </IndexTable.Cell>
                </IndexTable.Row>
              );
            })}
          </IndexTable>
        </Card>
      )}
    </BlockStack>
  );
}
