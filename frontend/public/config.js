/* PowerSmart Kenya — frontend configuration.
 *
 * DEVELOPMENT (Vite dev server on :3000):
 *   Set POWERSMART_API to the backend this frontend should talk to.
 *   Default here points at the deployed Render backend. To use a local Go
 *   backend instead, set it back to "" (Vite then proxies /api to
 *   http://localhost:8080 — see vite.config.ts; no CORS needed).
 *
 * PRODUCTION:
 *   The frontend is a static site served separately from the backend, so it
 *   must know the API base URL explicitly, e.g.:
 *     window.POWERSMART_API = "https://powersmart-api.onrender.com/api";
 *
 *   NOTE: frontend/build.sh overwrites this file with $VITE_API_URL during
 *   hosted (Render/Netlify/Vercel) builds. Set VITE_API_URL there instead of
 *   editing this file for deployments.
 */
window.POWERSMART_API = "https://powersmart-api.onrender.com/api";
