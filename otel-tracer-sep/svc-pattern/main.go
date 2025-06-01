package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/ucpr/otel-tracer-sep/svc-pattern/pkg/order"
	"github.com/ucpr/otel-tracer-sep/svc-pattern/pkg/payment"
	"github.com/ucpr/otel-tracer-sep/svc-pattern/pkg/user"
	"github.com/ucpr/otel-tracer-sep/svc-pattern/tracer"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

func initTracer() (*sdktrace.TracerProvider, error) {
	// 標準出力にスパンを出力するエクスポーターを作成
	exporter, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
	if err != nil {
		return nil, err
	}

	// リソース（サービス名等）の設定
	res := resource.NewWithAttributes(
		semconv.SchemaURL,
		semconv.ServiceName("svc-pattern-service"),
		semconv.ServiceVersion("0.1.0"),
	)

	// TracerProvider の作成と設定
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)

	// グローバルな TracerProvider として設定
	otel.SetTracerProvider(tp)

	return tp, nil
}

func main() {
	// TracerProvider の初期化
	tp, err := initTracer()
	if err != nil {
		log.Fatalf("Failed to initialize tracer provider: %v", err)
	}
	defer func() {
		// アプリケーション終了時に TracerProvider をシャットダウン
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := tp.Shutdown(ctx); err != nil {
			log.Fatalf("Error shutting down tracer provider: %v", err)
		}
	}()

	// ルートコンテキストの作成
	ctx := context.Background()

	// サービスの呼び出しシナリオを実行
	simulateUserJourney(ctx)
}

func simulateUserJourney(ctx context.Context) {
	// ルートスパンの作成 - 共通の ServiceTracer を使用
	ctx, span := tracer.ServiceTracer.Start(ctx, "UserJourney")
	defer span.End()

	// ユーザー作成
	u, err := user.CreateUser(ctx, "John Doe")
	if err != nil {
		log.Fatalf("Failed to create user: %v", err)
	}
	fmt.Printf("Created user: %s, %s\n", u.ID, u.Name)

	// 注文作成
	o, err := order.CreateOrder(ctx, u.ID, []string{"product-1", "product-2"})
	if err != nil {
		log.Fatalf("Failed to create order: %v", err)
	}
	fmt.Printf("Created order: %s, total: %.2f\n", o.ID, o.Total)

	// 支払い処理
	p, err := payment.ProcessPayment(ctx, o.ID, o.Total, "credit-card")
	if err != nil {
		log.Fatalf("Failed to process payment: %v", err)
	}
	fmt.Printf("Processed payment: %s, status: %s\n", p.ID, p.Status)

	// 注文の取得
	o2, err := order.GetOrder(ctx, o.ID)
	if err != nil {
		log.Fatalf("Failed to get order: %v", err)
	}
	fmt.Printf("Retrieved order: %s\n", o2.ID)

	// 支払い状況の確認
	status, err := payment.GetPaymentStatus(ctx, p.ID)
	if err != nil {
		log.Fatalf("Failed to get payment status: %v", err)
	}
	fmt.Printf("Payment status: %s\n", status)
}