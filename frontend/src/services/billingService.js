// src/services/billingService.js

import api from "./api";

// ── Patients ──────────────────────────────────────────────
export const createPatient  = (data)         => api.post("/patients", data);
export const searchPatients = (q = "")       => api.get(`/patients?q=${encodeURIComponent(q)}&limit=10`);
export const getPatient     = (id)           => api.get(`/patients/${id}`);

// ── Bills ─────────────────────────────────────────────────
export const createBill     = (data)         => api.post("/bills", data);
export const getBills       = (params = {})  => api.get("/bills", { params });
export const getBill        = (id)           => api.get(`/bills/${id}`);
export const updateBillStatus = (id, status) => api.patch(`/bills/${id}/status`, { status });

// ── Vendor tests (for billing search) ────────────────────
export const fetchVendorTests = () => api.get("/tests");