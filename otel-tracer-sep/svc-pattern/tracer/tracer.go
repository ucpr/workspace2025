package tracer

import (
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

// サービス全体で共有する単一の Tracer
var ServiceTracer trace.Tracer

func init() {
	// サービス全体で使用する単一の Tracer を取得
	// 名前は共通のサービス名を使用
	ServiceTracer = otel.Tracer("github.com/ucpr/otel-tracer-sep/svc-pattern")
}