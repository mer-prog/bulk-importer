# BulkImporter — CSV商品一括登録アプリ

## プロジェクト概要

Upworkポートフォリオ用のShopify Embedded App。
CSVファイルをアップロードするだけで商品を一括登録。手動登録の手間を95%削減。
画像アップロード・バリアント複数行・バリアント別画像指定に対応。

**ターゲット:** 中小マーチャント / 越境ECで大量商品を扱うストア
**Dev Store:** ryo-dev-plus（Shopify Plus Dev Store）

## 技術スタック

- Remix（Shopify App Template）
- TypeScript
- Prisma + SQLite
- Polaris React
- GraphQL Admin API
- Shopify App Bridge
- papaparse（CSVパース）

## 必要なAPIスコープ

write_products, read_products, write_files, read_files

## ディレクトリ構成

bulk-importer/
├── CLAUDE.md
├── app/
│   ├── routes/
│   │   ├── app._index.tsx        # メイン画面（CSVアップロード）
│   │   ├── app.history.tsx       # インポート履歴一覧
│   │   └── app.history.$id.tsx   # インポート詳細
│   ├── services/
│   │   ├── csv-parser.server.ts    # CSVパース＆バリデーション＆バリアント行グルーピング
│   │   ├── product-import.server.ts # GraphQL productCreate一括実行
│   │   └── image-upload.server.ts   # stagedUploadsCreate -> 画像アップロード -> productCreateMedia
│   ├── components/
│   │   ├── CsvDropzone.tsx       # ファイルアップロードUI
│   │   ├── PreviewTable.tsx      # パース結果プレビュー
│   │   └── ImportProgress.tsx    # 登録進捗バー
│   └── shopify.server.ts
├── prisma/
│   └── schema.prisma
├── shopify.app.toml
└── package.json

## 画面構成

### メイン画面（app._index.tsx）
1. CSVファイルのドラッグ＆ドロップエリア
2. アップロード後にプレビューテーブル表示（商品ごとにグルーピング、バリアント数・画像数を表示）
3. バリデーション結果表示（エラー行をハイライト、画像URLの警告も表示）
4. 「インポート開始」ボタン
5. 進捗バー（商品登録中 -> 画像アップロード中 の2段階表示）

### 履歴画面（app.history.tsx）
- 過去のインポートジョブ一覧（日時、商品数、バリアント数、画像数、成功/部分成功/失敗）

### 履歴詳細（app.history.$id.tsx）
- ジョブの詳細（各商品のステータス、エラーメッセージ）

## CSVフォーマット仕様

カラム: title, body_html, vendor, product_type, tags, variant_option1_name, variant_option1_value, variant_option2_name, variant_option2_value, variant_price, variant_sku, variant_inventory_quantity, variant_image_url, product_images

CSV構造ルール:
- 1行目（titleが入っている行）= 商品の親行（商品情報 + 1つ目のバリアント）
- 2行目以降（titleが空の行）= 同じ商品の追加バリアント行
- product_images: 商品全体の画像URL（カンマ区切りで複数可）。ファイル名末尾の番号でソート
- variant_image_url: そのバリアント固有の画像（1枚）
- オプション軸は最大2つまで

## データフロー

CSV Upload -> papaparse でパース
  -> バリアント行のグルーピング（titleが空の行を直前の商品にマージ）
  -> バリデーション -> プレビュー表示
  -> ユーザー確認
  -> 商品ごとに:
    1. productCreate mutation
    2. product_images のURLをダウンロード
    3. ファイル名から番号を抽出してソート
    4. stagedUploadsCreate -> 画像をShopifyにアップロード
    5. productCreateMedia で商品に画像を紐づけ
    6. variant_image_url があるバリアントは productVariantUpdate で画像紐づけ
  -> 結果をPrismaに保存

## バリデーションルール

- title: 親行では必須、256文字以内。バリアント行では空
- variant_price: 必須、数値、0以上
- variant_sku: 任意、64文字以内
- variant_inventory_quantity: 任意、整数
- product_images: 任意、カンマ区切りURL群。URL形式チェック
- variant_image_url: 任意、URL形式チェック
- 不正な行はスキップ＆エラーレポートに含める
- 画像URL 404はスキップし、エラーレポートに記録（商品登録は続行）

## Prismaスキーマ（追加分）

model ImportJob {
  id             String   @id @default(cuid())
  shop           String
  fileName       String
  totalRows      Int
  totalProducts  Int      @default(0)
  totalVariants  Int      @default(0)
  totalImages    Int      @default(0)
  successCount   Int      @default(0)
  failCount      Int      @default(0)
  imageFailCount Int      @default(0)
  status         String   @default("pending") // pending | processing | completed | failed
  createdAt      DateTime @default(now())
  records        ImportRecord[]
}

model ImportRecord {
  id          String   @id @default(cuid())
  jobId       String
  job         ImportJob @relation(fields: [jobId], references: [id])
  rowNumber   Int
  productId   String?
  variantCount Int     @default(0)
  imageCount  Int      @default(0)
  status      String   // success | partial | error
  errorMsg    String?
  createdAt   DateTime @default(now())
}

status定義:
- success: 商品・バリアント・画像すべて正常
- partial: 商品・バリアントは成功、一部画像が失敗
- error: 商品登録自体が失敗

## コーディング規約

- TypeScript strict mode
- Polaris Reactコンポーネント使用
- サービスロジックは *.server.ts に分離
- Conventional Commits形式

## MVPスコープ

含む:
- CSVアップロード -> バリデーション -> プレビュー -> 商品登録
- バリアント複数行対応（オプション軸2つまで）
- 商品画像のURLアップロード（ファイル名ベースの順序ソート）
- バリアント別画像指定
- 成功/部分成功/失敗のレポート表示
- インポート履歴

含まない（来週以降）:
- オプション軸3つ目対応
- bulkOperationRunMutation（大量データ最適化）
- CSVテンプレートダウンロード機能

## コスト

完全無料（papaparseはOSS）

## 開発コマンド

shopify app dev
shopify app deploy
