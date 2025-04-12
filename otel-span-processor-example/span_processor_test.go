package main

import (
	"context"
	"strings"
	"testing"

	"go.opentelemetry.io/otel/attribute"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

func TestCustomSpanProcessor_OnStart(t *testing.T) {
	sp := tracetest.NewInMemoryExporter()
	processor := NewCustomSpanProcessor(sdktrace.NewSimpleSpanProcessor(sp))
	tracerProvider := sdktrace.NewTracerProvider(
		sdktrace.WithSpanProcessor(processor),
	)

	// Create a new span
	tracer := tracerProvider.Tracer("test-tracer")
	_, span := tracer.Start(context.Background(), "OnStart")
	span.End()

	// Force flush to ensure spans are exported
	if err := processor.ForceFlush(context.Background()); err != nil {
		t.Fatalf("failed to force flush: %v", err)
	}

	// Check if the span was processed
	spans := sp.GetSpans()
	if len(spans) != 1 {
		t.Fatalf("expected 1 span, got %d", len(spans))
	}
	// Check if the custom attribute was set
	const expectedKey = "customSpan"
	for _, attr := range spans.Snapshots()[0].Attributes() {
		if attr.Key == expectedKey && !attr.Value.AsBool() {
			t.Fatalf("expected customSpan attribute to be true, got %v", attr.Value)
		}
	}
}

func TestCustomSpanProcessor_OnEnd(t *testing.T) {
	sp := tracetest.NewInMemoryExporter()
	processor := NewCustomSpanProcessor(sdktrace.NewSimpleSpanProcessor(sp))
	tracerProvider := sdktrace.NewTracerProvider(
		sdktrace.WithSpanProcessor(processor),
	)

	// Create a new span
	tracer := tracerProvider.Tracer("test-tracer")
	_, span := tracer.Start(context.Background(), "OnEnd")
	span.SetAttributes(
		attribute.String("span", "value"),
	)
	span.End()

	// Force flush to ensure spans are exported
	if err := processor.ForceFlush(context.Background()); err != nil {
		t.Fatalf("failed to force flush: %v", err)
	}

	// Check if the span was processed
	spans := sp.GetSpans()
	if len(spans) != 1 {
		t.Fatalf("expected 1 span, got %d", len(spans))
	}
	// Check if the custom attribute was set
	for _, attr := range spans.Snapshots()[0].Attributes() {
		if !strings.HasPrefix(string(attr.Key), "prefix.") {
			t.Fatalf("expected attribute key to start with 'prefix.', got %s", attr.Key)
		}
	}
}
