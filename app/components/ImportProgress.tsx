import { ProgressBar, BlockStack, Text, Banner, Box } from "@shopify/polaris";

interface ImportProgressProps {
  phase: "idle" | "importing" | "complete" | "error";
  currentProduct: number;
  totalProducts: number;
  jobId?: string;
  successCount?: number;
  failCount?: number;
}

export function ImportProgress({
  phase,
  currentProduct,
  totalProducts,
  successCount = 0,
  failCount = 0,
}: ImportProgressProps) {
  if (phase === "idle") return null;

  const progress =
    totalProducts > 0
      ? Math.round((currentProduct / totalProducts) * 100)
      : 0;

  return (
    <BlockStack gap="400">
      {phase === "importing" && (
        <Box>
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              商品を登録中... ({currentProduct}/{totalProducts})
            </Text>
            <ProgressBar progress={progress} size="small" />
          </BlockStack>
        </Box>
      )}

      {phase === "complete" && (
        <Banner
          tone={failCount > 0 ? "warning" : "success"}
          title="インポート完了"
        >
          <BlockStack gap="100">
            <Text as="p" variant="bodyMd">
              成功: {successCount}件 / 失敗: {failCount}件
            </Text>
          </BlockStack>
        </Banner>
      )}

      {phase === "error" && (
        <Banner tone="critical" title="インポートエラー">
          <Text as="p" variant="bodyMd">
            インポート処理中にエラーが発生しました
          </Text>
        </Banner>
      )}
    </BlockStack>
  );
}
