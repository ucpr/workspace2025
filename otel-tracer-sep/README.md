# OpenTelemetry Tracer 分離パターン比較

このリポジトリでは、OpenTelemetry の Tracer を以下の2つのパターンで実装したサンプルアプリケーションを提供しています：

1. **パッケージごとに Tracer を分離（pkg-pattern）**
2. **サービス全体で1つの Tracer を使用（svc-pattern）**

## 構造

```
.
├── pkg-pattern/       # パッケージごとに Tracer を分離するパターン
│   ├── main.go        # メインアプリケーション
│   └── pkg/
│       ├── user/      # ユーザー関連機能（独自の Tracer を持つ）
│       ├── order/     # 注文関連機能（独自の Tracer を持つ）
│       └── payment/   # 支払い関連機能（独自の Tracer を持つ）
│
└── svc-pattern/       # サービス全体で1つの Tracer を使用するパターン
    ├── main.go        # メインアプリケーション
    ├── tracer/        # 共有 Tracer の定義
    └── pkg/
        ├── user/      # ユーザー関連機能（共有 Tracer を使用）
        ├── order/     # 注文関連機能（共有 Tracer を使用）
        └── payment/   # 支払い関連機能（共有 Tracer を使用）
```

## 実行方法

各パターンは独立して実行できます：

```bash
# パッケージごとに Tracer を分離するパターン
cd pkg-pattern
go run main.go

# サービス全体で1つの Tracer を使用するパターン
cd svc-pattern
go run main.go
```

## パターンの違い

### 1. パッケージごとに Tracer を分離（pkg-pattern）

このパターンでは、各パッケージが独自の Tracer を持ちます：

```go
// user パッケージ
var tracer trace.Tracer

func init() {
    tracer = otel.Tracer("github.com/ucpr/otel-tracer-sep/pkg-pattern/pkg/user")
}

// order パッケージ
var tracer trace.Tracer

func init() {
    tracer = otel.Tracer("github.com/ucpr/otel-tracer-sep/pkg-pattern/pkg/order")
}
```

**メリット**:
- パッケージごとにスパン名が分かれるため、モニタリングUI上でどのパッケージの処理かが明確
- パッケージごとに詳細な設定（サンプリングレートなど）を変更できる可能性がある
- パッケージ単位での分析が容易

**デメリット**:
- Tracer インスタンスが多くなり、メモリ使用量が増える可能性がある
- パッケージをまたぐトレースの分析が少し複雑になることがある

### 2. サービス全体で1つの Tracer を使用（svc-pattern）

このパターンでは、サービス全体で1つの共有 Tracer を使用します：

```go
// tracer パッケージ
var ServiceTracer trace.Tracer

func init() {
    ServiceTracer = otel.Tracer("github.com/ucpr/otel-tracer-sep/svc-pattern")
}

// 各パッケージでの使用
ctx, span := tracer.ServiceTracer.Start(ctx, "user.GetUser")
```

**メリット**:
- シンプルでメモリ効率が良い（Tracer インスタンスが1つだけ）
- サービス全体の一貫した設定が容易
- パッケージをまたぐトレースの分析が容易

**デメリット**:
- スパン名に明示的にパッケージ名を含める必要がある（"user.GetUser" のような命名）
- パッケージごとに異なる設定を適用することが難しい

## バックエンドでの見え方の違い

OpenTelemetry バックエンド（Grafana Tempo、Honeycomb、Jaeger など）では：

### パッケージごとの Tracer パターン（pkg-pattern）

- トレースは「Instrumentation Library/Scope」ごとに分類される傾向がある
- ダッシュボードやクエリでは、パッケージごとにデータを分けて表示できる
- 各パッケージの Tracer 名が「インストルメンテーション名」として表示される

### サービス共有 Tracer パターン（svc-pattern）

- すべてのスパンが同じ「Instrumentation Library/Scope」の下に表示される
- スパン名の先頭に明示的なパッケージ名のプレフィックスが付く
- ダッシュボードやクエリでは、スパン名でフィルタリングする必要がある

## 実際の使用時の考慮事項

- **小〜中規模のサービス**: サービス共有 Tracer パターンの方がシンプルで十分
- **大規模なマイクロサービス**: パッケージごとの Tracer パターンでより詳細な制御が可能
- **モニタリングニーズ**: どのレベルで分析したいかによって選択（コンポーネントレベルかサービス全体か）
- **パフォーマンス**: 非常に大量のトレースを生成するシステムでは、インスタンス数の少ない共有パターンが有利