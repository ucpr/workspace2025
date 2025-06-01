package order

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

var tracer trace.Tracer

func init() {
	// order パッケージ用の専用 Tracer を取得
	tracer = otel.Tracer("github.com/ucpr/otel-tracer-sep/pkg-pattern/pkg/order")
}

type Order struct {
	ID       string
	UserID   string
	Products []string
	Total    float64
}

func GetOrder(ctx context.Context, id string) (*Order, error) {
	ctx, span := tracer.Start(ctx, "GetOrder")
	defer span.End()
	
	// 注文取得の処理を模擬
	span.AddEvent("fetching order from database")
	
	// 子スパンの作成
	ctx, validateSpan := tracer.Start(ctx, "ValidateOrder")
	// バリデーション処理を模擬
	validateSpan.AddEvent("validating order data")
	validateSpan.End()
	
	return &Order{
		ID:       id,
		UserID:   "user-123",
		Products: []string{"product-1", "product-2"},
		Total:    99.99,
	}, nil
}

func CreateOrder(ctx context.Context, userID string, products []string) (*Order, error) {
	ctx, span := tracer.Start(ctx, "CreateOrder")
	defer span.End()
	
	// 注文作成の処理を模擬
	span.AddEvent("creating order in database")
	
	// 子スパンの作成
	ctx, calcSpan := tracer.Start(ctx, "CalculateTotal")
	// 合計金額計算の処理を模擬
	calcSpan.AddEvent("calculating order total")
	calcSpan.End()
	
	return &Order{
		ID:       fmt.Sprintf("order-%s", userID),
		UserID:   userID,
		Products: products,
		Total:    float64(len(products)) * 49.99,
	}, nil
}