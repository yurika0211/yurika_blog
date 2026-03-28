package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

type EmbeddingClient struct {
	APIKey string
	URL    string
	Model  string
}

type embeddingRequest struct {
	Model string `json:"model"`
	Input string `json:"input"`
}

type embeddingResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
	} `json:"data"`
}

func NewEmbeddingClient(apiKey, url, model string) *EmbeddingClient {
	return &EmbeddingClient{APIKey: apiKey, URL: url, Model: model}
}

func (c *EmbeddingClient) Embed(text string) ([]float32, error) {
	body := embeddingRequest{Model: c.Model, Input: text}
	data, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", c.URL, bytes.NewBuffer(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("embedding HTTP %d", resp.StatusCode)
	}

	var out embeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	if len(out.Data) == 0 {
		return nil, fmt.Errorf("no embedding data")
	}
	return out.Data[0].Embedding, nil
}
