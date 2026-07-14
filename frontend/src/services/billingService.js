import api from "./api";

// ── Patients ──────────────────────────────────────────────
export const createPatient = (data) => api.post("/patients", data);
export const searchPatients = (q = "") => api.get(`/patients?q=${encodeURIComponent(q)}&limit=10`);
export const getPatient = (id) => api.get(`/patients/${id}`);

// ── Bills ─────────────────────────────────────────────────
export const createBill = (data) => api.post("/bills", data);

// getBills maps the frontend's semantic param names onto what
// billController.js actually reads:
//   search        → q
//   paymentStatus → paymentStatus (kept separate from `status`, which the
//                   backend uses for workflow status: pending/processing/
//                   completed/cancelled)
export const getBills = ({ from, to, search, status, paymentStatus, page = 1, limit = 20 } = {}) =>
    api.get("/bills", { params: { from, to, q: search, status, paymentStatus, page, limit } });

export const getBill = (id) => api.get(`/bills/${id}`);
export const updateBillStatus = (id, status) => api.patch(`/bills/${id}/status`, { status });

// ── Vendor tests (for billing search) ────────────────────
export const fetchVendorTests = () => api.get("/tests");