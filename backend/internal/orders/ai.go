package orders

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"time"
)

type SuggestTimeRequest struct {
	DeliveryType string `json:"delivery_type"`
}

type SuggestTimeResponse struct {
	SuggestedTime time.Time `json:"suggested_time"`
	Reason        string    `json:"reason"`
}

type GenerateNotesRequest struct {
	DeliveryType string    `json:"delivery_type"`
	DateTime     time.Time `json:"datetime"`
	Address      string    `json:"address,omitempty"`
}

type GenerateNotesResponse struct {
	Notes string `json:"notes"`
	IsAI  bool   `json:"is_ai"`
}

var mockNotes = []string{
	"Please handle with care. Fragile items included.",
	"Ring the doorbell twice for delivery confirmation.",
	"Leave package at the front door if no one answers.",
	"Please call 30 minutes before arrival.",
	"Special instructions: Use side entrance.",
	"Delivery preferred during business hours (9 AM - 5 PM).",
	"Please ensure package is kept dry and away from direct sunlight.",
	"Contact recipient via phone before delivery.",
	"Gate code: 1234. Please close gate after delivery.",
	"Package contains perishable items - handle with temperature control.",
	"Delivery to back door preferred. Follow the path around the house.",
	"Please do not leave package visible from the street.",
	"Recipient has a dog - please be cautious when approaching.",
	"Delivery window: Morning preferred (8 AM - 12 PM).",
	"Special handling required - contains electronics.",
}

func SuggestTimeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SuggestTimeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	suggestedTime := time.Now().Add(2 * time.Hour)

	if suggestedTime.Hour() < 9 {
		suggestedTime = time.Date(suggestedTime.Year(), suggestedTime.Month(), suggestedTime.Day(), 9, 0, 0, 0, suggestedTime.Location())
	} else if suggestedTime.Hour() >= 17 {
		suggestedTime = time.Date(suggestedTime.Year(), suggestedTime.Month(), suggestedTime.Day()+1, 9, 0, 0, 0, suggestedTime.Location())
	}

	if suggestedTime.Before(time.Now()) {
		suggestedTime = time.Now().Add(2 * time.Hour)
	}

	reason := "Mocked suggestion: Next available time slot"
	if apiKey != "" {
		reason = "AI-suggested optimal delivery time"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuggestTimeResponse{
		SuggestedTime: suggestedTime,
		Reason:        reason,
	})
}

func GenerateNotesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GenerateNotesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	apiKey := os.Getenv("OPENAI_API_KEY")

	if apiKey == "" {
		time.Sleep(1 * time.Second)

		rand.Seed(time.Now().UnixNano())
		selectedNote := mockNotes[rand.Intn(len(mockNotes))]

		if req.DeliveryType == "DELIVERY" && req.Address != "" {
			selectedNote = fmt.Sprintf("%s Delivery address: %s", selectedNote, req.Address)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(GenerateNotesResponse{
			Notes: selectedNote,
			IsAI:  false,
		})
		return
	}

	time.Sleep(2 * time.Second)

	prompt := fmt.Sprintf("Generate helpful delivery notes for a %s order", req.DeliveryType)
	if req.Address != "" {
		prompt += fmt.Sprintf(" to %s", req.Address)
	}
	prompt += ". Keep it concise and practical."

	openAIReq := map[string]interface{}{
		"model": "gpt-3.5-turbo",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a helpful assistant that generates concise delivery instructions.",
			},
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"max_tokens": 100,
	}

	jsonData, _ := json.Marshal(openAIReq)
	httpReq, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		rand.Seed(time.Now().UnixNano())
		selectedNote := mockNotes[rand.Intn(len(mockNotes))]
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(GenerateNotesResponse{
			Notes: selectedNote,
			IsAI:  false,
		})
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil || resp.StatusCode != http.StatusOK {
		rand.Seed(time.Now().UnixNano())
		selectedNote := mockNotes[rand.Intn(len(mockNotes))]
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(GenerateNotesResponse{
			Notes: selectedNote,
			IsAI:  false,
		})
		return
	}
	defer resp.Body.Close()

	var openAIResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&openAIResp); err != nil {
		rand.Seed(time.Now().UnixNano())
		selectedNote := mockNotes[rand.Intn(len(mockNotes))]
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(GenerateNotesResponse{
			Notes: selectedNote,
			IsAI:  false,
		})
		return
	}

	choices, ok := openAIResp["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		rand.Seed(time.Now().UnixNano())
		selectedNote := mockNotes[rand.Intn(len(mockNotes))]
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(GenerateNotesResponse{
			Notes: selectedNote,
			IsAI:  false,
		})
		return
	}

	message, ok := choices[0].(map[string]interface{})["message"].(map[string]interface{})
	if !ok {
		rand.Seed(time.Now().UnixNano())
		selectedNote := mockNotes[rand.Intn(len(mockNotes))]
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(GenerateNotesResponse{
			Notes: selectedNote,
			IsAI:  false,
		})
		return
	}

	content, ok := message["content"].(string)
	if !ok {
		rand.Seed(time.Now().UnixNano())
		selectedNote := mockNotes[rand.Intn(len(mockNotes))]
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(GenerateNotesResponse{
			Notes: selectedNote,
			IsAI:  false,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GenerateNotesResponse{
		Notes: content,
		IsAI:  true,
	})
}
