package models

type Config struct {
	APIKey string `json:"api_key"`
	APIURL string `json:"api_url"`
	Model  string `json:"model"`
}
