package gmail_test

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"go.uber.org/mock/gomock"

	"github.com/dimasbaguspm/spenicle/internal/constant"
	"github.com/dimasbaguspm/spenicle/internal/module/intake"
	"github.com/dimasbaguspm/spenicle/internal/repository/mailbox/gmail"
	"github.com/dimasbaguspm/spenicle/internal/repository/mailbox/gmail/mocks"
)

const (
	rawMessage = "From: Alice <Alice@Example.COM>\r\n" +
		"To: me@example.com\r\n" +
		"Subject: =?UTF-8?B?Q2Fmw6kgY2hhcmdl?=\r\n" +
		"Message-Id: <a@example.com>\r\n" +
		"Date: Thu, 20 Nov 2025 16:00:00 +0000\r\n" +
		"\r\n" +
		"Coffee 25000\r\n"

	internalDate = "1763654400000"
)

type request struct {
	path   string
	query  map[string]string
	bearer string
	accept string
}

type recorder struct {
	requests []request
}

func (r *recorder) last() request {
	return r.requests[len(r.requests)-1]
}

// reply answers one request with a status and a JSON body.
type reply func(r *http.Request) (int, string)

func newClient(t *testing.T, respond reply) (*gmail.Client, *recorder) {
	t.Helper()

	seen := &recorder{}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query := map[string]string{}
		for key := range r.URL.Query() {
			query[key] = r.URL.Query().Get(key)
		}

		seen.requests = append(seen.requests, request{
			path:   r.URL.EscapedPath(),
			query:  query,
			bearer: strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "),
			accept: r.Header.Get("Accept"),
		})

		status, body := respond(r)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(server.Close)

	tokens := mocks.NewMockTokenSource(gomock.NewController(t))
	tokens.EXPECT().Token(gomock.Any()).Return("ya29.token", nil).AnyTimes()

	return gmail.New(nil, server.URL, tokens), seen
}

func encodedMessage(id string) string {
	raw := base64.RawURLEncoding.EncodeToString([]byte(rawMessage))

	return fmt.Sprintf(`{"id":%q,"threadId":%q,"historyId":"42","internalDate":%q,"raw":%q}`,
		id, "thread-"+id, internalDate, raw)
}

func listingSince() time.Time {
	return time.Date(2026, time.November, 20, 9, 0, 0, 0, time.UTC)
}

func newFetchClient(t *testing.T) (*gmail.Client, *recorder) {
	t.Helper()

	return newClient(t, func(r *http.Request) (int, string) {
		if r.URL.Path == "/users/me/messages" {
			return http.StatusOK, `{"messages":[{"id":"m1"},{"id":"m2"}]}`
		}

		return http.StatusOK, encodedMessage(strings.TrimPrefix(r.URL.Path, "/users/me/messages/"))
	})
}

func TestSourceNamesTheProvider(t *testing.T) {
	tokens := mocks.NewMockTokenSource(gomock.NewController(t))

	if got := gmail.New(nil, "", tokens).Source(); got != constant.MailSourceGmail {
		t.Fatalf("source = %q, want %q", got, constant.MailSourceGmail)
	}
}

func TestFetchListsTheInboxThenReadsEveryMessage(t *testing.T) {
	client, seen := newFetchClient(t)

	if _, err := client.Fetch(t.Context(), listingSince(), 0); err != nil {
		t.Fatalf("fetch: %v", err)
	}

	if len(seen.requests) != 3 {
		t.Fatalf("requests = %d, want one listing and one read per message", len(seen.requests))
	}

	listing := seen.requests[0]
	if listing.path != "/users/me/messages" {
		t.Fatalf("listing path = %q", listing.path)
	}

	if got := listing.query["q"]; got != "after:2026/11/20" {
		t.Fatalf("q = %q, want the vendor date layout", got)
	}

	if got := listing.query["maxResults"]; got != "500" {
		t.Fatalf("maxResults = %q", got)
	}

	if listing.bearer != "ya29.token" {
		t.Fatalf("authorization = %q, want the token source value", listing.bearer)
	}

	if listing.accept != "application/json" {
		t.Fatalf("accept = %q", listing.accept)
	}

	read := seen.requests[1]
	if read.path != "/users/me/messages/m1" {
		t.Fatalf("read path = %q", read.path)
	}

	if got := read.query["format"]; got != "raw" {
		t.Fatalf("format = %q, want raw", got)
	}
}

func TestFetchParsesEveryMessageItReads(t *testing.T) {
	client, _ := newFetchClient(t)

	mail, err := client.Fetch(t.Context(), listingSince(), 0)
	if err != nil {
		t.Fatalf("fetch: %v", err)
	}

	if len(mail) != 2 {
		t.Fatalf("mail = %+v, want two messages", mail)
	}

	fields := []struct {
		name string
		got  string
		want string
	}{
		{name: "ref", got: mail[0].Ref, want: "m1"},
		{name: "thread ref", got: mail[0].ThreadRef, want: "thread-m1"},
		{name: "revision", got: mail[0].Revision, want: "42"},
		{name: "message id", got: mail[0].MessageID, want: "<a@example.com>"},
		{name: "subject", got: mail[0].Subject, want: "Café charge"},
		{name: "from", got: mail[0].From, want: "alice <alice@example.com>"},
		{name: "raw", got: string(mail[0].Raw), want: rawMessage},
		{name: "second ref", got: mail[1].Ref, want: "m2"},
	}

	for _, field := range fields {
		if field.got != field.want {
			t.Fatalf("%s = %q, want %q", field.name, field.got, field.want)
		}
	}

	if want := time.UnixMilli(1763654400000).UTC(); !mail[0].ReceivedAt.Equal(want) {
		t.Fatalf("received at = %s, want %s", mail[0].ReceivedAt, want)
	}
}

func TestFetchClampsThePageSize(t *testing.T) {
	tests := []struct {
		name  string
		limit int
		want  string
	}{
		{name: "zero reads the documented ceiling", limit: 0, want: "500"},
		{name: "negative reads the documented ceiling", limit: -7, want: "500"},
		{name: "above the ceiling reads the ceiling", limit: 5000, want: "500"},
		{name: "exactly the ceiling is honoured", limit: 500, want: "500"},
		{name: "a small page is honoured", limit: 25, want: "25"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			client, seen := newClient(t, func(*http.Request) (int, string) {
				return http.StatusOK, `{"messages":[]}`
			})

			if _, err := client.Fetch(t.Context(), time.Now(), tc.limit); err != nil {
				t.Fatalf("fetch: %v", err)
			}

			if got := seen.last().query["maxResults"]; got != tc.want {
				t.Fatalf("maxResults = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestFetchAnswersAnEmptySliceForAnEmptyInbox(t *testing.T) {
	client, _ := newClient(t, func(*http.Request) (int, string) {
		return http.StatusOK, `{"messages":[]}`
	})

	mail, err := client.Fetch(t.Context(), time.Now(), 10)
	if err != nil {
		t.Fatalf("fetch: %v", err)
	}

	if mail == nil {
		t.Fatal("an empty inbox must answer [] rather than nil")
	}

	if len(mail) != 0 {
		t.Fatalf("mail = %+v, want none", mail)
	}
}

func TestFetchReturnsTheListingFailure(t *testing.T) {
	client, _ := newClient(t, func(*http.Request) (int, string) {
		return http.StatusInternalServerError, `{"error":"backend gone"}`
	})

	_, err := client.Fetch(t.Context(), time.Now(), 10)
	if err == nil {
		t.Fatal("a 500 must fail the poll")
	}

	if !strings.Contains(err.Error(), "500") || !strings.Contains(err.Error(), "backend gone") {
		t.Fatalf("err = %v, want the status and the vendor detail", err)
	}
}

func TestFetchStopsWhenOneMessageIsGone(t *testing.T) {
	client, seen := newClient(t, func(r *http.Request) (int, string) {
		switch r.URL.Path {
		case "/users/me/messages":
			return http.StatusOK, `{"messages":[{"id":"m1"},{"id":"m2"}]}`
		case "/users/me/messages/m1":
			return http.StatusNotFound, `{"error":"not found"}`
		default:
			return http.StatusOK, encodedMessage("m2")
		}
	})

	_, err := client.Fetch(t.Context(), time.Now(), 10)
	if !errors.Is(err, intake.ErrGone) {
		t.Fatalf("err = %v, want intake.ErrGone", err)
	}

	if len(seen.requests) != 2 {
		t.Fatalf("requests = %d, want the listing plus the missing read only", len(seen.requests))
	}
}

func TestRefreshReportsAMissingMessageAsGone(t *testing.T) {
	client, _ := newClient(t, func(*http.Request) (int, string) {
		return http.StatusNotFound, `{"error":{"code":404}}`
	})

	if _, err := client.Refresh(t.Context(), "m1"); !errors.Is(err, intake.ErrGone) {
		t.Fatalf("err = %v, want intake.ErrGone", err)
	}
}

func TestRefreshReportsAMalformedAnswer(t *testing.T) {
	client, _ := newClient(t, func(*http.Request) (int, string) {
		return http.StatusOK, `not json`
	})

	_, err := client.Refresh(t.Context(), "m1")
	if err == nil || !strings.Contains(err.Error(), "gmail answer") {
		t.Fatalf("err = %v, want the answer to be wrapped", err)
	}
}

func TestRefreshRejectsAnUndecodablePayload(t *testing.T) {
	client, _ := newClient(t, func(*http.Request) (int, string) {
		return http.StatusOK, `{"id":"m1","raw":"!!!not base64!!!"}`
	})

	_, err := client.Refresh(t.Context(), "m1")
	if err == nil || !strings.Contains(err.Error(), "decode raw message") {
		t.Fatalf("err = %v, want the decode to be refused", err)
	}
}

func TestRefreshKeepsWhatItCanRead(t *testing.T) {
	tests := []struct {
		name        string
		headers     string
		wantSubject string
		wantFrom    string
		wantID      string
	}{
		{
			name:        "a plain message keeps its headers",
			headers:     "From: Alice <alice@example.com>\r\nSubject: Coffee beans\r\nMessage-Id: <a@example.com>\r\n",
			wantSubject: "Coffee beans",
			wantFrom:    "alice <alice@example.com>",
			wantID:      "<a@example.com>",
		},
		{
			name:        "an encoded subject is decoded",
			headers:     "From: alice@example.com\r\nSubject: =?UTF-8?B?Q2Fmw6kgY2hhcmdl?=\r\nMessage-Id: <b@example.com>\r\n",
			wantSubject: "Café charge",
			wantFrom:    "alice@example.com",
			wantID:      "<b@example.com>",
		},
		{
			name:        "an invalid payload is passed through unchanged",
			headers:     "From: alice@example.com\r\nSubject: =?UTF-8?B?!!!?=\r\nMessage-Id: <c@example.com>\r\n",
			wantSubject: "=?UTF-8?B?!!!?=",
			wantFrom:    "alice@example.com",
			wantID:      "<c@example.com>",
		},
		{
			name:        "an unhandled charset falls back to the raw header",
			headers:     "From: alice@example.com\r\nSubject: =?bogus-charset?B?YWJj?=\r\nMessage-Id: <d@example.com>\r\n",
			wantSubject: "=?bogus-charset?B?YWJj?=",
			wantFrom:    "alice@example.com",
			wantID:      "<d@example.com>",
		},
		{
			name:        "a message without headers is still a mail",
			headers:     "this-line-has-no-colon\r\n",
			wantSubject: "",
			wantFrom:    "",
			wantID:      "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			raw := base64.RawURLEncoding.EncodeToString([]byte(tc.headers + "\r\nCoffee 25000\r\n"))

			client, _ := newClient(t, func(*http.Request) (int, string) {
				return http.StatusOK, fmt.Sprintf(`{"id":"m1","threadId":"t1","historyId":"7",
					"internalDate":%q,"raw":%q}`, internalDate, raw)
			})

			mail, err := client.Refresh(t.Context(), "m1")
			if err != nil {
				t.Fatalf("refresh: %v", err)
			}

			if mail.Subject != tc.wantSubject {
				t.Fatalf("subject = %q, want %q", mail.Subject, tc.wantSubject)
			}

			if mail.From != tc.wantFrom {
				t.Fatalf("from = %q, want %q", mail.From, tc.wantFrom)
			}

			if mail.MessageID != tc.wantID {
				t.Fatalf("message id = %q, want %q", mail.MessageID, tc.wantID)
			}

			if mail.Ref != "m1" || mail.ThreadRef != "t1" || mail.Revision != "7" {
				t.Fatalf("mail = %+v", mail)
			}
		})
	}
}

func TestRefreshFallsBackToNowWhenTheDateIsNotAMillisecondStamp(t *testing.T) {
	client, _ := newClient(t, func(*http.Request) (int, string) {
		return http.StatusOK, `{"id":"m1","internalDate":"not-a-number"}`
	})

	before := time.Now().Add(-time.Minute)

	mail, err := client.Refresh(t.Context(), "m1")
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}

	if mail.ReceivedAt.Before(before) || mail.ReceivedAt.After(time.Now().Add(time.Minute)) {
		t.Fatalf("received at = %s, want roughly now", mail.ReceivedAt)
	}
}

func TestATokenFailureStopsBeforeTheRequest(t *testing.T) {
	var calls int

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls++

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"messages":[]}`))
	}))
	t.Cleanup(server.Close)

	tokens := mocks.NewMockTokenSource(gomock.NewController(t))
	tokens.EXPECT().Token(gomock.Any()).Return("", errors.New("refresh token expired")).Times(1)

	client := gmail.New(nil, server.URL, tokens)

	if _, err := client.Fetch(t.Context(), time.Now(), 10); err == nil ||
		!strings.Contains(err.Error(), "refresh token expired") {
		t.Fatalf("err = %v, want the token failure", err)
	}

	if calls != 0 {
		t.Fatalf("vendor calls = %d, want none without a token", calls)
	}
}

func TestAVendorCallFailureIsWrapped(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	tokens := mocks.NewMockTokenSource(gomock.NewController(t))
	tokens.EXPECT().Token(gomock.Any()).Return("t", nil).AnyTimes()

	client := gmail.New(nil, server.URL, tokens)

	server.Close()

	_, err := client.Refresh(t.Context(), "m1")
	if err == nil || !strings.Contains(err.Error(), "gmail call") {
		t.Fatalf("err = %v, want the transport failure", err)
	}
}

func TestAnUnusableBaseFailsBeforeTheVendorIsReached(t *testing.T) {
	tokens := mocks.NewMockTokenSource(gomock.NewController(t))
	tokens.EXPECT().Token(gomock.Any()).Return("t", nil).AnyTimes()

	client := gmail.New(nil, "://bad", tokens)

	_, err := client.Fetch(t.Context(), time.Now(), 10)
	if err == nil || !strings.Contains(err.Error(), "gmail request") {
		t.Fatalf("err = %v, want the request to be refused", err)
	}
}

func TestTheBaseURLIsTrimmedAndTheRefIsEscaped(t *testing.T) {
	var paths []string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		paths = append(paths, r.URL.EscapedPath())

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"a/b"}`))
	}))
	t.Cleanup(server.Close)

	tokens := mocks.NewMockTokenSource(gomock.NewController(t))
	tokens.EXPECT().Token(gomock.Any()).Return("t", nil).AnyTimes()

	client := gmail.New(nil, server.URL+"/", tokens)

	if _, err := client.Refresh(t.Context(), "a/b"); err != nil {
		t.Fatalf("refresh: %v", err)
	}

	if len(paths) != 1 || paths[0] != "/users/me/messages/a%2Fb" {
		t.Fatalf("path = %v, want one escaped call", paths)
	}
}

func TestFetchAndRefreshOpenTheirOwnSpans(t *testing.T) {
	client, _ := newClient(t, func(r *http.Request) (int, string) {
		if r.URL.Path == "/users/me/messages" {
			return http.StatusOK, `{"messages":[{"id":"m1"}]}`
		}

		return http.StatusOK, encodedMessage("m1")
	})

	recorder := tracetest.NewSpanRecorder()
	provider := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder))

	previous := otel.GetTracerProvider()

	otel.SetTracerProvider(provider)
	t.Cleanup(func() { otel.SetTracerProvider(previous) })

	if _, err := client.Fetch(t.Context(), time.Now(), 10); err != nil {
		t.Fatalf("fetch: %v", err)
	}

	ended := map[string]bool{}
	for _, span := range recorder.Ended() {
		ended[span.Name()] = true
	}

	for _, want := range []string{"Repository.Gmail.Fetch", "Repository.Gmail.Refresh"} {
		if !ended[want] {
			t.Fatalf("span %q missing; got %v", want, ended)
		}
	}
}
