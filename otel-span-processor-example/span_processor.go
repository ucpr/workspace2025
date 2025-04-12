package main

import (
	"context"

	"go.opentelemetry.io/otel/attribute"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

var _ sdktrace.SpanProcessor = (*CustomSpanProcessor)(nil)

type CustomSpanProcessor struct {
	spanProcessor sdktrace.SpanProcessor
}

func NewCustomSpanProcessor(sp sdktrace.SpanProcessor) *CustomSpanProcessor {
	return &CustomSpanProcessor{
		spanProcessor: sp,
	}
}

func (p *CustomSpanProcessor) OnStart(parent context.Context, span sdktrace.ReadWriteSpan) {
	// Span に一律 customSpan 属性を追加する
	span.SetAttributes(
		attribute.Bool("customSpan", true),
	)

	p.spanProcessor.OnStart(parent, span)
}

func (p *CustomSpanProcessor) OnEnd(span sdktrace.ReadOnlySpan) {
	attrs := span.Attributes()
	newAttrs := make([]attribute.KeyValue, len(attrs))

	// 属性に prefix を一律追加する
	for i, attr := range attrs {
		key := "prefix." + string(attr.Key)
		newAttrs[i] = attribute.KeyValue{
			Key:   attribute.Key(key),
			Value: attr.Value,
		}
	}

	p.spanProcessor.OnEnd(&modifiedSpan{
		ReadOnlySpan: span,
		attrs:        newAttrs,
	})
}

func (p *CustomSpanProcessor) ForceFlush(ctx context.Context) error {
	return p.spanProcessor.ForceFlush(ctx)
}

func (p *CustomSpanProcessor) Shutdown(ctx context.Context) error {
	return p.spanProcessor.Shutdown(ctx)
}

var _ sdktrace.ReadOnlySpan = (*modifiedSpan)(nil)

type modifiedSpan struct {
	sdktrace.ReadOnlySpan
	attrs []attribute.KeyValue
}

func (s *modifiedSpan) Attributes() []attribute.KeyValue {
	return s.attrs
}
