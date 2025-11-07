package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/weel/backend/internal/auth"
	"github.com/weel/backend/internal/db"
	"github.com/weel/backend/internal/orders"
)

func main() {
	if err := db.Init(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()
	if err := db.RunMigrations(ctx); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	if err := db.RunSeeds(ctx); err != nil {
		log.Fatalf("Failed to run seeds: %v", err)
	}

	auth.Init()

	http.HandleFunc("/health", auth.CORS(healthHandler))
	http.HandleFunc("/auth/login", auth.CORS(auth.LoginHandler))
	http.HandleFunc("/me", auth.CORS(auth.AuthMiddleware(auth.MeHandler)))
	http.HandleFunc("/orders", auth.CORS(orders.OrderRouter))
	http.HandleFunc("/orders/", auth.CORS(orders.OrderRouter))
	http.HandleFunc("/ai/suggest-time", auth.CORS(auth.AuthMiddleware(orders.SuggestTimeHandler)))
	http.HandleFunc("/ai/generate-notes", auth.CORS(auth.AuthMiddleware(orders.GenerateNotesHandler)))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "OK")
}
