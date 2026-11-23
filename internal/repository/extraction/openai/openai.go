// Package openai is the OpenAI rail: one vision call per document, the model's answer
// parsed into the unified extraction.Report. It owns the SDK's shape; nothing upstream
// knows OpenAI exists.
//
// It is a single-shot rail (there is nothing to poll), so Poll returns
// extraction.ErrNoPolling and a capture never lands in `extracting` because of it.
package openai

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"github.com/openai/openai-go/shared"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/repository/extraction"
)

const RailName = "openai"

var ErrNotConfigured = errors.New("openai rail is not configured")

const instructions = `You read a receipt or a bank notification and reply with ONE JSON object.
Use these keys when you can see them: total (minor units, string), currency (ISO 4217),
occurred_on (YYYY-MM-DD), merchant (string), reference (string), card_last4 (string).
Never invent a value: omit a key you cannot read. Reply with JSON only, no prose.`

type Client struct {
	client openai.Client
	model  string
}

func New(apiKey, model, baseURL string, timeout time.Duration) (*Client, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, ErrNotConfigured
	}

	if strings.TrimSpace(model) == "" {
		return nil, errors.New("openai model is required")
	}

	options := []option.RequestOption{
		option.WithAPIKey(apiKey),
		option.WithHTTPClient(&http.Client{Timeout: timeout}),
	}

	if strings.TrimSpace(baseURL) != "" {
		options = append(options, option.WithBaseURL(baseURL))
	}

	return &Client{client: openai.NewClient(options...), model: model}, nil
}

func (c *Client) Rail() string { return RailName }

func (c *Client) Model() string { return c.model }

func (c *Client) Poll(context.Context, string) (extraction.Report, error) {
	return extraction.Report{}, fmt.Errorf("openai: %w", extraction.ErrNoPolling)
}

func (c *Client) Submit(
	ctx context.Context,
	artifact extraction.Artifact,
) (extraction.Report, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.OpenAI.Posting")
	defer endSpan()

	if len(artifact.Bytes) == 0 {
		return extraction.Report{}, errors.New("openai: empty artifact")
	}

	contentType := artifact.ContentType
	if contentType == "" {
		contentType = "image/jpeg"
	}

	dataURL := "data:" + contentType + ";base64," +
		base64.StdEncoding.EncodeToString(artifact.Bytes)

	completion, err := c.client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: c.model,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(instructions),
			openai.UserMessage([]openai.ChatCompletionContentPartUnionParam{
				openai.TextContentPart("Extract the fields from this document."),
				openai.ImageContentPart(openai.ChatCompletionContentPartImageImageURLParam{
					URL: dataURL,
				}),
			}),
		},
		ResponseFormat: openai.ChatCompletionNewParamsResponseFormatUnion{
			OfJSONObject: &shared.ResponseFormatJSONObjectParam{},
		},
	})
	if err != nil {
		return extraction.Report{}, fmt.Errorf("openai: chat completion: %w", err)
	}

	if len(completion.Choices) == 0 {
		return extraction.Report{}, errors.New("openai: model answered nothing")
	}

	content := strings.TrimSpace(completion.Choices[0].Message.Content)

	data, err := normalise(content)
	if err != nil {
		return extraction.Report{}, err
	}

	return extraction.Report{
		Rail:   RailName,
		Model:  c.model,
		Status: extraction.StatusCompleted,
		Data:   data,
		Valid:  true,
	}, nil
}

func normalise(content string) (json.RawMessage, error) {
	cleaned := strings.TrimSpace(strings.TrimPrefix(content, "```json"))
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var probe map[string]any
	if err := json.Unmarshal([]byte(cleaned), &probe); err != nil {
		return nil, fmt.Errorf("openai: answer is not a JSON object: %w", err)
	}

	return json.RawMessage(cleaned), nil
}
