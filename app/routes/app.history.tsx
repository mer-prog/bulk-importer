import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  BlockStack,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const jobs = await prisma.importJob.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({ jobs });
};

function statusBadge(status: string) {
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
  });
}

export default function HistoryPage() {
  const { jobs } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="インポート履歴" />
      <Layout>
        <Layout.Section>
          {jobs.length === 0 ? (
            <Card>
              <EmptyState
                heading="インポート履歴がありません"
                image=""
              >
                <Text as="p" variant="bodyMd">
                  CSVファイルをアップロードして商品をインポートすると、ここに履歴が表示されます。
                </Text>
              </EmptyState>
            </Card>
          ) : (
            <Card padding="0">
              <IndexTable
                resourceName={{ singular: "ジョブ", plural: "ジョブ" }}
                itemCount={jobs.length}
                headings={[
                  { title: "日時" },
                  { title: "ファイル名" },
                  { title: "商品数" },
                  { title: "バリアント数" },
                  { title: "画像数" },
                  { title: "成功" },
                  { title: "失敗" },
                  { title: "ステータス" },
                ]}
                selectable={false}
              >
                {jobs.map((job, index) => (
                  <IndexTable.Row id={job.id} key={job.id} position={index}>
                    <IndexTable.Cell>
                      <Link to={`/app/history/${job.id}`}>
                        <Text as="span" variant="bodyMd" fontWeight="bold">
                          {formatDate(job.createdAt)}
                        </Text>
                      </Link>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd">
                        {job.fileName}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd">
                        {job.totalProducts}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd">
                        {job.totalVariants}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd">
                        {job.totalImages}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd">
                        {job.successCount}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" variant="bodyMd">
                        {job.failCount}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{statusBadge(job.status)}</IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </Card>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
