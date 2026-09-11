package auth

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

const (
	minJWTSecretBytes = 32
	jwtIssuer         = "yurika-blog"
	jwtAudience       = "yurika-client"
)

type Claims struct {
	Sub string `json:"sub"`
	jwt.RegisteredClaims
}

func ExtractBearerToken(header string) string {
	parts := strings.Fields(strings.TrimSpace(header))
	if len(parts) != 2 {
		return ""
	}
	if !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}

func ParseUserIDFromToken(tokenString string) (string, error) {
	if strings.TrimSpace(tokenString) == "" {
		return "", errors.New("missing token")
	}
	secret, err := configuredSecret()
	if err != nil {
		return "", err
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing algorithm: %s", token.Method.Alg())
		}
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithIssuer(jwtIssuer), jwt.WithAudience(jwtAudience))
	if err != nil {
		return "", err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid || strings.TrimSpace(claims.Sub) == "" {
		return "", errors.New("invalid token claims")
	}

	return claims.Sub, nil
}

func ValidateConfiguration() error {
	_, err := configuredSecret()
	return err
}

func configuredSecret() (string, error) {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if len(secret) < minJWTSecretBytes {
		return "", fmt.Errorf("JWT_SECRET must be configured with at least %d bytes", minJWTSecretBytes)
	}
	return secret, nil
}
