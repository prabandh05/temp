// import axios from "axios";

// const API_BASE_URL = "http://127.0.0.1:8000"; // your Django backend URL

// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// export default api;

const API_BASE_URL = "http://127.0.0.1:8000";
export default API_BASE_URL;
// src/config/api.js
import axios from "axios";



const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token to requests (if present)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Token ${token}`; // if backend uses TokenAuth
    // or use `Bearer ${token}` if it's JWT: config.headers.Authorization = `Bearer ${token}`
  }
  return config;
});


