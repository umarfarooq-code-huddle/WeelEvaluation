package orders

import (
	"net/http"
	"strings"

	"github.com/weel/backend/internal/auth"
)

func OrderRouter(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	if path == "/orders" && r.Method == http.MethodPost {
		auth.AuthMiddleware(CreateOrderHandler)(w, r)
		return
	}

	if strings.HasPrefix(path, "/orders/") {
		orderIDPath := path[len("/orders/"):]
		if orderIDPath != "" {
			switch r.Method {
			case http.MethodGet:
				auth.AuthMiddleware(GetOrderHandler)(w, r)
				return
			case http.MethodPut:
				auth.AuthMiddleware(UpdateOrderHandler)(w, r)
				return
			}
		}
	}

	http.NotFound(w, r)
}
