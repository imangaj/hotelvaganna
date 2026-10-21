import axios, { AxiosInstance } from "axios";

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const url = config.url || "";
  // Guest requests carry their explicit guest token; never inherit the PMS session.
  const publicRequest = /^\/(?:guest-auth|auth\/login|auth\/register|public|hotel-profile)(?:\/|$)/.test(url);
  const token = localStorage.getItem("token");
  if (token && !publicRequest && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      const sent = error.config?.headers?.Authorization;
      const guest = /\/guest-auth\/(?:me|bookings)(?:\?|$)/.test(url);
      const key = guest ? "guestToken" : "token";
      const current = localStorage.getItem(key);
      // An older in-flight failure must not erase a newly signed-in session.
      if (current && sent === `Bearer ${current}` && !/\/login$/.test(url)) {
        localStorage.removeItem(key);
        if (!guest) localStorage.removeItem("user");
        window.dispatchEvent(new Event(guest ? "guest-session-expired" : "staff-session-expired"));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
