/* PowerSmart Kenya — frontend configuration.
 *
 * DEVELOPMENT (Vite dev server on :3000):
 *   Leave POWERSMART_API empty. Vite proxies every /api request to the Go
 *   backend (http://localhost:8080) — see vite.config.ts. No CORS needed.
 *
 * PRODUCTION:
 *   The frontend is a static site served separately from the backend. Set the
 *   API base URL here, e.g.:
 *     window.POWERSMART_API = "https://powersmart-api.onrender.com/api";
 *
 *   NOTE: frontend/build.sh overwrites this file with $VITE_API_URL during
 *   hosted (Render/Netlify/Vercel) builds. Set VITE_API_URL there instead of
 *   editing this file for deployments.
 */
window.POWERSMART_API = "";
