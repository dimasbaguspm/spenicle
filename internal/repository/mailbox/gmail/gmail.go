// Package gmail is the driven adapter for the Gmail API: it owns the endpoints, the
// pagination and the base64 raw payload, and answers in the intake module's vocabulary.
package gmail

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/mail"
	"net/url"
	"strconv"
	"strings"
	"time"

	telemetry "github.com/dimasbaguspm/spenicle/internal/common/otel"
	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
)

const (
	DefaultEndpoint = "https://gmail.googleapis.com/gmail/v1"

	maxBodyBytes   = 8 << 20
	requestLimit   = 500
	clientTimeout  = 30 * time.Second
	maxDetailBytes = 512
	dateLayout     = "2006/01/02"
)

//go:generate go run go.uber.org/mock/mockgen -source=gmail.go -destination=mocks/gmail.go -package=mocks

type TokenSource interface {
	Token(ctx context.Context) (string, error)
}

type Client struct {
	http   *http.Client
	base   string
	tokens TokenSource
}

func New(httpClient *http.Client, base string, tokens TokenSource) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: clientTimeout}
	}

	if strings.TrimSpace(base) == "" {
		base = DefaultEndpoint
	}

	return &Client{http: httpClient, base: strings.TrimRight(base, "/"), tokens: tokens}
}

var _ intake.Mailbox = (*Client)(nil)

func (c *Client) Source() string { return constant.MailSourceGmail }

func (c *Client) Fetch(ctx context.Context, since time.Time, limit int) ([]intake.Mail, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Gmail.Fetch")
	defer endSpan()

	query := url.Values{
		"q":          {"after:" + since.Format(dateLayout)},
		"maxResults": {strconv.Itoa(clamp(limit))},
	}

	var listed struct {
		Messages []struct {
			ID string `json:"id"`
		} `json:"messages"`
	}

	if err := c.get(ctx, "/users/me/messages", query, &listed); err != nil {
		return nil, err
	}

	out := make([]intake.Mail, 0, len(listed.Messages))

	for _, message := range listed.Messages {
		fetched, err := c.Refresh(ctx, message.ID)
		if err != nil {
			return nil, err
		}

		out = append(out, fetched)
	}

	return out, nil
}

func (c *Client) Refresh(ctx context.Context, messageRef string) (intake.Mail, error) {
	ctx, endSpan := telemetry.StartSpan(ctx, "Repository.Gmail.Refresh")
	defer endSpan()

	//nolint:tagliatelle // the field names are the provider's wire contract
	var message struct {
		ID           string `json:"id"`
		ThreadID     string `json:"threadId"`
		HistoryID    string `json:"historyId"`
		InternalDate string `json:"internalDate"`
		Raw          string `json:"raw"`
	}

	query := url.Values{"format": {"raw"}}

	err := c.get(ctx, "/users/me/messages/"+url.PathEscape(messageRef), query, &message)
	if errors.Is(err, errNotFound) {
		return intake.Mail{}, intake.ErrGone
	}

	if err != nil {
		return intake.Mail{}, err
	}

	raw, err := base64.RawURLEncoding.DecodeString(message.Raw)
	if err != nil {
		return intake.Mail{}, fmt.Errorf("decode raw message: %w", err)
	}

	fetched := intake.Mail{
		Ref:        message.ID,
		ThreadRef:  message.ThreadID,
		Revision:   message.HistoryID,
		ReceivedAt: receivedAt(message.InternalDate),
		Raw:        raw,
	}

	if headers, headerErr := readHeader(raw); headerErr == nil {
		fetched.MessageID = strings.TrimSpace(headers.Get("Message-Id"))
		fetched.Subject = decodeHeader(headers.Get("Subject"))
		fetched.From = strings.ToLower(strings.TrimSpace(headers.Get("From")))
	}

	return fetched, nil
}

func (c *Client) get(ctx context.Context, path string, query url.Values, target any) error {
	token, err := c.tokens.Token(ctx)
	if err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.base+path+"?"+query.Encode(), http.NoBody)
	if err != nil {
		return fmt.Errorf("gmail request: %w", err)
	}

	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Accept", "application/json")

	response, err := c.http.Do(request)
	if err != nil {
		return fmt.Errorf("gmail call: %w", err)
	}

	defer func() { _ = response.Body.Close() }()

	if response.StatusCode == http.StatusNotFound {
		return errNotFound
	}

	if response.StatusCode >= http.StatusMultipleChoices {
		detail, _ := io.ReadAll(io.LimitReader(response.Body, maxDetailBytes))

		return fmt.Errorf("gmail answered %d: %s", response.StatusCode,
			strings.TrimSpace(string(detail)))
	}

	if err := json.NewDecoder(io.LimitReader(response.Body, maxBodyBytes)).Decode(target); err != nil {
		return fmt.Errorf("gmail answer: %w", err)
	}

	return nil
}

var errNotFound = errors.New("gmail message not found")

func readHeader(raw []byte) (mail.Header, error) {
	parsed, err := mail.ReadMessage(bytes.NewReader(raw))
	if err != nil {
		return mail.Header{}, fmt.Errorf("parse mime headers: %w", err)
	}

	return parsed.Header, nil
}

func clamp(limit int) int {
	if limit <= 0 || limit > requestLimit {
		return requestLimit
	}

	return limit
}

func receivedAt(internalDate string) time.Time {
	millis, err := strconv.ParseInt(strings.TrimSpace(internalDate), 10, 64)
	if err != nil {
		return time.Now().UTC()
	}

	return time.UnixMilli(millis).UTC()
}

func decodeHeader(raw string) string {
	decoded, err := new(mime.WordDecoder).DecodeHeader(raw)
	if err != nil {
		return strings.TrimSpace(raw)
	}

	return strings.TrimSpace(decoded)
}
