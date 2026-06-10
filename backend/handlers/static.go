package handlers

import (
	"net/http"
	"path/filepath"
	"strings"
)

// StaticHandler serves static files with proper MIME types
func StaticHandler(fs http.FileSystem) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent directory listing
		if strings.HasSuffix(r.URL.Path, "/") {
			http.NotFound(w, r)
			return
		}
		
		// Get the file extension
		ext := filepath.Ext(r.URL.Path)
		
		// Set proper content type based on file extension
		switch ext {
		case ".css":
			w.Header().Set("Content-Type", "text/css")
		case ".js":
			w.Header().Set("Content-Type", "application/javascript")
		case ".json":
			w.Header().Set("Content-Type", "application/json")
		case ".html":
			w.Header().Set("Content-Type", "text/html")
		case ".png":
			w.Header().Set("Content-Type", "image/png")
		case ".jpg", ".jpeg":
			w.Header().Set("Content-Type", "image/jpeg")
		case ".svg":
			w.Header().Set("Content-Type", "image/svg+xml")
		case ".ico":
			w.Header().Set("Content-Type", "image/x-icon")
		}
		
		// Serve the file
		http.FileServer(fs).ServeHTTP(w, r)
	})
}
