package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/weel/backend/internal/db"
	"golang.org/x/crypto/bcrypt"
)

func setupTestDB(t *testing.T) {
	os.Setenv("DB_HOST", "localhost")
	os.Setenv("DB_PORT", "5432")
	os.Setenv("DB_USER", "postgres")
	os.Setenv("DB_PASSWORD", "postgres")
	os.Setenv("DB_NAME", "weel_test")
	os.Setenv("DB_SSLMODE", "disable")
	os.Setenv("JWT_SECRET", "test-secret")

	if err := db.Init(); err != nil {
		t.Skipf("Skipping test: database not available: %v", err)
	}

	ctx := context.Background()

	if err := db.RunMigrations(ctx); err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	db.Pool.Exec(ctx, "DELETE FROM users")

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("demo123"), bcrypt.DefaultCost)
	db.Pool.Exec(
		ctx,
		"INSERT INTO users (email, password) VALUES ($1, $2)",
		"demo@example.com",
		string(hashedPassword),
	)
}

func TestLoginHandler(t *testing.T) {
	setupTestDB(t)
	Init()

	tests := []struct {
		name           string
		request        LoginRequest
		expectedStatus int
		expectToken    bool
	}{
		{
			name: "valid credentials",
			request: LoginRequest{
				Email:    "demo@example.com",
				Password: "demo123",
			},
			expectedStatus: http.StatusOK,
			expectToken:    true,
		},
		{
			name: "invalid email",
			request: LoginRequest{
				Email:    "wrong@example.com",
				Password: "demo123",
			},
			expectedStatus: http.StatusUnauthorized,
			expectToken:    false,
		},
		{
			name: "invalid password",
			request: LoginRequest{
				Email:    "demo@example.com",
				Password: "wrongpassword",
			},
			expectedStatus: http.StatusUnauthorized,
			expectToken:    false,
		},
		{
			name: "missing email",
			request: LoginRequest{
				Password: "demo123",
			},
			expectedStatus: http.StatusBadRequest,
			expectToken:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.request)
			req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			LoginHandler(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectToken {
				var response LoginResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.NotEmpty(t, response.Token)
			}
		})
	}
}

func TestMeHandler(t *testing.T) {
	setupTestDB(t)
	Init()

	token, err := GenerateToken(1, "demo@example.com")
	require.NoError(t, err)

	tests := []struct {
		name           string
		authHeader     string
		expectedStatus int
		expectUser     bool
	}{
		{
			name:           "valid token",
			authHeader:     "Bearer " + token,
			expectedStatus: http.StatusOK,
			expectUser:     true,
		},
		{
			name:           "missing token",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectUser:     false,
		},
		{
			name:           "invalid token",
			authHeader:     "Bearer invalid-token",
			expectedStatus: http.StatusUnauthorized,
			expectUser:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/me", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			w := httptest.NewRecorder()

			AuthMiddleware(MeHandler)(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectUser {
				var response UserResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Equal(t, "demo@example.com", response.Email)
				assert.Equal(t, 1, response.ID)
			}
		})
	}
}
