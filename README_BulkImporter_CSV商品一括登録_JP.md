# BulkImporter — CSVだけで商品を一括登録するShopifyアプリ

> **何を:** CSVファイルをアップロードするだけで、バリアント・画像を含むShopify商品を一括登録できるEmbedded App
> **誰に:** 大量商品を扱う中小マーチャント・越境ECストアオーナー
> **技術:** Remix · TypeScript · Prisma + SQLite · Polaris React · Shopify GraphQL Admin API · PapaParse

ソースコード: [GitHub](https://github.com/mer-prog/bulk-importer)

---

## このプロジェクトで証明できるスキル

| スキル | 実装内容 |
|--------|----------|
| Shopify Embedded App開発 | App Bridge + Polaris UIによる管理画面統合、OAuth認証、Webhookハンドリング |
| GraphQL API設計・実装 | `productCreate` / `stagedUploadsCreate` / `productCreateMedia` / `productVariantUpdate` の4つのMutationを連携 |
| CSVパース・バリデーション | PapaParse によるヘッダー付きCSV解析、行レベルバリデーション、バリアント行の親商品へのグルーピング処理 |
| 画像アップロードパイプライン | URL→fetch→stagedUpload→productCreateMediaの3段階パイプライン、バリアント別画像の紐づけ |
| データベース設計・ORM | Prisma + SQLiteによるジョブ・レコード管理、3段階ステータストラッキング（success / partial / error） |
| 多言語対応（i18n） | React Contextベースの自前i18n実装、JSON辞書ファイルによる日英切り替え、フォールバック機構付き |
| フルスタックRemixアーキテクチャ | サーバーサイドaction/loader、クライアントサイドfetcher、サービスレイヤー分離の設計パターン |

## 技術スタック

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|-----------|------|
| フレームワーク | Remix | ^2.16.1 | Shopify App Template ベースのSSRフレームワーク |
| 言語 | TypeScript | ^5.2.2 | strict modeによる型安全な開発 |
| ビルドツール | Vite | ^6.2.2 | 高速なHMR・ビルド |
| UIフレームワーク | Polaris React | ^12.0.0 | Shopify管理画面ネイティブのUIコンポーネント |
| アプリ統合 | Shopify App Bridge React | ^4.1.6 | Shopify管理画面へのEmbedded App統合 |
| アプリSDK | shopify-app-remix | ^4.1.0 | 認証・セッション管理・Webhook処理 |
| ORM | Prisma Client | ^6.2.1 | データベースアクセスの型安全な抽象化 |
| データベース | SQLite | - | 軽量な組み込みDB（Prismaプロバイダー） |
| セッション管理 | shopify-app-session-storage-prisma | ^8.0.0 | Prisma経由のセッション永続化 |
| CSVパース | PapaParse | ^5.5.3 | CSVファイルの高速パース |
| ランタイム | Node.js | >=20.19 | サーバー実行環境 |
| リンター | ESLint | ^8.42.0 | コード品質の維持 |
| フォーマッター | Prettier | ^3.2.4 | コードフォーマットの統一 |

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                    Shopify 管理画面                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               App Bridge (Embedded)                   │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐  │  │
│  │  │ CsvDropzone  │ │ PreviewTable │ │ImportProgress │  │  │
│  │  │ ドラッグ&     │ │ 商品プレビュー│ │ 進捗バー      │  │  │
│  │  │ ドロップ      │ │ エラー表示   │ │ 結果表示      │  │  │
│  │  └──────┬───────┘ └──────┬───────┘ └───────┬───────┘  │  │
│  │         │ CSV テキスト    │ 確認              │ 完了     │  │
│  └─────────┼───────────────┼──────────────────┼──────────┘  │
│            ▼               ▼                  ▲              │
│  ┌─────────────────────────────────────────────┐            │
│  │           Remix Action / Loader              │            │
│  │  ┌───────────────┐  ┌─────────────────────┐ │            │
│  │  │ intent="parse" │  │ intent="import"     │ │            │
│  │  └───────┬────────┘  └──────────┬──────────┘ │            │
│  └──────────┼──────────────────────┼────────────┘            │
│             ▼                      ▼                         │
│  ┌─────────────────┐  ┌──────────────────────┐               │
│  │ csv-parser       │  │ product-import       │               │
│  │ .server.ts       │  │ .server.ts           │               │
│  │                  │  │  ┌────────────────┐  │               │
│  │ PapaParse解析    │  │  │ image-upload   │  │               │
│  │ バリデーション    │  │  │ .server.ts     │  │               │
│  │ グルーピング      │  │  └────────┬───────┘  │               │
│  └─────────────────┘  └──────────┼───────────┘               │
│                                  ▼                           │
│                       ┌──────────────────┐                   │
│                       │ Shopify GraphQL   │                   │
│                       │ Admin API         │                   │
│                       │                  │                   │
│                       │ productCreate    │                   │
│                       │ stagedUploads    │                   │
│                       │ productCreate    │                   │
│                       │   Media          │                   │
│                       │ productVariant   │                   │
│                       │   Update         │                   │
│                       └──────────────────┘                   │
│                                                              │
│  ┌─────────────────┐                                        │
│  │ Prisma + SQLite  │  ImportJob / ImportRecord              │
│  │ セッション管理    │  Session                               │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

## 主要機能

### 1. CSVドラッグ＆ドロップアップロード
`CsvDropzone`コンポーネントがPolaris `DropZone`をラップし、`.csv`ファイルのみを受け付ける。`FileReader`でテキストとして読み込み、サーバーサイドのパースアクションに送信。

### 2. CSVパース・バリアント行グルーピング
`csv-parser.server.ts`がPapaParseでヘッダー付きCSVを解析。`title`カラムが入っている行を親商品として認識し、`title`が空の後続行を同じ商品のバリアントとして自動グルーピング。オプション軸は最大2つまで対応。

### 3. 行レベルバリデーション
各行に対して以下のバリデーションを実行:
- `title`: 親行で必須、256文字以内
- `variant_price`: 必須、0以上の数値
- `variant_sku`: 64文字以内
- `variant_inventory_quantity`: 整数
- `product_images` / `variant_image_url`: URL形式チェック

エラー行はスキップされ、バリデーションエラーは一覧で表示される（最大10件表示、以降は件数のみ）。

### 4. プレビューテーブル
`PreviewTable`コンポーネントがパース結果をPolaris `IndexTable`で表示。各商品の行番号・商品名・ベンダー・商品タイプ・バリアント数・画像数・タグを一覧表示。商品数・バリアント数・画像数のサマリーも表示。

### 5. 商品一括登録（GraphQL）
`product-import.server.ts`が商品ごとに順次`productCreate` Mutationを実行。オプション軸・バリアント情報を整形してGraphQL入力に変換。

### 6. 画像アップロードパイプライン
`image-upload.server.ts`が3段階のパイプラインを実行:
1. `stagedUploadsCreate` Mutationでアップロード先URLを取得
2. 外部URLから画像をfetchし、Shopifyのstaged URLにPUT
3. `productCreateMedia` Mutationで商品にメディアを紐づけ

商品全体の画像はファイル名末尾の数字でソートされ、バリアント固有の画像は`productVariantUpdate`で個別に紐づけ。画像の404エラーはスキップし、商品登録は続行。

### 7. 3段階ステータストラッキング
各商品のインポート結果を3段階で記録:
- **success**: 商品・バリアント・画像すべて正常
- **partial**: 商品・バリアントは成功、一部画像が失敗
- **error**: 商品登録自体が失敗

### 8. インポート履歴
`app.history.tsx`で過去50件のインポートジョブを一覧表示。日時・ファイル名・商品数・バリアント数・画像数・成功数・失敗数・ステータスを表示。

### 9. インポート詳細
`app.history.$id.tsx`でジョブの詳細を表示。ジョブサマリー（ステータス・商品数・バリアント数・画像数・成功/失敗数）と商品別の結果テーブル（行番号・商品名・商品ID・バリアント数・画像数・ステータス・エラーメッセージ）。

### 10. 多言語対応（日本語 / 英語）
React Contextベースの自前i18n実装。`I18nProvider`がJSON辞書ファイル（`ja.json` / `en.json`）を読み込み、`useTranslation`フックで翻訳関数`t()`を提供。パラメータ補間（`{count}`形式）対応。デフォルトは日本語。画面右上の`LanguageToggle`ボタンで切り替え可能。もう一方の言語へのフォールバック機構付き。

## 画面仕様

### メイン画面（CSV一括登録）
**ルート:** `/app`

| 要素 | 説明 |
|------|------|
| CSVアップロードエリア | ドラッグ＆ドロップまたはクリックで`.csv`ファイルを選択 |
| プレビューテーブル | パース結果を商品ごとにグルーピングして表示 |
| バリデーションエラー | エラー行を一覧表示（最大10件 + 残件数） |
| サマリー | 商品数・バリアント数・画像数を表示 |
| リセットボタン | アップロード状態をクリアして最初に戻る |
| インポート開始ボタン | 商品登録処理を開始 |
| 進捗バー | 登録中の進捗をリアルタイム表示 |
| 結果表示 | 成功/失敗件数、詳細画面へのリンク |

### インポート履歴画面
**ルート:** `/app/history`

過去50件のインポートジョブを`IndexTable`で一覧表示。各行をクリックすると詳細画面に遷移。履歴がない場合は`EmptyState`を表示。

### インポート詳細画面
**ルート:** `/app/history/:id`

ジョブサマリーカードと商品別結果テーブルで構成。戻るボタンで履歴一覧に遷移。

## プロジェクト構成

```
bulk-importer/
├── app/
│   ├── components/
│   │   ├── AppContent.tsx              (24行)  ナビゲーション + 言語切替 + Outlet
│   │   ├── CsvDropzone.tsx             (76行)  CSVドラッグ＆ドロップUI
│   │   ├── ImportProgress.tsx          (64行)  インポート進捗バー・結果表示
│   │   ├── LanguageToggle.tsx          (25行)  EN/JA切替ボタン
│   │   └── PreviewTable.tsx           (111行)  パース結果プレビューテーブル
│   ├── i18n/
│   │   ├── i18nContext.tsx             (83行)  i18n Provider・useTranslationフック
│   │   ├── en.json                    (101行)  英語翻訳辞書
│   │   └── ja.json                    (101行)  日本語翻訳辞書
│   ├── routes/
│   │   ├── app.tsx                     (39行)  アプリレイアウト（AppProvider + I18nProvider）
│   │   ├── app._index.tsx             (271行)  メイン画面（CSVアップロード・パース・インポート）
│   │   ├── app.history.tsx            (146行)  インポート履歴一覧
│   │   ├── app.history.$id.tsx        (235行)  インポート詳細
│   │   ├── auth.$.tsx                   (8行)  認証キャッチオールルート
│   │   ├── auth.login/route.tsx        (58行)  ログインページ
│   │   ├── webhooks.app.uninstalled.tsx(17行)  アンインストールWebhook
│   │   └── webhooks.app.scopes_update.tsx      スコープ更新Webhook
│   ├── services/
│   │   ├── csv-parser.server.ts       (227行)  CSVパース・バリデーション・グルーピング
│   │   ├── product-import.server.ts   (315行)  商品一括登録ロジック
│   │   └── image-upload.server.ts     (165行)  画像アップロードパイプライン
│   ├── db.server.ts                    (15行)  Prisma Clientシングルトン
│   ├── shopify.server.ts               (35行)  Shopifyアプリ設定・認証エクスポート
│   ├── root.tsx                        (30行)  ルートレイアウト
│   ├── entry.server.tsx                (59行)  SSRエントリーポイント
│   └── routes.ts                        (3行)  ルーティング設定
├── prisma/
│   ├── schema.prisma                   (64行)  DBスキーマ定義
│   └── migrations/                             マイグレーションファイル
├── .github/workflows/
│   └── ci.yml                                  CI設定（Node 20/22/24 マトリクス）
├── shopify.app.toml                            Shopifyアプリ設定
├── vite.config.ts                      (73行)  Viteビルド設定
├── tsconfig.json                               TypeScript設定（strict mode）
└── package.json                                依存関係・スクリプト定義
```

## データベース設計

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│         ImportJob            │      │        ImportRecord          │
├──────────────────────────────┤      ├──────────────────────────────┤
│ id          TEXT PK (cuid)   │      │ id           TEXT PK (cuid)  │
│ shop        TEXT             │◄────┐│ jobId        TEXT FK         │
│ fileName    TEXT             │     ││ rowNumber    INT             │
│ totalRows   INT              │     ││ productTitle TEXT            │
│ totalProducts INT DEFAULT 0  │     ││ productId    TEXT?           │
│ totalVariants INT DEFAULT 0  │     ││ variantCount INT DEFAULT 0   │
│ totalImages  INT DEFAULT 0   │     ││ imageCount   INT DEFAULT 0   │
│ successCount INT DEFAULT 0   │     ││ status       TEXT            │
│ failCount    INT DEFAULT 0   │     ││              (success|       │
│ imageFailCount INT DEFAULT 0 │     ││               partial|error) │
│ status       TEXT            │     ││ errorMsg     TEXT?           │
│              (pending|       │     ││ createdAt    DATETIME        │
│               processing|    │     │└──────────────────────────────┘
│               completed|     │     │
│               failed)        │     │  1:N
│ createdAt    DATETIME        │─────┘
└──────────────────────────────┘

┌──────────────────────────────┐
│          Session             │
├──────────────────────────────┤
│ id          TEXT PK          │
│ shop        TEXT             │
│ state       TEXT             │
│ isOnline    BOOLEAN          │
│ scope       TEXT?            │
│ expires     DATETIME?        │
│ accessToken TEXT             │
│ userId      BIGINT?          │
│ firstName   TEXT?            │
│ lastName    TEXT?            │
│ email       TEXT?            │
│ accountOwner BOOLEAN         │
│ locale      TEXT?            │
│ collaborator BOOLEAN?        │
│ emailVerified BOOLEAN?       │
│ refreshToken TEXT?           │
│ refreshTokenExpires DATETIME?│
└──────────────────────────────┘
```

## CSVフォーマット仕様

| カラム | 必須 | 説明 | バリデーション |
|--------|------|------|---------------|
| `title` | 親行で必須 | 商品名。バリアント行では空にする | 256文字以内 |
| `body_html` | - | 商品説明（HTML可） | - |
| `vendor` | - | ベンダー名 | - |
| `product_type` | - | 商品タイプ | - |
| `tags` | - | タグ（カンマ区切り） | - |
| `variant_option1_name` | - | オプション軸1の名前（例: "サイズ"） | - |
| `variant_option1_value` | - | オプション軸1の値（例: "M"） | - |
| `variant_option2_name` | - | オプション軸2の名前（例: "カラー"） | - |
| `variant_option2_value` | - | オプション軸2の値（例: "レッド"） | - |
| `variant_price` | 必須 | バリアント価格 | 0以上の数値 |
| `variant_sku` | - | SKU | 64文字以内 |
| `variant_inventory_quantity` | - | 在庫数 | 整数 |
| `variant_image_url` | - | バリアント固有の画像URL（1枚） | URL形式 |
| `product_images` | - | 商品画像URL（カンマ区切りで複数可） | URL形式 |

**CSV構造ルール:**
- `title`が入っている行 → 親行（商品情報 + 1つ目のバリアント）
- `title`が空の行 → 直前の商品の追加バリアント行
- `product_images`のURLはファイル名末尾の数字でソートされる

## セットアップ

### 前提条件
- Node.js 20.19以上
- Shopify CLI
- Shopify開発ストア

### 手順

```bash
# リポジトリをクローン
git clone https://github.com/mer-prog/bulk-importer.git
cd bulk-importer

# 依存関係のインストール
npm install

# データベースのセットアップ
npx prisma migrate dev

# 開発サーバーの起動
shopify app dev
```

### デプロイ

```bash
shopify app deploy
```

### 環境変数

| 変数 | 説明 | 必須 |
|------|------|------|
| `SHOPIFY_API_KEY` | ShopifyアプリのAPIキー | 必須 |
| `SHOPIFY_API_SECRET` | ShopifyアプリのAPIシークレット | 必須 |
| `SHOPIFY_APP_URL` | アプリのURL | 必須 |
| `SCOPES` | APIスコープ（`write_products,read_products,write_files,read_files`） | 必須 |
| `SHOP_CUSTOM_DOMAIN` | カスタムドメイン（任意） | - |
| `PORT` | サーバーポート（デフォルト: 3000） | - |
| `FRONTEND_PORT` | フロントエンドポート（外部ホスト時） | - |

## APIエンドポイント

| ルート | メソッド | 説明 |
|--------|---------|------|
| `/app` | GET | メイン画面（認証チェック） |
| `/app` | POST (`intent=parse`) | CSVテキストのパース・バリデーション |
| `/app` | POST (`intent=import`) | 商品の一括登録実行 |
| `/app/history` | GET | インポート履歴一覧の取得（最新50件） |
| `/app/history/:id` | GET | インポートジョブの詳細取得 |
| `/auth/login` | GET/POST | Shopify OAuth認証 |
| `/auth/*` | GET | 認証コールバック |
| `/webhooks/app/uninstalled` | POST | アプリアンインストール時のセッション削除 |
| `/webhooks/app/scopes_update` | POST | スコープ更新Webhook |

## 設計判断の根拠

| 判断 | 根拠 |
|------|------|
| SQLiteをデータベースに採用 | Shopify App Templateのデフォルト。Embedded Appとしてシンプルなデプロイを実現。インポート履歴の永続化に十分な性能 |
| PapaParseでクライアントサイドではなくサーバーサイドでCSVをパース | バリデーションとグルーピングロジックをサーバーに集約し、クライアントの負荷を軽減。型安全なサービス層で処理 |
| 商品を順次登録（並列ではなく逐次処理） | Shopify GraphQL APIのレート制限を回避。各商品の登録結果を個別にDBへ記録するため、逐次処理が適切 |
| 自前のi18n実装（ライブラリ不使用） | 日英2言語のみの対応で、React Contextベースの軽量実装で十分。外部ライブラリの依存を増やさない判断 |
| `stagedUploadsCreate`経由の画像アップロード | Shopify推奨のアップロードフロー。外部URLから直接取り込むのではなく、Shopifyのストレージに安全にアップロード |
| 3段階ステータス（success / partial / error） | 画像アップロードの部分的失敗を正確に記録。商品は登録できたが画像が一部失敗したケースを区別 |
| バリアント行のグルーピングを`title`カラムの有無で判定 | Shopify公式CSVフォーマットと同様のアプローチ。直感的でユーザーが理解しやすい構造 |

## CI/CD パイプライン

GitHub Actionsによる継続的インテグレーション:

| ジョブ | トリガー | Node.jsバージョン |
|--------|---------|-----------------|
| CI | push, pull_request | 20.19.0, 22, 24（マトリクスビルド） |

## 運用コスト

| サービス | プラン | 月額 |
|----------|--------|------|
| Shopify App Hosting | Shopify提供 | 無料 |
| SQLite | 組み込み | 無料 |
| PapaParse | OSS | 無料 |
| GitHub | Free | 無料 |

**合計: 無料**

## 作者

[@mer-prog](https://github.com/mer-prog)
