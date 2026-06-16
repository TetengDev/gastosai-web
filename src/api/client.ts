import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

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