import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Box,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useTranslation } from "../i18n/i18nContext";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  const job = await prisma.importJob.findFirst({
    where: { id, shop: session.shop },
    include: {
      records: {
        orderBy: { rowNumber: "asc" },
      },
    },
  });

  if (!job) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ job });
};

function formatDate(dateStr: string, locale: string) {
  const date = new Date(dateStr);
  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function HistoryDetailPage() {
  const { job } = useLoaderData<typeof loader>();
  const { t, locale } = useTranslation();

  function statusBadge(status: string) {
    switch (status) {
      case "success":
        return <Badge tone="success">{t("historyDetail.statusSuccess")}</Badge>;
      case "partial":
        return <Badge tone="warning">{t("historyDetail.statusPartial")}</Badge>;
      case "error":
        return <Badge tone="critical">{t("historyDetail.statusError")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  function jobStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return <Badge tone="success">{t("historyDetail.statusCompleted")}</Badge>;
      case "processing":
        return <Badge tone="attention">{t("historyDetail.statusProcessing")}</Badge>;
      case "failed":
        return <Badge tone="critical">{t("historyDetail.statusFailed")}</Badge>;
      case "pending":
        return <Badge>{t("historyDetail.statusPending")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  return (
    <Page
      backAction={{ url: "/app/history" }}
      title={job.fileName}
      subtitle={formatDate(job.createdAt, locale)}
    >
      <TitleBar title={t("historyDetail.title")} />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  {t("historyDetail.jobSummary")}
                </Text>
                <InlineStack gap="800">
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {t("historyDetail.labelStatus")}
                    </Text>
                    {jobStatusBadge(job.status)}
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {t("historyDetail.labelProductCount")}
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold">
                      {job.totalProducts}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {t("historyDetail.labelVariantCount")}
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold">
                      {job.totalVariants}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {t("historyDetail.labelImageCount")}
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold">
                      {job.totalImages}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {t("historyDetail.labelSuccess")}
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold" tone="success">
                      {job.successCount}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {t("historyDetail.labelFail")}
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold" tone="critical">
                      {job.failCount}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card padding="0">
              <Box padding="400" paddingBlockEnd="0">
                <Text as="h2" variant="headingMd">
                  {t("historyDetail.productResults")}
                </Text>
              </Box>
              <Box paddingBlockStart="400">
                <IndexTable
                  resourceName={{
                    singular: t("historyDetail.resourceSingular"),
                    plural: t("historyDetail.resourcePlural"),
                  }}
                  itemCount={job.records.length}
                  headings={[
                    { title: t("historyDetail.headingRow") },
                    { title: t("historyDetail.headingProductName") },
                    { title: t("historyDetail.headingProductId") },
                    { title: t("historyDetail.headingVariantCount") },
                    { title: t("historyDetail.headingImageCount") },
                    { title: t("historyDetail.headingStatus") },
                    { title: t("historyDetail.headingError") },
                  ]}
                  selectable={false}
                >
                  {job.records.map((record, index) => (
                    <IndexTable.Row
                      id={record.id}
                      key={record.id}
                      position={index}
                    >
                      <IndexTable.Cell>
                        <Text as="span" variant="bodyMd">
                          {record.rowNumber}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" variant="bodyMd" fontWeight="bold">
                          {record.productTitle || "-"}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" variant="bodySm">
                          {record.productId
                            ? record.productId.replace(
                                "gid://shopify/Product/",
                                "",
                              )
                            : "-"}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" variant="bodyMd">
                          {record.variantCount}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" variant="bodyMd">
                          {record.imageCount}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        {statusBadge(record.status)}
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text
                          as="span"
                          variant="bodySm"
                          tone={record.errorMsg ? "critical" : "subdued"}
                        >
                          {record.errorMsg || "-"}
                        </Text>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
