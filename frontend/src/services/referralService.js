// src/services/referralService.js
// All API calls for the Referral Management feature.
// Uses the shared axios instance from api.js (token auto-attached).

import api from "./api";

// ── GET all referral entries for a category (paginated + search) ──
export const fetchReferrals      = ({ category, page = 1, search = "" }) =>
  api.get("/referrals", { params: { category, page, search } });

// ── GET counts per category for this vendor ───────────────────────
export const fetchReferralStats  = ()                  => api.get("/referrals/stats");

// ── POST create a new referral entry ─────────────────────────────
export const createReferral      = (data)              => api.post("/referrals", data);

// ── PUT update an existing referral entry by its sub-doc _id ─────
export const updateReferral      = (entryId, data)     => api.put(`/referrals/${entryId}`, data);

// ── DELETE soft-delete a referral entry (body carries category) ──
export const deleteReferral      = (entryId, category) => api.delete(`/referrals/${entryId}`, { data: { category } });