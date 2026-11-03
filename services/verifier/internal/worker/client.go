package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/yyyuvvvraj/apivault/services/verifier/internal/verifier"
)

type Job struct {
	ID          string `json:"id"`
	HomepageURL string `json:"homepageUrl"`
}

type jobsResponse struct {
	Jobs []Job `json:"jobs"`
}

type Client struct {
	baseURL     string
	secret      string
	concurrency int
	httpClient  *http.Client
}

func NewClient(baseURL, secret string, concurrency int) *Client {
	return &Client{
		baseURL:     strings.TrimRight(baseURL, "/"),
		secret:      secret,
		concurrency: concurrency,
		httpClient:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Client) request(ctx context.Context, method, endpoint string, body io.Reader) (*http.Response, error) {
	request, err := http.NewRequestWithContext(ctx, method, c.baseURL+endpoint, body)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Authorization", "Bearer "+c.secret)
	request.Header.Set("Accept", "application/json")
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	return c.httpClient.Do(request)
}

func (c *Client) fetchJobs(ctx context.Context, offset, limit int) ([]Job, error) {
	query := url.Values{}
	query.Set("limit", strconv.Itoa(limit))
	query.Set("offset", strconv.Itoa(offset))
	response, err := c.request(ctx, http.MethodGet, "/api/internal/verifier/jobs?"+query.Encode(), nil)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("jobs endpoint returned HTTP %d", response.StatusCode)
	}
	var result jobsResponse
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&result); err != nil {
		return nil, err
	}
	return result.Jobs, nil
}

func (c *Client) sendResult(ctx context.Context, result verifier.Result) error {
	payload, err := json.Marshal(result)
	if err != nil {
		return err
	}
	response, err := c.request(ctx, http.MethodPost, "/api/internal/verifier/results", strings.NewReader(string(payload)))
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusCreated {
		return fmt.Errorf("result endpoint returned HTTP %d", response.StatusCode)
	}
	return nil
}

func (c *Client) Scan(ctx context.Context) error {
	const pageSize = 100
	for offset := 0; ; offset += pageSize {
		jobs, err := c.fetchJobs(ctx, offset, pageSize)
		if err != nil {
			return fmt.Errorf("fetch jobs at offset %d: %w", offset, err)
		}
		if len(jobs) == 0 {
			return nil
		}

		semaphore := make(chan struct{}, c.concurrency)
		var wait sync.WaitGroup
		var firstErr error
		var errOnce sync.Once
		for _, job := range jobs {
			if job.ID == "" || job.HomepageURL == "" {
				continue
			}
			wait.Add(1)
			go func(job Job) {
				defer wait.Done()
				select {
				case semaphore <- struct{}{}:
				case <-ctx.Done():
					errOnce.Do(func() { firstErr = ctx.Err() })
					return
				}
				defer func() { <-semaphore }()

				checkCtx, cancel := context.WithTimeout(ctx, 12*time.Second)
				defer cancel()
				result := verifier.Check(checkCtx, job.ID, job.HomepageURL)
				if err := c.sendResult(ctx, result); err != nil {
					errOnce.Do(func() { firstErr = fmt.Errorf("persist result for API %s: %w", job.ID, err) })
				}
			}(job)
		}
		wait.Wait()
		if firstErr != nil {
			return firstErr
		}
		if len(jobs) < pageSize {
			return nil
		}
	}
}
