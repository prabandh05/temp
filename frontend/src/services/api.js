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

/**
 * Axios interceptor to automatically attach the JWT access token to every
 * outgoing request to the API.
 */
api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

export default api;
