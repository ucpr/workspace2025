package user

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

var tracer trace.Tracer

func init() {
	// user パッケージ用の専用 Tracer を取得
	tracer = otel.Tracer("github.com/ucpr/otel-tracer-sep/pkg-pattern/pkg/user")
}

type User struct {
	ID   string
	Name string
}

func GetUser(ctx context.Context, id string) (*User, error) {
	ctx, span := tracer.Start(ctx, "GetUser")
	defer span.End()
	
	// ユーザー取得の処理を模擬
	// 実際のアプリケーションではデータベースアクセスなどが入る
	span.AddEvent("fetching user from database")
	
	// 子スパンの作成
	ctx, validateSpan := tracer.Start(ctx, "ValidateUser")
	// バリデーション処理を模擬
	validateSpan.AddEvent("validating user data")
	validateSpan.End()
	
	return &User{
		ID:   id,
		Name: fmt.Sprintf("User %s", id),
	}, nil
}

func CreateUser(ctx context.Context, name string) (*User, error) {
	ctx, span := tracer.Start(ctx, "CreateUser")
	defer span.End()
	
	// ユーザー作成の処理を模擬
	span.AddEvent("creating user in database")
	
	return &User{
		ID:   "new-id",
		Name: name,
	}, nil
}