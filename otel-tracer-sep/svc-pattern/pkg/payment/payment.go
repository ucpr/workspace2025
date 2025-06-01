package payment

import (
	"context"
	"fmt"

	"github.com/ucpr/otel-tracer-sep/svc-pattern/tracer"
)

type Payment struct {
	ID      string
	OrderID string
	Amount  float64
	Method  string
	Status  string
}

func ProcessPayment(ctx context.Context, orderID string, amount float64, method string) (*Payment, error) {
	// 共通の ServiceTracer を使用
	ctx, span := tracer.ServiceTracer.Start(ctx, "payment.ProcessPayment")
	defer span.End()
	
	// 支払い処理を模擬
	span.AddEvent("processing payment")
	
	// 子スパンの作成 - 共通の ServiceTracer を使用
	ctx, validateSpan := tracer.ServiceTracer.Start(ctx, "payment.ValidatePayment")
	validateSpan.AddEvent("validating payment details")
	validateSpan.End()
	
	// 子スパンの作成 - 共通の ServiceTracer を使用
	ctx, execSpan := tracer.ServiceTracer.Start(ctx, "payment.ExecutePayment")
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
	// 共通の ServiceTracer を使用
	ctx, span := tracer.ServiceTracer.Start(ctx, "payment.GetPaymentStatus")
	defer span.End()
	
	// 支払い状況確認の処理を模擬
	span.AddEvent("checking payment status")
	
	return "completed", nil
}