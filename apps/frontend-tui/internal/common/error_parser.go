package common

import (
	"encoding/json"
	"strings"

	"github.com/dimasbaguspm/spenicle-tui/internal/models"
)

func ParseErrorDetail(errStr string) string {
	parts := strings.Split(errStr, ": ")
	if len(parts) < 2 {
		return errStr
	}
	jsonStr := parts[1]
	var er models.ErrorResponse
	if err := json.Unmarshal([]byte(jsonStr), &er); err != nil {
		return errStr
	}
	return er.Detail
}
