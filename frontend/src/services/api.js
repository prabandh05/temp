// import axios from "axios";
// import API_BASE_URL from "../config/api";

// const api = axios.create({
//   baseURL: API_BASE_URL,
// });

// export default api;

import axios from "axios";
import API_BASE_URL from "../config/api";


const api = axios.create({
baseURL: API_BASE_URL,
headers: {
"Content-Type": "application/json",
},
});


// attach token from localStorage automatically if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    // switch to Bearer if JWT:
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});



export default api;