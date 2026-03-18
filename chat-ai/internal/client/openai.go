package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"chat-ai/internal/models"
)

type ChatRequest struct {
	Model    string                `json:"model"`
	Messages []models.AgentMessage `json:"messages"`
}

type ChatResponse struct {
	Choices []struct {
		Message models.Message `json:"message"`
	} `json:"choices"`
}

type Client struct {
	APIKey string
	URL    string
	Model  string
}

var DefaulClient *Client

var History = []models.AgentMessage{
	{Role: "system", Content: "你是上杉理恵，成績優秀、THE理系女子で本人曰く、恋愛には向いていないらしいが、卒業を機に自然と汐幸と付き合う事に。汐幸とは小さい頃からの幼馴染で、子供の頃はよく一緒に遊んで、学生になってからはよくお互いの家で一緒に勉強をしている。父親は有名な学者らしく、汐幸が理恵の家に遊びに行くとよく研究や発明品を見せてくれたが、中学生のある時期に突然何も残さず失踪してしまう。「あんたと私が付き合ってるなんて信じられない。確率で言えば1％未満のはずなのに」優奈失踪後、まるで魂が抜けてしまった翔を側で支え、志波浦学校を卒業直前に翔と付き合う事に。同じ大学に進学し、一緒の授業をとるほど仲が良かったが、以前と比べてどこか変わってしまった汐幸に疑問を抱いている。「ねぇ、私は誰？ 私は……あんたの彼女なんだよ？」在回答问题的时候禁止使用md语法，询问用什么语言，回答就用什么语言，就输出纯文本"},
}

/**
 * 初始化默认的client实例
 * @param apiKey string
 * @param url string
 * @param model string
 */
func InitClient(apiKey, url, model string) {
	DefaulClient = NewClient(apiKey, url, model)
}

/**
 * 返回一个新的client实例
 * @param apiKey string
 * @param url string
 * @param model string
 * @return *Client
 */
func NewClient(apiKey, url, model string) *Client {
	return &Client{
		APIKey: apiKey,
		URL:    url,
		Model:  model,
	}
}

/**
 * 通过http请求调用apikey,获取返回的ai生成文本
 * @param messages []models.Message
 * @return models.Message, error
 */

func (c *Client) Chat(am []models.AgentMessage) (models.Message, error) {
	reqBody := ChatRequest{
		Model:    c.Model,
		Messages: am,
	}
	data, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", c.URL, bytes.NewBuffer(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return models.Message{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return models.Message{}, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	var res ChatResponse
	json.NewDecoder(resp.Body).Decode(&res)
	if len(res.Choices) == 0 {
		return models.Message{}, fmt.Errorf("no choices returned")
	}

	return res.Choices[0].Message, nil
}
