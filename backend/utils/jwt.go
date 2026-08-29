package utils

import (
	"crypto/rand"
	"errors"
	"log"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"powersmart-backend/model"
)

const (
	jwtIssuer   = "powersmart-kenya"
	jwtAudience = "powersmart-portal"
)

var (
	jwtSecret      []byte
	jwtSecretOnce  sync.Once
)

// loadSecret reads the JWT signing key from the environment. It runs lazily on
// first token operation so that config.LoadEnv() (which loads .env) has already
// run — reading JWT_SECRET inside a package init() would always see an empty
// value because package initialisation happens before main().
func loadSecret() {
	jwtSecretOnce.Do(func() {
		secret := os.Getenv("JWT_SECRET")
		env := os.Getenv("APP_ENV")

		switch {
		case secret != "":
			jwtSecret = []byte(secret)
		case env == "production":
			log.Fatalf("[jwt] FATAL: JWT_SECRET must be set in production. Refusing to start with a weak signing key.")
		default:
			// Development: generate a random secret so tokens cannot be forged
			// with a known empty/weak key. Sessions will be invalidated on restart.
			random := make([]byte, 32)
			if _, err := rand.Read(random); err != nil {
				log.Fatalf("[jwt] failed to generate dev secret: %v", err)
			}
			jwtSecret = random
			log.Println("[jwt] WARNING: JWT_SECRET not set — generated an ephemeral dev secret. Set JWT_SECRET (>= 32 chars) in production.")
		}

		if len(jwtSecret) < 32 && env == "production" {
			log.Fatalf("[jwt] FATAL: JWT_SECRET must be at least 32 characters in production.")
		}
	})
}

type Claims struct {
	UserID string         `json:"user_id"`
	Role   model.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func GenerateJWT(userID string, role model.UserRole) (string, error) {
	loadSecret()
	now := time.Now()
	claims := &Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Audience:  jwt.ClaimStrings{jwtAudience},
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func ValidateJWT(tokenStr string) (*Claims, error) {
	loadSecret()
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret, nil
	}, jwt.WithIssuer(jwtIssuer), jwt.WithAudience(jwtAudience), jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
