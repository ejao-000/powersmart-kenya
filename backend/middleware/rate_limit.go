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

// RateLimit limits requests per client IP.
func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prefer X-Forwarded-For when behind a proxy
		ip := r.Header.Get("X-Forwarded-For")
		if ip == "" {
			ip, _, _ = net.SplitHostPort(r.RemoteAddr)
		} else {
			ip = strings.TrimSpace(strings.Split(ip, ",")[0])
		}

		if !getLimiter(ip).Allow() {
			utils.RespondError(w, http.StatusTooManyRequests, "Rate limit exceeded")
			return
		}

		next.ServeHTTP(w, r)
	})
}