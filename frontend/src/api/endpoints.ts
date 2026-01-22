import apiClient from "./apiClient";

export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    apiClient.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    apiClient.post("/auth/login", data),
};

export const userAPI = {
  getAll: () => apiClient.get("/users"),
  create: (data: any) => apiClient.post("/users", data),
  update: (id: number, data: any) => apiClient.put(`/users/${id}`, data),
  delete: (id: number) => apiClient.delete(`/users/${id}`),
};

export const propertyAPI = {
  getAll: () => apiClient.get("/properties"),
  getById: (id: number) => apiClient.get(`/properties/${id}`),
  create: (data: any) => apiClient.post("/properties", data),
  update: (id: number, data: any) => apiClient.put(`/properties/${id}`, data),
  delete: (id: number) => apiClient.delete(`/properties/${id}`),
};

export const roomAPI = {
  getByProperty: (propertyId: number) =>
    apiClient.get(`/rooms/property/${propertyId}`),
  getById: (id: number) => apiClient.get(`/rooms/${id}`),
  create: (data: any) => apiClient.post("/rooms", data),
  update: (id: number, data: any) => apiClient.put(`/rooms/${id}`, data),
  updateStatus: (id: number, status: string) =>
    apiClient.put(`/rooms/${id}/status`, { status }),
  setDailyPrice: (id: number, date: string, price: number) =>
    apiClient.post(`/rooms/${id}/price`, { date, price }),
};

export const bookingAPI = {
  getAll: () => apiClient.get("/bookings"),
  getByProperty: (propertyId: number) =>
    apiClient.get(`/bookings/property/${propertyId}`),
  getAvailable: (propertyId: number, startDate: string, endDate: string) =>
    apiClient.get(`/bookings/available`, {
      params: { propertyId, startDate, endDate },
    }),
  create: (data: any) => apiClient.post("/bookings", data),
  updateStatus: (id: number, bookingStatus?: string, paymentStatus?: string, roomId?: number) =>
    apiClient.put(`/bookings/${id}/status`, { bookingStatus, paymentStatus, roomId }),
  cancel: (id: number) => apiClient.delete(`/bookings/${id}`),
};

export const guestAPI = {
  create: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    country?: string;
  }) => apiClient.post("/guests", data),
};

export const hotelProfileAPI = {
  get: () => apiClient.get("/hotel-profile"),
  update: (data: any) => apiClient.put("/hotel-profile", data),
};

export const channelAPI = {
  getByProperty: (propertyId: number) =>
    apiClient.get(`/channels/property/${propertyId}`),
  create: (data: any) => apiClient.post("/channels", data),
  syncAvailability: (channelId: number) =>
    apiClient.post(`/channels/${channelId}/sync/availability`),
  syncPricing: (channelId: number) =>
    apiClient.post(`/channels/${channelId}/sync/pricing`),
};

export const housekeepingAPI = {
  getAll: (propertyId?: number, status?: string) => 
    apiClient.get("/housekeeping", { params: { propertyId, status } }),
  create: (data: any) => apiClient.post("/housekeeping", data),
  update: (id: number, data: any) => apiClient.put(`/housekeeping/${id}`, data),
  delete: (id: number) => apiClient.delete(`/housekeeping/${id}`),
};

export const maintenanceAPI = {
  getAll: (propertyId?: number, status?: string) => 
    apiClient.get("/maintenance", { params: { propertyId, status } }),
  create: (data: any) => apiClient.post("/maintenance", data),
  update: (id: number, data: any) => apiClient.put(`/maintenance/${id}`, data),
  delete: (id: number) => apiClient.delete(`/maintenance/${id}`),
};

export const pricingAPI = {
  get: (roomId: number, startDate: string, endDate: string) => 
    apiClient.get("/pricing", { params: { roomId, startDate, endDate } }),
  set: (roomId: number, date: string, price: number) => 
    apiClient.post("/pricing", { roomId, date, price }),
};

export const ratesAPI = {
  get: (propertyId: number, startDate: string, endDate: string) => 
    apiClient.get("/rates", { params: { propertyId, startDate, endDate } }),
  update: (propertyId: number, updates: any[]) => 
    apiClient.post("/rates", { propertyId, updates }),
};

export const dashboardAPI = {
  getStats: () => apiClient.get("/dashboard/stats"),
};

export const publicAPI = {
  search: (params: { propertyId: number; checkIn: string; checkOut: string; guests: number }) =>
    apiClient.get("/public/search", { params }),
};

export const guestAuthAPI = {
  register: (data: { email: string; password: string }) =>
    apiClient.post("/guest-auth/register", data),
  login: (data: { email: string; password: string }) =>
    apiClient.post("/guest-auth/login", data),
  getBookings: (token: string) =>
    apiClient.get("/guest-auth/bookings", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  me: (token: string) =>
    apiClient.get("/guest-auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};




