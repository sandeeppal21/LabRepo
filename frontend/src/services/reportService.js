import api from "./api";

export const initReport = (billId) => api.post(`/reports/init/${billId}`);
export const getReport = (billId) => api.get(`/reports/${billId}`);
export const saveValues = (billId, data) => api.put(`/reports/${billId}/values`, data);
export const verifyReport = (billId) => api.patch(`/reports/${billId}/verify`);
export const listReports = (params = {}) => api.get("/reports", { params });