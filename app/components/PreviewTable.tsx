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

interface PreviewTableProps {
  products: ProductData[];
  errors: ValidationError[];
}

export function PreviewTable({ products, errors }: PreviewTableProps) {
  const resourceName = {
    singular: "商品",
    plural: "商品",
  };

  return (
    <BlockStack gap="400">
      {errors.length > 0 && (
        <Banner tone="warning" title={`${errors.length}件のバリデーションエラー`}>
          <List>
            {errors.slice(0, 10).map((error, i) => (
              <List.Item key={i}>
                行{error.rowNumber}: [{error.field}] {error.message}
              </List.Item>
            ))}
            {errors.length > 10 && (
              <List.Item>...他{errors.length - 10}件のエラー</List.Item>
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
              { title: "行" },
              { title: "商品名" },
              { title: "ベンダー" },
              { title: "商品タイプ" },
              { title: "バリアント数" },
              { title: "画像数" },
              { title: "タグ" },
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
