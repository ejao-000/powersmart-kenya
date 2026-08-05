// Package model defines the data structures for the PowerSmart Kenya application.
//
// This file will be extended to include a 'Role' field in the User struct
// to support role-based access control for tenant, landlord, and admin functionalities.
package model

import "time"

// User represents a registered Kenya Power customer.
type UserRole string

const (
	RoleTenant  UserRole = "tenant"
	RoleLandlord UserRole = "landlord"
	RoleAdmin   UserRole = "admin"
)

// User represents a registered PowerSmart Kenya user with an assigned role.
type User struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Email         string    `json:"email"`
	Phone         string    `json:"phone"`
	Password      string    `json:"-"` // never serialised to JSON
	MeterAccount  string    `json:"meter_account"` // KP account number used at registration
	MeterNumber   string    `json:"meter_number"`  // physical meter serial
	Role          UserRole  `json:"role"`
	CreatedAt     time.Time `json:"created_at"`
}

// RegisterRequest is the payload for POST /api/auth/register.
// MeterAccount must be a valid Kenya Power prepaid account number.
type RegisterRequest struct {
	Name         string `json:"name"         validate:"required,min=2"`
	Email        string `json:"email"        validate:"required,email"`
	Phone        string `json:"phone"        validate:"required"`
	Password     string `json:"password"     validate:"required,min=8"`
	MeterAccount string `json:"meter_account" validate:"required"` // e.g. "1234567890"
}

// LoginRequest is the payload for POST /api/auth/login.
type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// AuthResponse is returned after successful register or login.
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
