package utils

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"regexp"
)

var kpAccountPattern = regexp.MustCompile(`^\d{8,12}$`)

// KPValidator checks account numbers against Kenya Power's lookup API.
type KPValidator struct {
	apiURL string
	client *http.Client
}

func NewKPValidator() *KPValidator {
	return &KPValidator{
		apiURL: os.Getenv("KP_API_URL"),
		client: &http.Client{},
	}
}

// ValidateAndGetMeterNumber validates the KP account number and returns the meter serial.
// In production this calls the Kenya Power customer API.
// In development (KP_API_URL empty) it does format-only validation.
func (v *KPValidator) ValidateAndGetMeterNumber(accountNumber string) (string, error) {
	if !kpAccountPattern.MatchString(accountNumber) {
		return "", errors.New("account number must be 8–12 digits")
	}

	if v.apiURL == "" {
		// Development mode: accept any well-formed number, generate a mock meter serial
		meterSerial := fmt.Sprintf("KPM%s", accountNumber)
		return meterSerial, nil
	}

	// Production: call Kenya Power customer lookup API
	url := fmt.Sprintf("%s/api/customers/lookup?account=%s", v.apiURL, accountNumber)
	resp, err := v.client.Get(url)
	if err != nil {
		return "", fmt.Errorf("KP API unreachable: %w", err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		// TODO: parse JSON response from KP API to extract meter serial
		// For now return a placeholder until the actual KP API contract is known
		return fmt.Sprintf("KPM%s", accountNumber), nil
	case http.StatusNotFound:
		return "", errors.New("account number not found in Kenya Power system")
	default:
		return "", fmt.Errorf("KP API returned status %d", resp.StatusCode)
	}
}
