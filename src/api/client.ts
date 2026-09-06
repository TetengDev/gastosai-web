import axios from "axios";

/**
 * The API version this client speaks. `/api/v2` is the integer-centavos surface: every
 * money-bearing field is a `long` number of centavos rather than a decimal peso amount.
 *
 * It is held here rather than repeated across the 19 modules in `src/api/` so that the
 * version is one edit, and so that no module can drift onto a different one by accident —
 * every module's path stays relative (`/expenses`, `/budgets`) and gets the prefix from here.
 */
export const API_BASE_PATH = "/api/v2";

/**
 * `VITE_API_URL` names the backend host and nothing more (`http://localhost:8080`), so the
 * version path is appended rather than configured. A trailing slash on the env var is
 * tolerated because it is the kind of thing that gets pasted into a Vercel dashboard, and
 * `//api/v2` is a 404 that would only show up at runtime.
 */
export const resolveBaseUrl = (apiUrl: string | undefined): string =>
  `${(apiUrl ?? "").replace(/\/+$/, "")}${API_BASE_PATH}`;

const api = axios.create({ baseURL: resolveBaseUrl(import.meta.env.VITE_API_URL) });

api.interceptors.request.use((cfg) => {
    const token = localStorage.getItem("token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    // Admin "View As" overrides (ignored by the backend unless the user is an admin).
    const plan = localStorage.getItem("gastosai:viewas:plan");   // FREE | PREMIUM (absent = no override)
    const ai = localStorage.getItem("gastosai:viewas:ai");       // on | off
    if (plan === "FREE" || plan === "PREMIUM") cfg.headers["X-View-As-Plan"] = plan;
    if (ai === "on" || ai === "off") cfg.headers["X-View-As-Ai"] = ai;
    return cfg;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem("token");
            localStorage.removeItem("auth_user");
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);

export default api;