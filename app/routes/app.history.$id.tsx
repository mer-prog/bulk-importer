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

function statusBadge(status: string) {
  switch (status) {
    case "success":
      return <Badge tone="success">成功</Badge>;
    case "partial":
      return <Badge tone="warning">部分成功</Badge>;
    case "error":
      return <Badge tone="critical">エラー</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function jobStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge tone="success">完了</Badge>;
    case "processing":
      return <Badge tone="attention">処理中</Badge>;
    case "failed":
      return <Badge tone="critical">失敗</Badge>;
    case "pending":
      return <Badge>待機中</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("ja-JP", {
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

  return (
    <Page
      backAction={{ url: "/app/history" }}
      title={job.fileName}
      subtitle={formatDate(job.createdAt)}
    >
      <TitleBar title="インポート詳細" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  ジョブ概要
                </Text>
                <InlineStack gap="800">
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      ステータス
                    </Text>
                    {jobStatusBadge(job.status)}
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      商品数
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold">
                      {job.totalProducts}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      バリアント数
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold">
                      {job.totalVariants}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      画像数
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold">
                      {job.totalImages}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      成功
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold" tone="success">
                      {job.successCount}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      失敗
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
                  商品別結果
                </Text>
              </Box>
              <Box paddingBlockStart="400">
                <IndexTable
                  resourceName={{ singular: "レコード", plural: "レコード" }}
                  itemCount={job.records.length}
                  headings={[
                    { title: "行" },
                    { title: "商品名" },
                    { title: "商品ID" },
                    { title: "バリアント数" },
                    { title: "画像数" },
                    { title: "ステータス" },
                    { title: "エラー" },
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
