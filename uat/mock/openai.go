package main

import (
	"net/http"

	"github.com/dimasbaguspm/spenicle/internal/common/httpx"
)

const (
	openAIPath       = "/v1/ok/chat/completions"
	openAIDownPath   = "/v1/down/chat/completions"
	openAIBrokenPath = "/v1/malformed/chat/completions"
	openAIModel      = "gpt-4o-mini"
	openAIAnswer     = `{"total":"25000","merchant":"KOPI KENANGAN"}`
	openAIBabble     = "Sorry, I cannot read this receipt."
)

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIChoice struct {
	Index        int           `json:"index"`
	Message      openAIMessage `json:"message"`
	FinishReason string        `json:"finish_reason"`
}

type openAICompletion struct {
	ID      string         `json:"id"`
	Object  string         `json:"object"`
	Created int64          `json:"created"`
	Model   string         `json:"model"`
	Choices []openAIChoice `json:"choices"`
}

func registerOpenAI(mux *http.ServeMux) {
	mux.HandleFunc("POST "+openAIPath, handleOpenAI)
	mux.HandleFunc("POST "+openAIDownPath, handleDown)
	mux.HandleFunc("POST "+openAIBrokenPath, handleBabble)
}

func handleOpenAI(w http.ResponseWriter, _ *http.Request) {
	writeAnswer(w, openAIAnswer)
}

func handleBabble(w http.ResponseWriter, _ *http.Request) {
	writeAnswer(w, openAIBabble)
}

func writeAnswer(w http.ResponseWriter, content string) {
	httpx.WriteJSON(w, http.StatusOK, openAICompletion{
		ID:      "chatcmpl-uat",
		Object:  "chat.completion",
		Created: 1,
		Model:   openAIModel,
		Choices: []openAIChoice{{
			Index:        0,
			Message:      openAIMessage{Role: "assistant", Content: content},
			FinishReason: "stop",
		}},
	})
}
