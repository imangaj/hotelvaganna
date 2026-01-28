// Re-compiling to ensure the fix is applied
import axios, { AxiosInstance } from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "/api";

const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const hasAuthHeader = Boolean(
      (config.headers as Record<string, string> | undefined)?.Authorization
    );
    if (token && !hasAuthHeader) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
