package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"powersmart-backend/utils"
	"golang.org/x/time/rate"
)

type client struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	clients   = make(map[string]*client)
	clientsMu sync.Mutex
)

func init() {
	go func() {
		for {
			time.Sleep(time.Minute)
			clientsMu.Lock()
			for ip, c := range clients {
				if time.Since(c.lastSeen) > 3*time.Minute {
					delete(clients, ip)
				}
			}
			clientsMu.Unlock()

			authClientsMu.Lock()
			for ip, c := range authClients {
				if time.Since(c.lastSeen) > 3*time.Minute {
					delete(authClients, ip)
				}
			}
			authClientsMu.Unlock()
		}
	}()
}

func getLimiter(ip string) *rate.Limiter {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	if c, ok := clients[ip]; ok {
		c.lastSeen = time.Now()
		return c.limiter
	}

	l := rate.NewLimiter(rate.Every(time.Second/10), 20) // 10 req/s, burst 20
	clients[ip] = &client{limiter: l, lastSeen: time.Now()}
	return l
}

// clientIP extracts the caller's IP, honouring X-Forwarded-For when behind a proxy.
func clientIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip, _, _ = net.SplitHostPort(r.RemoteAddr)
	} else {
		ip = strings.TrimSpace(strings.Split(ip, ",")[0])
	}
	return ip
}

// RateLimit limits requests per client IP.
func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !getLimiter(clientIP(r)).Allow() {
			utils.RespondError(w, http.StatusTooManyRequests, "Rate limit exceeded")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// authClient is a second limiter map dedicated to authentication endpoints so
// a login/register flood cannot be hidden behind general API traffic.
var authClients = make(map[string]*client)
var authClientsMu sync.Mutex

// getAuthLimiter returns a strict limiter (5 req/s, burst 10) per IP.
func getAuthLimiter(ip string) *rate.Limiter {
	authClientsMu.Lock()
	defer authClientsMu.Unlock()

	if c, ok := authClients[ip]; ok {
		c.lastSeen = time.Now()
		return c.limiter
	}

	l := rate.NewLimiter(rate.Every(time.Second/5), 10) // 5 req/s, burst 10
	authClients[ip] = &client{limiter: l, lastSeen: time.Now()}
	return l
}

// RateLimitAuth applies a stricter per-IP limiter to login/register endpoints
// to slow brute-force attempts.
func RateLimitAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !getAuthLimiter(clientIP(r)).Allow() {
			utils.RespondError(w, http.StatusTooManyRequests, "Too many attempts. Please try again later.")
			return
		}
		next.ServeHTTP(w, r)
	})
}