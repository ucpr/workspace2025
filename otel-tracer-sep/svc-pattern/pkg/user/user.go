package user

import (
	"context"
	"fmt"

	"github.com/ucpr/otel-tracer-sep/svc-pattern/tracer"
)

type User struct {
	ID   string
	Name string
}

func GetUser(ctx context.Context, id string) (*User, error) {
	// 共通の ServiceTracer を使用
	ctx, span := tracer.ServiceTracer.Start(ctx, "user.GetUser")
	defer span.End()
	
	// ユーザー取得の処理を模擬
	span.AddEvent("fetching user from database")
	
	// 子スパンの作成 - 共通の ServiceTracer を使用
	ctx, validateSpan := tracer.ServiceTracer.Start(ctx, "user.ValidateUser")
	// バリデーション処理を模擬
	validateSpan.AddEvent("validating user data")
	validateSpan.End()
	
	return &User{
		ID:   id,
		Name: fmt.Sprintf("User %s", id),
	}, nil
}

func CreateUser(ctx context.Context, name string) (*User, error) {
	// 共通の ServiceTracer を使用
	ctx, span := tracer.ServiceTracer.Start(ctx, "user.CreateUser")
	defer span.End()
	
	// ユーザー作成の処理を模擬
	span.AddEvent("creating user in database")
	
	return &User{
		ID:   "new-id",
		Name: name,
	}, nil
}