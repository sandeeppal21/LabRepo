import api from "./api";

export const getSubscriptionStatus = () => api.get("/payment/status");
export const bypassPayment = () => api.post("/payment/bypass");