import { useCallback, useState } from "react";
import { DropZone, Banner, BlockStack, Text, List } from "@shopify/polaris";

interface CsvDropzoneProps {
  onFileParsed: (content: string, fileName: string) => void;
  disabled?: boolean;
}

export function CsvDropzone({ onFileParsed, disabled }: CsvDropzoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrop = useCallback(
    (_droppedFiles: File[], acceptedFiles: File[], rejectedFiles: File[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        setError("CSVファイルのみアップロード可能です");
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (!file.name.endsWith(".csv")) {
        setError("CSVファイルのみアップロード可能です");
        return;
      }

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === "string") {
          onFileParsed(content, file.name);
        }
      };
      reader.onerror = () => {
        setError("ファイルの読み込みに失敗しました");
      };
      reader.readAsText(file);
    },
    [onFileParsed],
  );

  return (
    <BlockStack gap="400">
      <DropZone
        onDrop={handleDrop}
        accept=".csv"
        type="file"
        allowMultiple={false}
        disabled={disabled}
      >
        <DropZone.FileUpload
          actionHint="CSVファイルをここにドラッグ＆ドロップ、またはクリックして選択"
        />
      </DropZone>
      {fileName && !error && (
        <Text as="p" variant="bodySm" tone="subdued">
          選択済み: {fileName}
        </Text>
      )}
      {error && (
        <Banner tone="critical">
          <List>
            <List.Item>{error}</List.Item>
          </List>
        </Banner>
      )}
    </BlockStack>
  );
}
