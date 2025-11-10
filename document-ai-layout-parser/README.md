# Document AI Layout Parser

Google Cloud Document AI のレイアウトパーサーを使用して、Office ファイル（Word、Excel、PowerPoint）やPDFからテキストと表を抽出する TypeScript 実装です。

## 特徴

- ✨ **最新の Gemini 搭載パーサー**: 2025年8月版の最新プロセッサバージョンを使用
- 📄 **多様なファイル形式**: PDF、Word、Excel、PowerPoint、HTML をサポート
- 📊 **表の抽出**: テーブル構造を維持しながら完全に抽出
- 📝 **構造化テキスト**: 見出し、段落、リストを識別して抽出
- 🎯 **高精度**: Gemini ベースの AI により表認識と読み取り順序が向上
- 💪 **型安全**: TypeScript によるフルタイプサポート

## サポートされるファイル形式

- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)
- Microsoft Excel (`.xls`, `.xlsx`)
- Microsoft PowerPoint (`.ppt`, `.pptx`)
- HTML (`.html`, `.htm`)

## 前提条件

1. **Google Cloud プロジェクト**
   - Document AI API が有効化されていること
   - 適切な権限を持つサービスアカウントまたは認証情報

2. **Document AI プロセッサ**
   - Layout Parser プロセッサを作成済みであること
   - プロセッサ ID をメモしておく

3. **認証設定**
   - Application Default Credentials (ADC) が設定されていること
   - または `GOOGLE_APPLICATION_CREDENTIALS` 環境変数でサービスアカウントキーを指定

## セットアップ

### 1. 依存関係のインストール

\`\`\`bash
npm install
\`\`\`

### 2. 環境変数の設定

\`.env\` ファイルを作成（または環境変数を設定）：

\`\`\`bash
# Google Cloud プロジェクト ID (必須)
GOOGLE_CLOUD_PROJECT=your-project-id

# Document AI プロセッサ ID (必須)
DOCUMENTAI_PROCESSOR_ID=your-processor-id

# プロセッサのロケーション (オプション、デフォルト: us)
DOCUMENTAI_LOCATION=us

# プロセッサバージョン (オプション、デフォルト: 最新の Gemini 版)
# 利用可能なバージョン (2025):
# - pretrained-layout-parser-v1.5-pro-2025-08-25 (推奨: Gemini 搭載)
# - pretrained-layout-parser-v1.5-2025-08-25
# - pretrained-layout-parser-v1.4-2025-08-25
DOCUMENTAI_PROCESSOR_VERSION=pretrained-layout-parser-v1.5-pro-2025-08-25
\`\`\`

### 3. Google Cloud 認証

以下のいずれかの方法で認証を設定：

**方法 1: Application Default Credentials (推奨)**

\`\`\`bash
gcloud auth application-default login
\`\`\`

**方法 2: サービスアカウントキー**

\`\`\`bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
\`\`\`

## 使用方法

### コマンドラインから実行

\`\`\`bash
npm run process <file-path>
\`\`\`

**例:**

\`\`\`bash
# PDF を処理
npm run process ./samples/document.pdf

# Word ファイルを処理
npm run process ./samples/report.docx

# Excel ファイルを処理
npm run process ./samples/data.xlsx
\`\`\`

### プログラムから使用

\`\`\`typescript
import { LayoutParser, loadConfig, validateConfig } from './src';

async function main() {
  // 設定を読み込み
  const config = loadConfig();
  validateConfig(config);

  // パーサーを初期化
  const parser = new LayoutParser(config);

  // ドキュメントを処理
  const result = await parser.processDocument('./document.pdf', {
    extractTables: true,
    extractTextBlocks: true,
    minConfidence: 0.0,
    enableOcr: true,
  });

  // 結果を使用
  console.log(\`ページ数: \${result.pageCount}\`);
  console.log(\`テキストブロック: \${result.textBlocks.length}\`);
  console.log(\`テーブル: \${result.tables.length}\`);

  // テーブルデータを出力
  result.tables.forEach((table, index) => {
    console.log(\`\nテーブル \${index + 1}:\`);
    console.log(\`  サイズ: \${table.rowCount} 行 × \${table.columnCount} 列\`);
    console.log(\`  ヘッダー: \${table.headers}\`);
    console.log(\`  データ行数: \${table.rows.length}\`);
  });

  await parser.close();
}

main();
\`\`\`

### バッファから処理

\`\`\`typescript
import * as fs from 'fs';
import { LayoutParser } from './src';

async function processBuffer() {
  const buffer = fs.readFileSync('./document.pdf');
  const parser = new LayoutParser(config);

  const result = await parser.processDocumentBuffer(
    buffer,
    'application/pdf',
    { extractTables: true }
  );

  console.log(result);
  await parser.close();
}
\`\`\`

## 出力形式

処理結果は以下の構造で返されます：

\`\`\`typescript
{
  // 抽出されたテキストブロック
  textBlocks: [
    {
      text: "テキスト内容",
      type: "paragraph" | "heading" | "title" | "list" | "other",
      confidence: 0.95,
      pageNumber: 1,
      boundingBox: { x: 0.1, y: 0.2, width: 0.8, height: 0.05 }
    }
  ],

  // 抽出されたテーブル
  tables: [
    {
      pageNumber: 1,
      rowCount: 5,
      columnCount: 3,
      headers: [["列1", "列2", "列3"]],
      rows: [
        ["データ1", "データ2", "データ3"],
        // ...
      ],
      confidence: 0.92,
      boundingBox: { x: 0.1, y: 0.3, width: 0.8, height: 0.4 }
    }
  ],

  // 完全なテキスト
  fullText: "ドキュメント全体のテキスト...",

  // ページ数
  pageCount: 5,

  // MIME タイプ
  mimeType: "application/pdf",

  // メタデータ
  metadata: {
    processorVersion: "pretrained-layout-parser-v1.5-pro-2025-08-25",
    processedAt: "2025-11-09T12:00:00.000Z"
  }
}
\`\`\`

結果は自動的に `output/` ディレクトリに JSON ファイルとして保存されます。

## プロセッサの作成方法

Document AI のレイアウトパーサープロセッサをまだ作成していない場合：

1. [Google Cloud Console](https://console.cloud.google.com/ai/document-ai) にアクセス
2. **CREATE PROCESSOR** をクリック
3. **Layout Parser** を選択
4. リージョンを選択（例: `us`, `eu`）
5. プロセッサ名を入力
6. **CREATE** をクリック
7. プロセッサ ID をコピーして環境変数に設定

## 最新のプロセッサバージョン (2025)

Document AI Layout Parser の最新バージョンは Gemini を搭載しており、以下の改善があります：

- **pretrained-layout-parser-v1.5-pro-2025-08-25** (推奨)
  - Gemini 搭載で最高品質
  - 表認識の向上
  - 読み取り順序の改善
  - PDF テキスト認識の精度向上

- **pretrained-layout-parser-v1.5-2025-08-25**
  - Gemini 搭載の標準版

- **pretrained-layout-parser-v1.4-2025-08-25**
  - 旧バージョン

バージョンを指定しない場合は、デフォルトで最新の Pro 版が使用されます。

## トラブルシューティング

### 認証エラー

\`\`\`
Error: Could not load the default credentials
\`\`\`

**解決方法:**
- `gcloud auth application-default login` を実行
- または `GOOGLE_APPLICATION_CREDENTIALS` を設定

### プロセッサが見つからない

\`\`\`
Error: Processor not found
\`\`\`

**解決方法:**
- プロセッサ ID が正しいか確認
- プロジェクト ID とロケーションが正しいか確認
- プロセッサが作成されているか確認

### API が有効化されていない

\`\`\`
Error: Document AI API has not been used in project
\`\`\`

**解決方法:**
\`\`\`bash
gcloud services enable documentai.googleapis.com
\`\`\`

## ビルド

TypeScript をコンパイル：

\`\`\`bash
npm run build
\`\`\`

コンパイル後のファイルは `dist/` ディレクトリに出力されます。

## 参考リンク

- [Document AI 公式ドキュメント](https://cloud.google.com/document-ai/docs)
- [Layout Parser ガイド](https://cloud.google.com/document-ai/docs/layout-parse-chunk)
- [Node.js Client Library](https://www.npmjs.com/package/@google-cloud/documentai)
- [API リファレンス](https://cloud.google.com/nodejs/docs/reference/documentai/latest)

## ライセンス

MIT
