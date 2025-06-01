package order

import (
	"context"
	"fmt"

	"github.com/ucpr/otel-tracer-sep/svc-pattern/tracer"
)

type Order struct {
	ID       string
	UserID   string
	Products []string
	Total    float64
}

func GetOrder(ctx context.Context, id string) (*Order, error) {
	// 共通の ServiceTracer を使用
	ctx, span := tracer.ServiceTracer.Start(ctx, "order.GetOrder")
	defer span.End()
	
	// 注文取得の処理を模擬
	span.AddEvent("fetching order from database")
	
	// 子スパンの作成 - 共通の ServiceTracer を使用
	ctx, validateSpan := tracer.ServiceTracer.Start(ctx, "order.ValidateOrder")
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
	// 共通の ServiceTracer を使用
	ctx, span := tracer.ServiceTracer.Start(ctx, "order.CreateOrder")
	defer span.End()
	
	// 注文作成の処理を模擬
	span.AddEvent("creating order in database")
	
	// 子スパンの作成 - 共通の ServiceTracer を使用
	ctx, calcSpan := tracer.ServiceTracer.Start(ctx, "order.CalculateTotal")
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