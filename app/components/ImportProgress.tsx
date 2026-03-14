import { ProgressBar, BlockStack, Text, Banner, Box } from "@shopify/polaris";
import { useTranslation } from "../i18n/i18nContext";

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
  const { t } = useTranslation();

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
              {t("progress.importing", { current: currentProduct, total: totalProducts })}
            </Text>
            <ProgressBar progress={progress} size="small" />
          </BlockStack>
        </Box>
      )}

      {phase === "complete" && (
        <Banner
          tone={failCount > 0 ? "warning" : "success"}
          title={t("progress.completeTitle")}
        >
          <BlockStack gap="100">
            <Text as="p" variant="bodyMd">
              {t("progress.successCount", { count: successCount })}{t("progress.resultSeparator")}{t("progress.failCount", { count: failCount })}
            </Text>
          </BlockStack>
        </Banner>
      )}

      {phase === "error" && (
        <Banner tone="critical" title={t("progress.errorTitle")}>
          <Text as="p" variant="bodyMd">
            {t("progress.errorMessage")}
          </Text>
        </Banner>
      )}
    </BlockStack>
  );
}
