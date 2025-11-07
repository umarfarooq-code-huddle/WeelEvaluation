package orders

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/weel/backend/internal/db"
)

type CreateOrderRequest struct {
	Type     string    `json:"type"`
	DateTime time.Time `json:"datetime"`
	Notes    string    `json:"notes"`
}

type UpdateOrderRequest struct {
	Type     *string    `json:"type"`
	DateTime *time.Time `json:"datetime"`
	Notes    *string    `json:"notes"`
}

type OrderResponse struct {
	ID       int       `json:"id"`
	UserID   int       `json:"user_id"`
	Type     string    `json:"type"`
	DateTime time.Time `json:"datetime"`
	Notes    string    `json:"notes"`
}

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error   string            `json:"error"`
	Details []ValidationError `json:"details,omitempty"`
}

func validateOrderType(orderType string) *ValidationError {
	if orderType == "" {
		return &ValidationError{
			Field:   "type",
			Message: "type is required",
		}
	}
	if orderType != "IN_STORE" && orderType != "DELIVERY" && orderType != "CURBSIDE" {
		return &ValidationError{
			Field:   "type",
			Message: "type must be one of: IN_STORE, DELIVERY, CURBSIDE",
		}
	}
	return nil
}

func validateDateTime(datetime time.Time) *ValidationError {
	if datetime.IsZero() {
		return &ValidationError{
			Field:   "datetime",
			Message: "datetime is required",
		}
	}
	if datetime.Before(time.Now()) {
		return &ValidationError{
			Field:   "datetime",
			Message: "datetime must be in the future",
		}
	}
	return nil
}

func CreateOrderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userIDStr := r.Header.Get("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusUnauthorized)
		return
	}

	var req CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error: "Invalid request body",
		})
		return
	}

	var validationErrors []ValidationError

	if err := validateOrderType(req.Type); err != nil {
		validationErrors = append(validationErrors, *err)
	}

	if err := validateDateTime(req.DateTime); err != nil {
		validationErrors = append(validationErrors, *err)
	}

	if len(validationErrors) > 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Validation failed",
			Details: validationErrors,
		})
		return
	}

	var orderID int
	err = db.Pool.QueryRow(
		r.Context(),
		"INSERT INTO orders (user_id, type, datetime, notes) VALUES ($1, $2, $3, $4) RETURNING id",
		userID, req.Type, req.DateTime, req.Notes,
	).Scan(&orderID)

	if err != nil {
		http.Error(w, "Failed to create order", http.StatusInternalServerError)
		return
	}

	var order db.Order
	err = db.Pool.QueryRow(
		r.Context(),
		"SELECT id, user_id, type, datetime, notes FROM orders WHERE id = $1",
		orderID,
	).Scan(&order.ID, &order.UserID, &order.Type, &order.DateTime, &order.Notes)

	if err != nil {
		http.Error(w, "Failed to retrieve created order", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(OrderResponse{
		ID:       order.ID,
		UserID:   order.UserID,
		Type:     order.Type,
		DateTime: order.DateTime,
		Notes:    order.Notes,
	})
}

func GetOrderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	orderIDStr := r.URL.Path[len("/orders/"):]
	orderID, err := strconv.Atoi(orderIDStr)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error: "Invalid order ID",
		})
		return
	}

	userIDStr := r.Header.Get("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusUnauthorized)
		return
	}

	var order db.Order
	err = db.Pool.QueryRow(
		r.Context(),
		"SELECT id, user_id, type, datetime, notes FROM orders WHERE id = $1 AND user_id = $2",
		orderID, userID,
	).Scan(&order.ID, &order.UserID, &order.Type, &order.DateTime, &order.Notes)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error: "Order not found",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(OrderResponse{
		ID:       order.ID,
		UserID:   order.UserID,
		Type:     order.Type,
		DateTime: order.DateTime,
		Notes:    order.Notes,
	})
}

func UpdateOrderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	orderIDStr := r.URL.Path[len("/orders/"):]
	orderID, err := strconv.Atoi(orderIDStr)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error: "Invalid order ID",
		})
		return
	}

	userIDStr := r.Header.Get("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusUnauthorized)
		return
	}

	var existingOrder db.Order
	err = db.Pool.QueryRow(
		r.Context(),
		"SELECT id, user_id, type, datetime, notes FROM orders WHERE id = $1 AND user_id = $2",
		orderID, userID,
	).Scan(&existingOrder.ID, &existingOrder.UserID, &existingOrder.Type, &existingOrder.DateTime, &existingOrder.Notes)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error: "Order not found",
		})
		return
	}

	var req UpdateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error: "Invalid request body",
		})
		return
	}

	var validationErrors []ValidationError

	orderType := existingOrder.Type
	if req.Type != nil {
		if err := validateOrderType(*req.Type); err != nil {
			validationErrors = append(validationErrors, *err)
		} else {
			orderType = *req.Type
		}
	}

	orderDateTime := existingOrder.DateTime
	if req.DateTime != nil {
		if err := validateDateTime(*req.DateTime); err != nil {
			validationErrors = append(validationErrors, *err)
		} else {
			orderDateTime = *req.DateTime
		}
	}

	orderNotes := existingOrder.Notes
	if req.Notes != nil {
		orderNotes = *req.Notes
	}

	if len(validationErrors) > 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Validation failed",
			Details: validationErrors,
		})
		return
	}

	_, err = db.Pool.Exec(
		r.Context(),
		"UPDATE orders SET type = $1, datetime = $2, notes = $3 WHERE id = $4 AND user_id = $5",
		orderType, orderDateTime, orderNotes, orderID, userID,
	)

	if err != nil {
		http.Error(w, "Failed to update order", http.StatusInternalServerError)
		return
	}

	var updatedOrder db.Order
	err = db.Pool.QueryRow(
		r.Context(),
		"SELECT id, user_id, type, datetime, notes FROM orders WHERE id = $1",
		orderID,
	).Scan(&updatedOrder.ID, &updatedOrder.UserID, &updatedOrder.Type, &updatedOrder.DateTime, &updatedOrder.Notes)

	if err != nil {
		http.Error(w, "Failed to retrieve updated order", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(OrderResponse{
		ID:       updatedOrder.ID,
		UserID:   updatedOrder.UserID,
		Type:     updatedOrder.Type,
		DateTime: updatedOrder.DateTime,
		Notes:    updatedOrder.Notes,
	})
}
