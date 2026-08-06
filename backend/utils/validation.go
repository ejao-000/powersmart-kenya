package utils

import (
	"fmt"
	"net/mail"
	"regexp"
	"strings"
)

var (
	emailRe      = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
	kenyanPhoneRe = regexp.MustCompile(`^(?:\+?254|0)[17]\d{8}$`)
	strongPasswordRe = regexp.MustCompile(`[A-Z]`)
)

// NormaliseEmail trims and lowercases an email address.
func NormaliseEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// ValidEmail reports whether the address is syntactically valid.
func ValidEmail(email string) bool {
	if !emailRe.MatchString(email) {
		return false
	}
	_, err := mail.ParseAddress(email)
	return err == nil
}

// ValidKenyanPhone reports whether the phone is a well-formed Kenyan mobile
// number: 07XXXXXXXX, 2547XXXXXXXX or +2547XXXXXXXX.
func ValidKenyanPhone(phone string) bool {
	p := strings.ReplaceAll(strings.TrimSpace(phone), " ", "")
	p = strings.ReplaceAll(p, "-", "")
	return kenyanPhoneRe.MatchString(p)
}

// ValidatePassword enforces a sensible password policy:
//   - at least 8 characters
//   - contains at least one uppercase letter
//   - contains at least one digit
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters")
	}
	if !strongPasswordRe.MatchString(password) {
		return fmt.Errorf("password must contain at least one uppercase letter")
	}
	hasDigit := false
	for _, c := range password {
		if c >= '0' && c <= '9' {
			hasDigit = true
			break
		}
	}
	if !hasDigit {
		return fmt.Errorf("password must contain at least one number")
	}
	return nil
}

// ValidateName trims and ensures the name is a reasonable length.
func ValidateName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if len(name) < 2 {
		return "", fmt.Errorf("name must be at least 2 characters")
	}
	if len(name) > 100 {
		return "", fmt.Errorf("name is too long")
	}
	return name, nil
}
