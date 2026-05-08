package auth

import (
	"errors"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

const JWTSecret = "shiokou"

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

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(JWTSecret), nil
	})
	if err != nil {
		return "", err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid || strings.TrimSpace(claims.Sub) == "" {
		return "", errors.New("invalid token claims")
	}

	return claims.Sub, nil
}
