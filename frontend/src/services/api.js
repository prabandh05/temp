// frontend/src/services/api.js
import axios from "axios";

// Use the environment variable provided by Create React App, or default for local dev
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

/**
 * Axios interceptor to automatically attach the JWT access token to every
 * outgoing request to the API.
 */
api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  // If the data is FormData, remove Content-Type to let axios set it with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

/**
 * Response interceptor to handle 401 errors and refresh tokens
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refresh = localStorage.getItem("refresh");
      if (!refresh) {
        // No refresh token, redirect to login
        processQueue(new Error('No refresh token'), null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token (use a separate axios instance to avoid interceptors)
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/token/refresh/`,
          { refresh: refresh }
        );

        const { access: newAccess } = refreshResponse.data;
        localStorage.setItem("access", newAccess);

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        // Process queued requests
        processQueue(null, newAccess);

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear storage and redirect to login
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
