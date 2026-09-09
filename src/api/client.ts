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

/**
 * The unversioned surface, for the handful of endpoints `/api/v2` does not carry.
 *
 * The PDF export and the project tags it filters by are published by the contract at
 * `/expenses/export/pdf` and `/expenses/projects` only — the v2 controller does not mirror them.
 * Nothing money-bearing crosses this boundary (a PDF blob, and a tag's id and name), so reading
 * it does not put a decimal amount in front of the centavos invariant. Anything that does carry
 * an amount stays on `API_BASE_PATH`.
 */
export const resolveUnversionedBaseUrl = (apiUrl: string | undefined): string =>
  (apiUrl ?? "").replace(/\/+$/, "");

export const UNVERSIONED_BASE_URL = resolveUnversionedBaseUrl(import.meta.env.VITE_API_URL);

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