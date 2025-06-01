package payment

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

var tracer trace.Tracer

func init() {
	// payment パッケージ用の専用 Tracer を取得
	tracer = otel.Tracer("github.com/ucpr/otel-tracer-sep/pkg-pattern/pkg/payment")
}

type Payment struct {
	ID      string
	OrderID string
	Amount  float64
	Method  string
	Status  string
}

func ProcessPayment(ctx context.Context, orderID string, amount float64, method string) (*Payment, error) {
	ctx, span := tracer.Start(ctx, "ProcessPayment")
	defer span.End()
	
	// 支払い処理を模擬
	span.AddEvent("processing payment")
	
	// 子スパンの作成: 支払い検証
	ctx, validateSpan := tracer.Start(ctx, "ValidatePayment")
	validateSpan.AddEvent("validating payment details")
	validateSpan.End()
	
	// 子スパンの作成: 支払い実行
	ctx, execSpan := tracer.Start(ctx, "ExecutePayment")
	execSpan.AddEvent("contacting payment gateway")
	execSpan.AddEvent("receiving payment confirmation")
	execSpan.End()
	
	return &Payment{
		ID:      fmt.Sprintf("pmt-%s", orderID),
		OrderID: orderID,
		Amount:  amount,
		Method:  method,
		Status:  "completed",
	}, nil
}

func GetPaymentStatus(ctx context.Context, paymentID string) (string, error) {
	ctx, span := tracer.Start(ctx, "GetPaymentStatus")
	defer span.End()
	
	// 支払い状況確認の処理を模擬
	span.AddEvent("checking payment status")
	
	return "completed", nil
}