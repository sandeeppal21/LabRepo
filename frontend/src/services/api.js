import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 15000, //  15s timeout — prevents hanging requests
});

// ── Attach token ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response error handler ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {

    // ── No response at all (network down, CORS, server off) ──
    if (!error.response) {
      error.userMessage = "Network error. Please check your connection.";
      return Promise.reject(error);
    }

    const status = error.response.status;

    // ── 401 — token expired or invalid ───────────────────
    if (status === 401) {
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // ── 403 — not allowed (wrong role) ───────────────────
    if (status === 403) {
      error.userMessage = "You don't have permission to do this.";
      return Promise.reject(error);
    }

    // ── 404 — resource not found ──────────────────────────
    if (status === 404) {
      error.userMessage = "Resource not found.";
      return Promise.reject(error);
    }

    // ── 422 — validation errors (handled per component) ──
    // Don't set userMessage — components read error.response.data.errors directly
    if (status === 422) {
      return Promise.reject(error);
    }

    // ── 429 — rate limited ────────────────────────────────
    if (status === 429) {
      error.userMessage = "Too many requests. Please slow down.";
      return Promise.reject(error);
    }

    // ── 500+ — server error ───────────────────────────────
    if (status >= 500) {
      error.userMessage = "Server error. Please try again later.";
      return Promise.reject(error);
    }

    // ── Request timeout ───────────────────────────────────
    if (error.code === "ECONNABORTED") {
      error.userMessage = "Request timed out. Please try again.";
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;