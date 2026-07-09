import api from "./api";

export const fetchTests = () => api.get("/tests");
export const addTest = (data) => api.post("/tests", data);
export const updateTest = (id, data) => api.put(`/tests/${id}`, data);
export const setPrice = (id, price) => api.put(`/tests/${id}/price`, { price });
export const toggleTest = (id) => api.patch(`/tests/${id}/toggle-vendor`);
export const deleteTest = (id) => api.delete(`/tests/${id}`);