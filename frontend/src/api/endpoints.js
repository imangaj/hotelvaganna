import apiClient from "./apiClient";
export const authAPI = {
    register: (data) => apiClient.post("/auth/register", data),
    login: (data) => apiClient.post("/auth/login", data),
};
export const userAPI = {
    getAll: () => apiClient.get("/users"),
    create: (data) => apiClient.post("/users", data),
    update: (id, data) => apiClient.put(`/users/${id}`, data),
    delete: (id) => apiClient.delete(`/users/${id}`),
};
export const propertyAPI = {
    getAll: () => apiClient.get("/properties"),
    getById: (id) => apiClient.get(`/properties/${id}`),
    create: (data) => apiClient.post("/properties", data),
    update: (id, data) => apiClient.put(`/properties/${id}`, data),
    delete: (id) => apiClient.delete(`/properties/${id}`),
};
export const roomAPI = {
    getByProperty: (propertyId) => apiClient.get(`/rooms/property/${propertyId}`),
    getById: (id) => apiClient.get(`/rooms/${id}`),
    create: (data) => apiClient.post("/rooms", data),
    update: (id, data) => apiClient.put(`/rooms/${id}`, data),
    updateStatus: (id, status) => apiClient.put(`/rooms/${id}/status`, { status }),
    setDailyPrice: (id, date, price) => apiClient.post(`/rooms/${id}/price`, { date, price }),
};
export const bookingAPI = {
    getAll: () => apiClient.get("/bookings"),
    getByProperty: (propertyId) => apiClient.get(`/bookings/property/${propertyId}`),
    getAvailable: (propertyId, startDate, endDate) => apiClient.get(`/bookings/available`, {
        params: { propertyId, startDate, endDate },
    }),
    create: (data) => apiClient.post("/bookings", data),
    updateStatus: (id, bookingStatus, paymentStatus, roomId) => apiClient.put(`/bookings/${id}/status`, { bookingStatus, paymentStatus, roomId }),
    cancel: (id) => apiClient.delete(`/bookings/${id}`),
    deletePermanent: (id) => apiClient.delete(`/bookings/${id}/hard`),
};
export const guestAPI = {
    getAll: () => apiClient.get("/guests"),
    create: (data) => apiClient.post("/guests", data),
    update: (id, data) => apiClient.put(`/guests/${id}`, data),
    delete: (id) => apiClient.delete(`/guests/${id}`),
};
export const guestAccountAPI = {
    getAll: () => apiClient.get("/guest-accounts"),
    update: (id, data) => apiClient.put(`/guest-accounts/${id}`, data),
    resetPassword: (id, password) => apiClient.post(`/guest-accounts/${id}/reset-password`, { password }),
    delete: (id) => apiClient.delete(`/guest-accounts/${id}`),
};
export const hotelProfileAPI = {
    get: () => apiClient.get("/hotel-profile"),
    update: (data) => apiClient.put("/hotel-profile", data),
};
export const channelAPI = {
    getByProperty: (propertyId) => apiClient.get(`/channels/property/${propertyId}`),
    create: (data) => apiClient.post("/channels", data),
    syncAvailability: (channelId) => apiClient.post(`/channels/${channelId}/sync/availability`),
    syncPricing: (channelId) => apiClient.post(`/channels/${channelId}/sync/pricing`),
};
export const housekeepingAPI = {
    getAll: (propertyId, status) => apiClient.get("/housekeeping", { params: { propertyId, status } }),
    create: (data) => apiClient.post("/housekeeping", data),
    update: (id, data) => apiClient.put(`/housekeeping/${id}`, data),
    delete: (id) => apiClient.delete(`/housekeeping/${id}`),
};
export const maintenanceAPI = {
    getAll: (propertyId, status) => apiClient.get("/maintenance", { params: { propertyId, status } }),
    create: (data) => apiClient.post("/maintenance", data),
    update: (id, data) => apiClient.put(`/maintenance/${id}`, data),
    delete: (id) => apiClient.delete(`/maintenance/${id}`),
};
export const pricingAPI = {
    get: (roomId, startDate, endDate) => apiClient.get("/pricing", { params: { roomId, startDate, endDate } }),
    set: (roomId, date, price) => apiClient.post("/pricing", { roomId, date, price }),
};
export const ratesAPI = {
    get: (propertyId, startDate, endDate) => apiClient.get("/rates", { params: { propertyId, startDate, endDate } }),
    update: (propertyId, updates) => apiClient.post("/rates", { propertyId, updates }),
};
export const dashboardAPI = {
    getStats: () => apiClient.get("/dashboard/stats"),
};
export const publicAPI = {
    search: (params) => apiClient.get("/public/search", { params }),
};
export const guestAuthAPI = {
    register: (data) => apiClient.post("/guest-auth/register", data),
    login: (data) => apiClient.post("/guest-auth/login", data),
    getBookings: (token) => apiClient.get("/guest-auth/bookings", {
        headers: { Authorization: `Bearer ${token}` },
    }),
    me: (token) => apiClient.get("/guest-auth/me", {
        headers: { Authorization: `Bearer ${token}` },
    }),
};
export const paymentsAPI = {
    createCheckoutSession: (data) => apiClient.post("/payments/checkout-session", data),
    verifySession: (sessionId) => apiClient.get("/payments/verify-session", {
        params: { session_id: sessionId },
    }),
};
export const pushAPI = {
    getVapidPublicKey: () => apiClient.get("/push/vapid-public-key"),
    subscribe: (subscription) => apiClient.post("/push/subscribe", { subscription }),
    unsubscribe: (endpoint) => apiClient.post("/push/unsubscribe", { endpoint }),
};
