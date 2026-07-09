import api from "./api";

export const fetchProfile = () => api.get("/profile/me");

export const saveLabDetails = (form, logoFile) => {
    if (logoFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append("logo", logoFile);
        return api.put("/profile/me", fd, { headers: { "Content-Type": "multipart/form-data" } });
    }
    return api.put("/profile/me", form);
};

// ── Staff (doctors / technicians) ───────────────────────────
export const addStaffMember = (staffForm, sigFile) => {
    const fd = new FormData();
    Object.entries(staffForm).forEach(([k, v]) => fd.append(k, v));
    if (sigFile) fd.append("signature", sigFile);
    return api.post("/profile/me/staff", fd, { headers: { "Content-Type": "multipart/form-data" } });
};

export const updateStaffMember = (staffId, staffForm, sigFile) => {
    const fd = new FormData();
    Object.entries(staffForm).forEach(([k, v]) => fd.append(k, v));
    if (sigFile) fd.append("signature", sigFile);
    return api.put(`/profile/me/staff/${staffId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
};

export const deleteStaffMember = (staffId) => api.delete(`/profile/me/staff/${staffId}`);

export const updatePassword = (pwForm) => api.put("/profile/me/password", pwForm);