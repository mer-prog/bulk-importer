import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { parseCsv } from "../services/csv-parser.server";
import { importProducts } from "../services/product-import.server";
import type { ProductData, ValidationError } from "../services/csv-parser.server";
import { CsvDropzone } from "../components/CsvDropzone";
import { PreviewTable } from "../components/PreviewTable";
import { ImportProgress } from "../components/ImportProgress";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "parse") {
    const csvText = formData.get("csvText") as string;
    const fileName = formData.get("fileName") as string;

    if (!csvText) {
      return json({ error: "CSVデータがありません", intent: "parse" }, { status: 400 });
    }

    const result = parseCsv(csvText);
    return json({
      intent: "parse",
      products: result.products,
      errors: result.errors,
      totalRows: result.totalRows,
      fileName,
    });
  }

  if (intent === "import") {
    const productsJson = formData.get("products") as string;
    const fileName = formData.get("fileName") as string;

    if (!productsJson) {
      return json({ error: "商品データがありません", intent: "import" }, { status: 400 });
    }

    try {
      const products: ProductData[] = JSON.parse(productsJson);
      const jobId = await importProducts(
        admin,
        session.shop,
        fileName || "unknown.csv",
        products,
      );

      return json({ intent: "import", jobId, success: true });
    } catch (error) {
      return json({
        intent: "import",
        error: error instanceof Error ? error.message : "インポートに失敗しました",
      }, { status: 500 });
    }
  }

  return json({ error: "不正なリクエスト" }, { status: 400 });
};

export default function Index() {
  const fetcher = useFetcher<typeof action>();
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isParsed, setIsParsed] = useState(false);

  const isLoading = fetcher.state !== "idle";
  const fetcherData = fetcher.data;

  // Handle parse response
  if (
    fetcherData &&
    "intent" in fetcherData &&
    fetcherData.intent === "parse" &&
    "products" in fetcherData &&
    !isParsed
  ) {
    setProducts(fetcherData.products as ProductData[]);
    setErrors(fetcherData.errors as ValidationError[]);
    setIsParsed(true);
  }

  const importResult =
    fetcherData &&
    "intent" in fetcherData &&
    fetcherData.intent === "import"
      ? fetcherData
      : null;

  const handleFileParsed = useCallback(
    (content: string, name: string) => {
      setCsvText(content);
      setFileName(name);
      setIsParsed(false);
      setProducts([]);
      setErrors([]);

      const formData = new FormData();
      formData.set("intent", "parse");
      formData.set("csvText", content);
      formData.set("fileName", name);
      fetcher.submit(formData, { method: "POST" });
    },
    [fetcher],
  );

  const handleImport = useCallback(() => {
    if (products.length === 0) return;

    const formData = new FormData();
    formData.set("intent", "import");
    formData.set("products", JSON.stringify(products));
    formData.set("fileName", fileName);
    fetcher.submit(formData, { method: "POST" });
  }, [fetcher, products, fileName]);

  const handleReset = useCallback(() => {
    setCsvText(null);
    setFileName("");
    setProducts([]);
    setErrors([]);
    setIsParsed(false);
  }, []);

  const phase = importResult
    ? "success" in importResult
      ? "complete"
      : "error" in importResult
        ? "error"
        : "idle"
    : isLoading && fetcherData === undefined
      ? "idle"
      : isLoading &&
          fetcher.formData?.get("intent") === "import"
        ? "importing"
        : "idle";

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

  return (
    <Page>
      <TitleBar title="CSV商品一括登録" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  CSVファイルをアップロード
                </Text>
                <CsvDropzone
                  onFileParsed={handleFileParsed}
                  disabled={isLoading}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {isParsed && products.length > 0 && (
            <>
              <Layout.Section>
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text as="h2" variant="headingMd">
                        プレビュー
                      </Text>
                      <InlineStack gap="200">
                        <Text as="span" variant="bodySm" tone="subdued">
                          商品: {products.length}件 / バリアント: {totalVariants}件 / 画像: {totalImages}枚
                        </Text>
                      </InlineStack>
                    </InlineStack>
                    <PreviewTable products={products} errors={errors} />
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section>
                <InlineStack gap="300" align="end">
                  <Button onClick={handleReset} disabled={isLoading}>
                    リセット
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleImport}
                    loading={isLoading && fetcher.formData?.get("intent") === "import"}
                    disabled={products.length === 0 || isLoading}
                  >
                    {`インポート開始 (${products.length}商品)`}
                  </Button>
                </InlineStack>
              </Layout.Section>
            </>
          )}

          {isParsed && products.length === 0 && errors.length > 0 && (
            <Layout.Section>
              <Card>
                <PreviewTable products={[]} errors={errors} />
              </Card>
            </Layout.Section>
          )}

          <Layout.Section>
            <ImportProgress
              phase={phase}
              currentProduct={
                importResult && "success" in importResult
                  ? products.length
                  : 0
              }
              totalProducts={products.length}
              successCount={products.length}
              failCount={0}
            />
            {importResult && "jobId" in importResult && (
              <Box paddingBlockStart="300">
                <Button url={`/app/history/${importResult.jobId}`}>
                  インポート結果を確認
                </Button>
              </Box>
            )}
            {importResult && "error" in importResult && (
              <Box paddingBlockStart="300">
                <Text as="p" tone="critical" variant="bodyMd">
                  {String(importResult.error)}
                </Text>
              </Box>
            )}
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
