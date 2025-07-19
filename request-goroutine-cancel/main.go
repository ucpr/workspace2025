package main

import (
	"context"
	"fmt"
	"net/http"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

var wg sync.WaitGroup

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	mux := http.NewServeMux()
	mux.HandleFunc("/work", func(w http.ResponseWriter, r *http.Request) {
		// リクエストごとの context 派生
		reqCtx, cancel := context.WithCancel(ctx)
		wg.Add(1)
		go func() {
			defer wg.Done()
			defer cancel() // 明示的にキャンセル
			handleRequest(reqCtx)
		}()
		fmt.Fprintln(w, "Started work")
	})

	srv := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	// サーバ起動
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("Listen error: %v\n", err)
		}
	}()
	fmt.Println("Server started")

	// シグナルを待機
	<-ctx.Done()
	fmt.Println("Shutting down...")

	// サーバ shutdown（context にタイムアウトを設定してもOK）
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		fmt.Printf("Shutdown error: %v\n", err)
	}

	// 全 Goroutine の終了を待機
	wg.Wait()
	fmt.Println("Graceful shutdown complete")
}

func handleRequest(ctx context.Context) {
	// 長時間処理の例
	select {
	case <-time.After(10 * time.Second):
		fmt.Println("Work done")
	case <-ctx.Done():
		fmt.Println("Request cancelled")
	}
}
