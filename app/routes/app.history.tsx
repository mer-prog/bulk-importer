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
import { useTranslation } from "../i18n/i18nContext";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const jobs = await prisma.importJob.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({ jobs });
};

function formatDate(dateStr: string, locale: string) {
  const date = new Date(dateStr);
  return date.toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const { jobs } = useLoaderData<typeof loader>();
  const { t, locale } = useTranslation();

  function statusBadge(status: string) {
    switch (status) {
      case "completed":
        return <Badge tone="success">{t("history.statusCompleted")}</Badge>;
      case "processing":
        return <Badge tone="attention">{t("history.statusProcessing")}</Badge>;
      case "failed":
        return <Badge tone="critical">{t("history.statusFailed")}</Badge>;
      case "pending":
        return <Badge>{t("history.statusPending")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  return (
    <Page>
      <TitleBar title={t("history.title")} />
      <Layout>
        <Layout.Section>
          {jobs.length === 0 ? (
            <Card>
              <EmptyState
                heading={t("history.emptyHeading")}
                image=""
              >
                <Text as="p" variant="bodyMd">
                  {t("history.emptyDescription")}
                </Text>
              </EmptyState>
            </Card>
          ) : (
            <Card padding="0">
              <IndexTable
                resourceName={{
                  singular: t("history.resourceSingular"),
                  plural: t("history.resourcePlural"),
                }}
                itemCount={jobs.length}
                headings={[
                  { title: t("history.headingDateTime") },
                  { title: t("history.headingFileName") },
                  { title: t("history.headingProductCount") },
                  { title: t("history.headingVariantCount") },
                  { title: t("history.headingImageCount") },
                  { title: t("history.headingSuccess") },
                  { title: t("history.headingFail") },
                  { title: t("history.headingStatus") },
                ]}
                selectable={false}
              >
                {jobs.map((job, index) => (
                  <IndexTable.Row id={job.id} key={job.id} position={index}>
                    <IndexTable.Cell>
                      <Link to={`/app/history/${job.id}`}>
                        <Text as="span" variant="bodyMd" fontWeight="bold">
                          {formatDate(job.createdAt, locale)}
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
