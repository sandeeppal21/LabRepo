import api from "./api";

export const fetchVendors = ({ search = "", subStatus = "", page = 1, limit = 10 } = {}) =>
    api.get("/admin/vendors", { params: { search, subStatus, page, limit } });

export const fetchVendorById = (id) => api.get(`/admin/vendors/${id}`);