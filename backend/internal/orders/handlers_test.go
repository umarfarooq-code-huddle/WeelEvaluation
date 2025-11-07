package orders

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/weel/backend/internal/auth"
	"github.com/weel/backend/internal/db"
	"golang.org/x/crypto/bcrypt"
)

func setupTestDBForOrders(t *testing.T) (string, int) {
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

	db.Pool.Exec(ctx, "DELETE FROM orders")
	db.Pool.Exec(ctx, "DELETE FROM users")

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("demo123"), bcrypt.DefaultCost)
	var userID int
	err := db.Pool.QueryRow(
		ctx,
		"INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id",
		"demo@example.com",
		string(hashedPassword),
	).Scan(&userID)
	require.NoError(t, err)

	auth.Init()
	token, err := auth.GenerateToken(userID, "demo@example.com")
	require.NoError(t, err)

	return token, userID
}

func TestCreateOrderHandler(t *testing.T) {
	token, _ := setupTestDBForOrders(t)

	futureTime := time.Now().Add(24 * time.Hour)

	tests := []struct {
		name           string
		request        CreateOrderRequest
		expectedStatus int
		expectOrder    bool
		expectError    bool
	}{
		{
			name: "valid order creation",
			request: CreateOrderRequest{
				Type:     "IN_STORE",
				DateTime: futureTime,
				Notes:    "Test order",
			},
			expectedStatus: http.StatusCreated,
			expectOrder:    true,
			expectError:    false,
		},
		{
			name: "missing type",
			request: CreateOrderRequest{
				DateTime: futureTime,
				Notes:    "Test order",
			},
			expectedStatus: http.StatusBadRequest,
			expectOrder:    false,
			expectError:    true,
		},
		{
			name: "invalid type",
			request: CreateOrderRequest{
				Type:     "INVALID",
				DateTime: futureTime,
				Notes:    "Test order",
			},
			expectedStatus: http.StatusBadRequest,
			expectOrder:    false,
			expectError:    true,
		},
		{
			name: "past datetime",
			request: CreateOrderRequest{
				Type:     "DELIVERY",
				DateTime: time.Now().Add(-24 * time.Hour),
				Notes:    "Test order",
			},
			expectedStatus: http.StatusBadRequest,
			expectOrder:    false,
			expectError:    true,
		},
		{
			name: "zero datetime",
			request: CreateOrderRequest{
				Type:     "CURBSIDE",
				DateTime: time.Time{},
				Notes:    "Test order",
			},
			expectedStatus: http.StatusBadRequest,
			expectOrder:    false,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.request)
			req := httptest.NewRequest(http.MethodPost, "/orders", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+token)
			w := httptest.NewRecorder()

			auth.AuthMiddleware(CreateOrderHandler)(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectOrder {
				var response OrderResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.NotZero(t, response.ID)
				assert.Equal(t, tt.request.Type, response.Type)
			}

			if tt.expectError {
				var errorResponse ErrorResponse
				err := json.Unmarshal(w.Body.Bytes(), &errorResponse)
				require.NoError(t, err)
				assert.NotEmpty(t, errorResponse.Error)
				if len(errorResponse.Details) > 0 {
					assert.NotEmpty(t, errorResponse.Details[0].Field)
					assert.NotEmpty(t, errorResponse.Details[0].Message)
				}
			}
		})
	}
}

func TestGetOrderHandler(t *testing.T) {
	token, userID := setupTestDBForOrders(t)
	ctx := context.Background()

	futureTime := time.Now().Add(24 * time.Hour)
	var orderID int
	err := db.Pool.QueryRow(
		ctx,
		"INSERT INTO orders (user_id, type, datetime, notes) VALUES ($1, $2, $3, $4) RETURNING id",
		userID, "IN_STORE", futureTime, "Test notes",
	).Scan(&orderID)
	require.NoError(t, err)

	tests := []struct {
		name           string
		orderID        int
		expectedStatus int
		expectOrder    bool
	}{
		{
			name:           "valid order retrieval",
			orderID:        orderID,
			expectedStatus: http.StatusOK,
			expectOrder:    true,
		},
		{
			name:           "non-existent order",
			orderID:        99999,
			expectedStatus: http.StatusNotFound,
			expectOrder:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/orders/%d", tt.orderID), nil)
			req.Header.Set("Authorization", "Bearer "+token)
			w := httptest.NewRecorder()

			auth.AuthMiddleware(GetOrderHandler)(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectOrder {
				var response OrderResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Equal(t, orderID, response.ID)
				assert.Equal(t, "IN_STORE", response.Type)
			}
		})
	}
}

func TestUpdateOrderHandler(t *testing.T) {
	token, userID := setupTestDBForOrders(t)
	ctx := context.Background()

	futureTime := time.Now().Add(24 * time.Hour)
	var orderID int
	err := db.Pool.QueryRow(
		ctx,
		"INSERT INTO orders (user_id, type, datetime, notes) VALUES ($1, $2, $3, $4) RETURNING id",
		userID, "IN_STORE", futureTime, "Original notes",
	).Scan(&orderID)
	require.NoError(t, err)

	newFutureTime := time.Now().Add(48 * time.Hour)
	deliveryType := "DELIVERY"
	updatedNotes := "Updated notes"

	tests := []struct {
		name           string
		orderID        int
		request        UpdateOrderRequest
		expectedStatus int
		expectError    bool
	}{
		{
			name:    "valid order update",
			orderID: orderID,
			request: UpdateOrderRequest{
				Type:     &deliveryType,
				DateTime: &newFutureTime,
				Notes:    &updatedNotes,
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:    "invalid type",
			orderID: orderID,
			request: UpdateOrderRequest{
				Type: stringPtr("INVALID"),
			},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
		{
			name:    "past datetime",
			orderID: orderID,
			request: UpdateOrderRequest{
				DateTime: timePtr(time.Now().Add(-24 * time.Hour)),
			},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
		{
			name:           "non-existent order",
			orderID:        99999,
			request:        UpdateOrderRequest{},
			expectedStatus: http.StatusNotFound,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.request)
			req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/orders/%d", tt.orderID), bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+token)
			w := httptest.NewRecorder()

			auth.AuthMiddleware(UpdateOrderHandler)(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if !tt.expectError && tt.orderID == orderID {
				var response OrderResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				if tt.request.Type != nil {
					assert.Equal(t, *tt.request.Type, response.Type)
				}
				if tt.request.Notes != nil {
					assert.Equal(t, *tt.request.Notes, response.Notes)
				}
			}
		})
	}
}

func stringPtr(s string) *string {
	return &s
}

func timePtr(t time.Time) *time.Time {
	return &t
}
